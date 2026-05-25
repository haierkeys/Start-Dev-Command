import React from "react";
import { Play, Check, Monitor, Code, Edit3 } from "lucide-react";
import { Project } from "../types/project";

/**
 * Props for ProjectCard
 * 项目卡片组件属性
 */
interface ProjectCardProps {
  project: Project;
  index: number;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onLaunch: () => void;
  isLaunching: boolean;
  onEdit: () => void;
}

/**
 * Premium theme-aware compact project card component with 3-row layout and luxury animations
 * 极致打磨的轻奢风格紧凑型项目卡片组件（采用三行垂直布局与微动效）
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  index,
  isSelected,
  onSelectChange,
  onLaunch,
  isLaunching,
  onEdit,
}) => {
  const accentText = "text-blue-600 dark:text-blue-400";
  const accentBg = "bg-blue-50/60 dark:bg-blue-500/10";
  
  // 获取 Windows 平台的 Shell 徽章信息
  // Get Windows platform shell badge info
  const getWinShellBadge = () => {
    if (project.win_shell === "wsl") {
      return { 
        label: `WSL (${project.wsl_shell || "zsh"})`, 
        color: "bg-purple-500/5 text-purple-500 border-purple-500/15" 
      };
    }
    if (project.win_shell === "powershell") {
      return { 
        label: "PowerShell", 
        color: "bg-blue-500/5 text-blue-500 border-blue-500/15" 
      };
    }
    return { 
      label: "CMD", 
      color: "bg-slate-500/5 text-slate-500 border-slate-500/15" 
    };
  };

  // 获取 macOS 平台的 Shell 徽章信息
  // Get macOS platform shell badge info
  const getMacShellBadge = () => {
    if (project.mac_shell === "iterm2") {
      return { 
        label: "iTerm2 (mac)", 
        color: "bg-amber-500/5 text-amber-500 border-amber-500/15" 
      };
    }
    return { 
      label: "Terminal (mac)", 
      color: "bg-emerald-500/5 text-emerald-500 border-emerald-500/15" 
    };
  };

  const winBadge = getWinShellBadge();
  const macBadge = getMacShellBadge();

  return (
    <div
      onClick={() => onSelectChange(!isSelected)}
      className={`group relative flex items-center justify-between py-2 px-3.5 select-none overflow-hidden hover:translate-x-[2px]
        ${isSelected 
          ? "glass-card-active shadow-[0_4px_20px_rgba(59,130,246,0.04)]" 
          : "glass-card hover:border-blue-500/35"
        }
      `}
    >
      {/* Premium launching top glowing scanned line */}
      {/* 物理级启动中顶部扫描微光细线 */}
      {isLaunching && (
        <div className="absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden bg-background/50">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer-flow" />
        </div>
      )}

      {/* Left indicators: dynamic bar & breathing lamp */}
      {/* 左侧彩色指示条：选中时具有呼吸微光投影 */}
      <div 
        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-md bg-blue-500 transition-all
          ${isSelected 
            ? "scale-y-110 animate-breathing-glow text-blue-500" 
            : "scale-y-75 group-hover:scale-y-100 opacity-30 group-hover:opacity-60 bg-muted-foreground"
          }`} 
      />

      {/* Left side content (Checkbox and details) */}
      {/* 左侧内容区域 (自适应紧凑排布) */}
      <div className="flex items-center gap-3.5 pl-1 min-w-0 flex-1">
        {/* Custom premium compact checkbox */}
        {/* 轻奢复选框，带弹性过渡与立体边框 */}
        <div
          className={`flex items-center justify-center w-4 h-4 rounded-md border transition-all flex-shrink-0
            ${isSelected 
              ? "bg-blue-500 border-transparent text-white shadow-sm scale-105" 
              : "border-[hsl(var(--border))] bg-background hover:border-blue-500/50"
            }
          `}
        >
          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
        </div>

        {/* Project details - 3-Row highly compact typography */}
        {/* 项目详情排版 - 三行紧凑型黄金比例设计 */}
        <div className="flex flex-col min-w-0 flex-1 py-0.5">
          {/* First Row: Name and micro badges */}
          {/* 第一行：项目名 与 微标并排 */}
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs.5 font-bold truncate transition-colors text-foreground">
              {project.name}
            </h3>
            {/* Windows Shell 徽章 */}
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors ${winBadge.color}`}>
              {winBadge.label}
            </span>
            {/* macOS Shell 徽章 */}
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors ${macBadge.color}`}>
              {macBadge.label}
            </span>
          </div>

          {/* Second Row: Path with monitor icon */}
          {/* 第二行：项目物理路径（优雅的代码等宽字体） */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-muted-foreground min-w-0">
            <Monitor className="w-3 h-3 flex-shrink-0 opacity-60 transition-all group-hover:opacity-100 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-105" />
            <span className="truncate font-mono select-all tracking-tight transition-colors group-hover:text-foreground" title={project.windows_path}>
              {project.windows_path}
            </span>
          </div>
          
          {/* Third Row: Launch command with code icon */}
          {/* 第三行：启动命令（醒目的终端命令配色，格式塔心理学色彩呼应） */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] min-w-0 text-blue-600 dark:text-blue-400">
            <Code className="w-3 h-3 flex-shrink-0 opacity-70 transition-all group-hover:opacity-100 group-hover:scale-105 group-hover:text-blue-500" />
            <span className="font-mono truncate font-semibold tracking-tight animate-none" title={project.command}>
              {project.command}
            </span>
          </div>
        </div>
      </div>

      {/* Right side compact physical action button */}
      {/* 右侧极其紧凑的物理质感编辑与启动按钮 */}
      <div className="flex items-center gap-2 pl-3" onClick={(e) => e.stopPropagation()}>
        {/* Edit Button / 编辑项目配置按钮 */}
        <button
          onClick={onEdit}
          className="btn-icon-outline relative overflow-hidden group/btn"
          title={`编辑项目: ${project.name}`}
        >
          <Edit3 className="w-3.5 h-3.5 text-muted-foreground group-hover/btn:text-foreground group-hover/btn:scale-110 transition-all" />
          {/* Radial glow background on hover */}
          <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </button>

        {/* Launch Button / 启动项目按钮 */}
        <button
          onClick={onLaunch}
          disabled={isLaunching}
          className={`btn-icon-outline relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed
            ${isLaunching ? "bg-secondary text-muted-foreground" : ""}`}
          title={`启动项目: ${project.name}`}
        >
          {isLaunching ? (
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-current text-muted-foreground group-hover/btn:text-foreground group-hover/btn:scale-110 group-hover/btn:translate-x-[0.5px] transition-all" />
              {/* Radial glow background on hover */}
              <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
