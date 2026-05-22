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
        match mac_shell {
            "iterm2" => {
                let script = format!(
                    "tell application \"iTerm\"\ncreate window with default profile\ntell current session of current window\nwrite text \"cd {}\"\nwrite text \"{}\"\nend tell\nend tell",
                    resolved_path, p.command
                );
                Command::new("osascript")
                    .args(&["-e", &script])
                    .spawn()
                    .map_err(|e| format!("Failed to launch iTerm2: {}", e))?;
            }
            _ => { // default Terminal.app
                let script = format!(
                    "tell application \"Terminal\" to do script \"cd {} && {}\"",
                    resolved_path, p.command
                );
                Command::new("osascript")
                    .args(&["-e", &script])
                    .spawn()
                    .map_err(|e| format!("Failed to launch Terminal: {}", e))?;
            }
        }
    } else {
        return Err("Unsupported OS / 不支持的系统".to_string());
    }

    Ok(())
}

/// Load projects list from `projects.json`
/// 从 `projects.json` 加载项目列表
#[tauri::command]
fn load_projects() -> Result<Vec<Project>, String> {
    use std::fs::File;
    use std::io::Read;
    use std::path::PathBuf;

    // Check in current workspace directory first, then fallback to executable dir
    // 首先检查当前工作目录，如果找不到则回退到可执行文件所在同级目录
    let mut file_path = PathBuf::from("projects.json");
    if !file_path.exists() {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                file_path = exe_dir.join("projects.json");
            }
        }
    }

    if !file_path.exists() {
        return Err("projects.json not found / 未找到 projects.json 配置文件".to_string());
    }

    let mut file = File::open(file_path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;

    let projects: Vec<Project> = serde_json::from_str(&contents)
        .map_err(|e| format!("JSON parsing failed / JSON 解析失败: {}", e))?;
    Ok(projects)
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
    for p in &projects {
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
            launch_project,
            batch_launch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
