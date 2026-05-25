// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use serde::{Deserialize, Serialize};
use std::process::Command;

/// Project represents a project configuration
/// Project 表示一个项目的配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub windows_path: String,
    pub mac_path: String,
    pub command: String,
    pub win_shell: Option<String>, // "wsl" | "powershell" | "cmd"
    pub mac_shell: Option<String>, // "iterm2" | "default"
    pub wsl_shell: Option<String>, // "zsh" | "bash" | "sh"
}

/// Helper function to launch a project on Windows or macOS
/// 辅助函数，用于在 Windows 或 macOS 上启动项目
fn launch_project_internal(p: &Project) -> Result<(), String> {
    let path = if cfg!(target_os = "windows") {
        &p.windows_path
    } else if cfg!(target_os = "macos") {
        &p.mac_path
    } else {
        return Err("Unsupported platform / 不支持的平台".to_string());
    };

    // Expand ~ to user home directory on macOS
    // 在 macOS 上将 ~ 展开为用户的主目录
    let mut resolved_path = path.clone();
    if cfg!(target_os = "macos") && resolved_path.starts_with('~') {
        if let Some(home_dir) = std::env::var_os("HOME") {
            let home_str = home_dir.to_string_lossy();
            resolved_path = resolved_path.replacen('~', &home_str, 1);
        }
    }

    if cfg!(target_os = "windows") {
        let win_shell = p.win_shell.as_deref().unwrap_or("cmd");
        match win_shell {
            "wsl" => {
                let wsl_sh = p.wsl_shell.as_deref().unwrap_or("zsh");
                // Generate a temporary batch script to execute command in WSL
                // 生成临时批处理脚本以在 WSL 中执行命令
                // WSL expects login/interactive shell -lic to load envs
                // WSL 需要登录/交互式 shell（-lic）以加载环境变量
                let bat_content = format!(
                    "@echo off\r\ntitle {}\r\nwsl.exe --cd \"{}\" {} -lic \"{}\"\r\npause\r\n",
                    p.name, resolved_path, wsl_sh, p.command
                );
                
                let temp_dir = std::env::temp_dir();
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis();
                let temp_bat_path = temp_dir.join(format!("start-dev-{}.bat", timestamp));
                
                std::fs::write(&temp_bat_path, bat_content)
                    .map_err(|e| format!("Failed to write temp bat: {}", e))?;
                
                // Spawn CMD and let it run in background
                // 启动 CMD 并在后台运行
                Command::new("cmd")
                    .args(&["/c", "start", "", &temp_bat_path.to_string_lossy()])
                    .spawn()
                    .map_err(|e| format!("Failed to launch WSL: {}", e))?;
            }
            "powershell" => {
                let ps_cmd = format!("Set-Location '{}'; {}", resolved_path, p.command);
                let escaped_ps_cmd = ps_cmd.replace("'", "''");
                let ps_command = format!(
                    "Start-Process powershell -ArgumentList '-NoExit', '-Command', '{}'",
                    escaped_ps_cmd
                );
                Command::new("powershell")
                    .args(&["-Command", &ps_command])
                    .spawn()
                    .map_err(|e| format!("Failed to launch PowerShell: {}", e))?;
            }
            _ => { // default: cmd
                let cmd_str = format!("cd /d {} && {}", resolved_path, p.command);
                let escaped_cmd_str = cmd_str.replace("'", "''");
                let ps_command = format!(
                    "Start-Process cmd -ArgumentList '/k', '{}'",
                    escaped_cmd_str
                );
                Command::new("powershell")
                    .args(&["-Command", &ps_command])
                    .spawn()
                    .map_err(|e| format!("Failed to launch CMD: {}", e))?;
            }
        }
    } else if cfg!(target_os = "macos") {
        let mac_shell = p.mac_shell.as_deref().unwrap_or("default");
        let status = match mac_shell {
            "iterm2" => {
                let script = format!(
                    "tell application \"iTerm\"\ncreate window with default profile\ntell current session of current window\nwrite text \"cd {}\"\nwrite text \"{}\"\nend tell\nend tell",
                    resolved_path, p.command
                );
                Command::new("osascript")
                    .args(&["-e", &script])
                    .status()
            }
            _ => { // default Terminal.app
                let script = format!(
                    "tell application \"Terminal\" to do script \"cd {} && {}\"",
                    resolved_path, p.command
                );
                Command::new("osascript")
                    .args(&["-e", &script])
                    .status()
            }
        }.map_err(|e| format!("Failed to execute osascript: {}", e))?;

        if !status.success() {
            return Err(format!("osascript failed with exit code: {:?}", status.code()));
        }
    } else {
        return Err("Unsupported OS / 不支持的系统".to_string());
    }

    Ok(())
}

