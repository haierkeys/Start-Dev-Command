import React from "react";
import { Play, Check, Monitor, Code } from "lucide-react";
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
}) => {
  // Balanced color patterns for visual rhythm (Emerald Green & Royal Blue)
  // 兼顾视觉韵律的高级交替渐变与文字色彩（翡翠绿 & 皇家蓝）
  const isEven = index % 2 === 0;
  const accentGradient = isEven ? "from-emerald-500 to-teal-500" : "from-blue-500 to-indigo-500";
  const accentText = isEven ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400";
  const accentBg = isEven ? "bg-emerald-50/60 dark:bg-emerald-500/10" : "bg-blue-50/60 dark:bg-blue-500/10";
  
  // Custom shell badges with premium light/dark responsive tints
  // 高端自适应 Shell 类型徽章，轻奢半透明微光边框
  const getShellBadge = () => {
    if (project.win_shell === "wsl") {
      return { 
        label: `WSL (${project.wsl_shell || "zsh"})`, 
        color: "bg-purple-50/50 dark:bg-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-100/80 dark:border-purple-500/15" 
      };
    }
    if (project.win_shell === "powershell") {
      return { 
        label: "PowerShell", 
        color: "bg-blue-50/50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-100/80 dark:border-blue-500/15" 
      };
    }
    return { 
      label: "CMD", 
      color: "bg-slate-50/60 dark:bg-slate-500/5 text-slate-650 dark:text-slate-400 border-slate-200/50 dark:border-slate-500/15" 
    };
  };

  const badge = getShellBadge();

  return (
    <div
      onClick={() => onSelectChange(!isSelected)}
      className={`group relative flex items-center justify-between py-2 px-3.5 rounded-md border select-none transition-luxury overflow-hidden backdrop-blur-md
        ${isSelected 
          ? "bg-slate-50/70 dark:bg-slate-900/20 border-slate-350 dark:border-indigo-500/40 shadow-[0_4px_20px_rgba(99,102,241,0.06),inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.02)] translate-x-[2px]" 
          : "bg-white/60 dark:bg-slate-950/15 border-slate-200/50 dark:border-slate-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.01),inset_0_1px_0_rgba(255,255,255,0.02)] hover:bg-slate-50/45 dark:hover:bg-slate-900/10 hover:shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:border-slate-300 dark:hover:border-slate-800 hover:translate-x-[2px]"
        }
      `}
    >
      {/* Premium launching top glowing scanned line */}
      {/* 物理级启动中顶部扫描微光细线 */}
      {isLaunching && (
        <div className="absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden bg-slate-100/50 dark:bg-slate-900/50">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-shimmer-flow" />
        </div>
      )}

      {/* Left indicators: dynamic bar & breathing lamp */}
      {/* 左侧彩色指示条：选中时具有呼吸微光投影 */}
      <div 
        className={`absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-md bg-gradient-to-b ${accentGradient} transition-luxury
          ${isSelected 
            ? "scale-y-110 animate-breathing-glow text-indigo-500 dark:text-indigo-400" 
            : "scale-y-75 group-hover:scale-y-100 opacity-60 group-hover:opacity-100"
          }`} 
      />

      {/* Left side content (Checkbox and details) */}
      {/* 左侧内容区域 (自适应紧凑排布) */}
      <div className="flex items-center gap-3.5 pl-1 min-w-0 flex-1">
        {/* Custom premium compact checkbox */}
        {/* 轻奢复选框，带弹性过渡与立体边框 */}
        <div
          className={`flex items-center justify-center w-4 h-4 rounded-md border transition-luxury flex-shrink-0
            ${isSelected 
              ? `bg-gradient-to-tr ${accentGradient} border-transparent text-white shadow-[0_1px_2.5px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] scale-105` 
              : "border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-950 group-hover:border-slate-400 dark:group-hover:border-slate-700 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.03)]"
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
            <h3 className="text-xs.5 font-bold truncate transition-colors text-slate-750 dark:text-slate-200 group-hover:text-slate-955 group-hover:dark:text-white">
              {project.name}
            </h3>
            <span className={`text-[8px] font-extrabold tracking-[0.1em] px-1.5 py-0.5 rounded-md flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${accentBg} ${accentText}`}>
              PROJ
            </span>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          {/* Second Row: Path with monitor icon */}
          {/* 第二行：项目物理路径（优雅的代码等宽字体） */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-slate-400 dark:text-slate-500 min-w-0">
            <Monitor className="w-3 h-3 flex-shrink-0 opacity-60 transition-luxury group-hover:opacity-100 group-hover:text-indigo-500 group-hover:dark:text-indigo-400 group-hover:scale-105" />
            <span className="truncate font-mono select-all tracking-tight transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-350" title={project.windows_path}>
              {project.windows_path}
            </span>
          </div>
          
          {/* Third Row: Launch command with code icon */}
          {/* 第三行：启动命令（醒目的终端命令配色，格式塔心理学色彩呼应） */}
          <div className={`flex items-center gap-1.5 mt-0.5 text-[10.5px] min-w-0 transition-colors
            ${isEven 
              ? "text-teal-650 dark:text-emerald-400/90" 
              : "text-blue-650 dark:text-indigo-400/90"
            }`}
          >
            <Code className={`w-3 h-3 flex-shrink-0 opacity-70 transition-luxury group-hover:opacity-100 group-hover:scale-105
              ${isEven ? "group-hover:text-teal-500" : "group-hover:text-blue-500"}`} 
            />
            <span className="font-mono truncate font-semibold tracking-tight" title={project.command}>
              {project.command}
            </span>
          </div>
        </div>
      </div>

      {/* Right side compact physical action button */}
      {/* 右侧极其紧凑的物理质感启动按钮 */}
      <div className="flex items-center pl-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onLaunch}
          disabled={isLaunching}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-luxury relative overflow-hidden group/btn shadow-[0_1px_2.5px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.05)]
            ${isLaunching 
              ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-650 cursor-not-allowed" 
              : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-90 active:translate-y-[0.5px] cursor-pointer"
            }
          `}
          title={`启动项目: ${project.name}`}
        >
          {isLaunching ? (
            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-slate-400 dark:fill-slate-500 group-hover/btn:fill-slate-700 dark:group-hover/btn:fill-white group-hover/btn:scale-110 group-hover/btn:translate-x-[0.5px] transition-luxury text-slate-400 dark:text-slate-500 group-hover/btn:text-slate-700 dark:group-hover/btn:text-white" />
              {/* Radial glow background on hover */}
              <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
