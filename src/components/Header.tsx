import React from "react";
import { Terminal, Sun, Moon } from "lucide-react";

/**
 * Props for the Header component
 * 顶部导航组件属性
 */
interface HeaderProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

/**
 * Premium dashboard header component with a luxury theme switcher
 * 带有高档主题切换器的品质感页眉控制面板组件
 */
export const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  const isDark = theme === "dark";

  return (
    <header className="relative flex items-center justify-between py-5 px-6 border-b transition-colors duration-300
      bg-white/80 dark:bg-slate-950/60 
      border-slate-100 dark:border-slate-900 
      backdrop-blur-md"
    >
      {/* Background glow in dark mode */}
      {/* 暗色模式下的微光背景 */}
      {isDark && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.1),rgba(255,255,255,0))] pointer-events-none" />
      )}

      {/* Brand logo & title */}
      {/* 品牌 Logo 与标题 */}
      <div className="relative flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg transition-transform duration-300 hover:scale-105
          bg-gradient-to-tr from-blue-600 to-indigo-500 
          shadow-indigo-500/20"
        >
          <Terminal className="w-5 h-5 animate-pulse" />
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-500 dark:text-indigo-400">
              开发工作空间
            </span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            控制面板
          </h1>
        </div>
      </div>

      {/* Theme Toggle Button */}
      {/* 主题切换按钮 */}
      <button
        onClick={onToggleTheme}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-300 active:scale-95 group shadow-sm cursor-pointer
          bg-slate-50 dark:bg-slate-900 
          border-slate-200 dark:border-slate-800 
          text-slate-600 dark:text-slate-300
          hover:bg-slate-100 dark:hover:bg-slate-800/80
          hover:text-slate-900 dark:hover:text-white"
        title={isDark ? "切换至浅色模式" : "切换至暗色模式"}
      >
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-500 rotate-180 group-hover:rotate-0 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-500 rotate-0 group-hover:-rotate-12 text-slate-500" />
        )}
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
          bg-indigo-500/5 dark:bg-indigo-500/10"
        />
      </button>
    </header>
  );
};
