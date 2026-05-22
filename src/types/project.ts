/**
 * Project configuration interface
 * 项目配置接口
 */
export interface Project {
  name: string;
  windows_path: string;
  mac_path: string;
  command: string;
  win_shell?: "wsl" | "powershell" | "cmd";
  mac_shell?: "iterm2" | "default";
  wsl_shell?: "zsh" | "bash" | "sh";
}