/// Resolve the absolute path to `projects.json` with multi-stage fallback and auto-creation.
/// 解析 `projects.json` 的绝对路径，支持多级回退与自动新建。
fn resolve_projects_file_path() -> Result<std::path::PathBuf, String> {
    use std::fs;
    use std::path::PathBuf;

    // 1. Current working directory
    // 1. 当前工作目录
    let cur_path = PathBuf::from("projects.json");
    if cur_path.exists() {
        return Ok(cur_path);
    }

    // 2. Executable directory
    // 2. 可执行文件同级目录
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let exe_config_path = exe_dir.join("projects.json");
            if exe_config_path.exists() {
                return Ok(exe_config_path);
            }
        }
    }

    // 3. System recommended preference directory
    // 3. 系统推荐偏好目录
    let recommend_dir = if cfg!(target_os = "windows") {
        std::env::var("APPDATA")
            .map(|dir| PathBuf::from(dir).join("Start-Dev-Command"))
            .ok()
    } else if cfg!(target_os = "macos") {
        std::env::var("HOME")
            .map(|dir| PathBuf::from(dir).join("Library").join("Application Support").join("Start-Dev-Command"))
            .ok()
    } else {
        std::env::var("HOME")
            .map(|dir| PathBuf::from(dir).join(".config").join("Start-Dev-Command"))
            .ok()
    };

    if let Some(dir) = recommend_dir {
        let file_path = dir.join("projects.json");
        if file_path.exists() {
            return Ok(file_path);
        }

        // If not exists anywhere, auto-create in the recommended directory
        // 如果各处均不存在，在系统推荐目录中自动新建
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create config directory / 创建配置目录失败: {}", e))?;
        
        // Write an initial empty array `[]`
        // 写入初始空数组 `[]`
        fs::write(&file_path, b"[]")
            .map_err(|e| format!("Failed to initialize projects.json / 初始化 projects.json 失败: {}", e))?;
        
        Ok(file_path)
    } else {
        Err("Unable to determine user configuration directory / 无法确定用户配置目录位置".to_string())
    }
}

/// Load projects list from `projects.json`
/// 从 `projects.json` 加载项目列表
#[tauri::command]
fn load_projects() -> Result<Vec<Project>, String> {
    use std::fs::File;
    use std::io::Read;

    let file_path = resolve_projects_file_path()?;
    let mut file = File::open(file_path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;

    let projects: Vec<Project> = serde_json::from_str(&contents)
        .map_err(|e| format!("JSON parsing failed / JSON 解析失败: {}", e))?;
    Ok(projects)
}

/// Load the raw JSON string of projects.json for editor
/// 加载 projects.json 的原始 JSON 字符串以供编辑器使用
#[tauri::command]
fn load_projects_raw() -> Result<String, String> {
    use std::fs::File;
    use std::io::Read;

    let file_path = resolve_projects_file_path()?;
    let mut file = File::open(file_path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
    Ok(contents)
}

/// Save the raw JSON string after validating its format
/// 校验格式并保存原始 JSON 字符串
#[tauri::command]
fn save_projects_raw(contents: String) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    // Validate the JSON structure before saving to prevent corrupted files
    // 保存前验证 JSON 结构，以防损坏配置文件
    let _projects: Vec<Project> = serde_json::from_str(&contents)
        .map_err(|e| format!("JSON Syntax Error / JSON 语法错误: {}", e))?;

    let file_path = resolve_projects_file_path()?;
    let mut file = File::create(file_path).map_err(|e| e.to_string())?;
    file.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Get the absolute resolved path of `projects.json`
/// 获取 `projects.json` 解析后的绝对路径
#[tauri::command]
fn get_config_path() -> Result<String, String> {
    let file_path = resolve_projects_file_path()?;
    let abs_path = std::fs::canonicalize(&file_path)
        .unwrap_or(file_path);
    Ok(abs_path.to_string_lossy().into_owned())
}

/// Open the directory containing `projects.json` in system file manager
/// 在操作系统文件管理器中打开 projects.json 所在的配置目录
#[tauri::command]
fn open_config_dir() -> Result<(), String> {
    let file_path = resolve_projects_file_path()?;
    let dir_path = file_path.parent()
        .ok_or_else(|| "Failed to get config directory / 获取配置目录失败".to_string())?;
        
    if cfg!(target_os = "windows") {
        Command::new("explorer")
            .arg(dir_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(dir_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        Command::new("xdg-open")
            .arg(dir_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Launch a single project
/// 启动单个项目
#[tauri::command]
fn launch_project(project: Project) -> Result<(), String> {
    launch_project_internal(&project)
}

/// Launch multiple selected projects in batch
/// 批量启动选中的多个项目
#[tauri::command]
fn batch_launch(projects: Vec<Project>) -> Result<u32, String> {
    let mut count = 0;
    let is_macos = cfg!(target_os = "macos");
    for (i, p) in projects.iter().enumerate() {
        // 如果在 macOS 上且不是第一个项目，延迟 300 毫秒。
        // 因为我们改用了同步阻塞的 .status() 等待，此处仅需 300ms 即可提供完美的双保险缓冲
        // Sleep for 300ms on macOS. Combined with blocking .status() waiting, this is highly stable and fast
        if is_macos && i > 0 {
            std::thread::sleep(std::time::Duration::from_millis(300));
        }
        if let Err(e) = launch_project_internal(p) {
            eprintln!("Failed to launch project {}: {}", p.name, e);
        } else {
            count += 1;
        }
    }
    Ok(count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_projects,
            load_projects_raw,
            save_projects_raw,
            get_config_path,
            launch_project,
            batch_launch,
            open_config_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
