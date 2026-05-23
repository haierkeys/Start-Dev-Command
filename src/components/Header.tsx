import React from "react";
import { Terminal, Sun, Moon, Plus, RefreshCw, ArrowLeft, FileCode, Trash2, FolderOpen } from "lucide-react";

/**
 * Props for the Header component
 * 顶部导航组件属性
 */
interface HeaderProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onRefresh: () => void;
  onEdit: (mode: "gui" | "json" | "new") => void;
  loading: boolean;
  currentView: "dashboard" | "edit";
  onBack: () => void;
  isCreatingNew?: boolean;
  showDelete?: boolean;
  onDelete?: () => void;
  isJsonMode?: boolean;
  onOpenDir?: () => void;
}

/**
 * Premium dashboard header component with dynamic view switching support
 * 带有高档主题切换器、全局操作及动态页面返回按钮的品质感页眉控制面板组件
 */
export const Header: React.FC<HeaderProps> = ({ 
  theme, 
  onToggleTheme,
  onRefresh,
  onEdit,
  loading,
  currentView,
  onBack,
  isCreatingNew = false,
  showDelete = false,
  onDelete,
  isJsonMode = false,
  onOpenDir
}) => {
  const isDark = theme === "dark";
  const isEditView = currentView === "edit";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between py-3.5 px-6 border-b transition-colors duration-300 shrink-0
      bg-background/95 border-[hsl(var(--border))] backdrop-blur-md"
    >

      {/* Brand logo & title / Back Navigation Button */}
      {/* 品牌 Logo 与标题 / 返回导航按钮 */}
      <div className="relative flex items-center gap-3">
        {isEditView ? (
          <button
            onClick={onBack}
            className="btn-icon-outline group"
            title="返回控制面板"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </button>
        ) : (
          <div className="flex items-center justify-center w-9 h-9 rounded-md text-white transition-transform duration-300 hover:scale-105
            bg-blue-500 shadow-sm"
          >
            <Terminal className="w-4.5 h-4.5" />
          </div>
        )}
        
        <div className="flex flex-col select-none">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-500 dark:text-blue-400">
              {isEditView ? (isJsonMode ? "数据配置" : (isCreatingNew ? "项目创建" : "系统设置")) : "开发工作空间"}
            </span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {isEditView ? (isJsonMode ? "编辑JSON源数据" : (isCreatingNew ? "新建项目" : "编辑项目")) : "控制面板"}
          </h1>
        </div>
      </div>

      {/* Global Actions Button Group */}
      {/* 全局操作按钮组 */}
      <div className="flex items-center gap-2">
        {!isEditView && (
          <>
            {/* Create New Project Button */}
            {/* 新建项目按钮 */}
            <button
              onClick={() => onEdit("new")}
              disabled={loading}
              className="btn-icon-outline group relative disabled:opacity-50"
              title="新建项目"
            >
              <Plus className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-105" />
            </button>

            {/* Edit Raw JSON Button (JSON Mode) */}
            {/* 配置编辑按钮 (JSON 源码模式) */}
            <button
              onClick={() => onEdit("json")}
              disabled={loading}
              className="btn-icon-outline group relative disabled:opacity-50"
              title="编辑JSON源数据"
            >
              <FileCode className="w-4 h-4 transition-transform duration-300 group-hover:scale-105" />
            </button>

            {/* Sync/Refresh Configuration Button */}
            {/* 同步刷新配置按钮 */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="btn-icon-outline group relative disabled:opacity-50"
              title="重新加载项目配置"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 group-hover:rotate-45 ${loading ? "animate-spin" : ""}`} />
            </button>
          </>
        )}

        {/* Delete Project Button / 删除项目按钮 */}
        {isEditView && showDelete && onDelete && (
          <button
            onClick={onDelete}
            className="btn-icon-outline group relative hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-50/10 cursor-pointer animate-in fade-in zoom-in duration-200"
            title="删除此项目"
          >
            <Trash2 className="w-4 h-4 transition-transform duration-300 group-hover:scale-105" />
          </button>
        )}

        {/* Open config directory Button / 打开配置文件目录按钮 */}
        {isEditView && isJsonMode && onOpenDir && (
          <button
            onClick={onOpenDir}
            className="btn-icon-outline group relative hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-50/10 cursor-pointer animate-in fade-in zoom-in duration-200"
            title="在访达中打开数据源目录"
          >
            <FolderOpen className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-105" />
          </button>
        )}

        {/* Theme Toggle Button */}
        {/* 主题切换按钮 */}
        <button
          onClick={onToggleTheme}
          className="btn-icon-outline group relative"
          title={isDark ? "切换至浅色模式" : "切换至暗色模式"}
        >
          {isDark ? (
            <Sun className="w-4 h-4 transition-transform duration-500 rotate-180 group-hover:rotate-0 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 transition-transform duration-500 rotate-0 group-hover:-rotate-12" />
          )}
        </button>
      </div>
    </header>
  );
};
