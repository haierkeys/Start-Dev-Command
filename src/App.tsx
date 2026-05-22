import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, CheckSquare, Square, RefreshCw, Layers } from "lucide-react";
import { Project } from "./types/project";
import { Header } from "./components/Header";
import { ProjectCard } from "./components/ProjectCard";
import { StatusToast } from "./components/StatusToast";

/**
 * Main Application Component with premium UX and pure minimalist layout
 * 极致视觉与细节打磨的纯粹主义主应用程序仪表盘
 */
function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Record<number, boolean>>({});
  const [launchingIndex, setLaunchingIndex] = useState<number | null>(null);
  const [batchLaunching, setBatchLaunching] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme state: defaults to 'dark'
  // 主题状态：默认为 'dark'
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });

  // Toast notifications state
  // Toast 浮动提示通知状态
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync theme with HTML class attribute for Tailwind dark: modifiers
  // 将主题同步至 HTML 标签的 class，以驱动 Tailwind 的 dark: 变体渲染
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Fetch projects list from Rust command
  // 从 Rust 后端读取项目配置列表
  const fetchProjects = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await invoke<Project[]>("load_projects");
      setProjects(data);
      
      const initialSelection: Record<number, boolean> = {};
      data.forEach((_, index) => {
        initialSelection[index] = false;
      });
      setSelectedIndices(initialSelection);
      if (silent) {
        showToast("项目列表已刷新", "success");
      }
    } catch (err) {
      console.error(err);
      showToast(`加载项目失败: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // Launch a single project item
  // 启动单个选定项目
  const handleLaunch = async (project: Project, index: number) => {
    setLaunchingIndex(index);
    try {
      await invoke("launch_project", { project });
      showToast(`成功启动: ${project.name}`, "success");
    } catch (err) {
      console.error(err);
      showToast(`启动失败: ${err}`, "error");
    } finally {
      setLaunchingIndex(null);
    }
  };

  // Launch all selected projects in batch
  // 一键批量启动所有被勾选的项目
  const handleBatchLaunch = async () => {
    const selectedProjects = projects.filter((_, idx) => selectedIndices[idx]);
    if (selectedProjects.length === 0) {
      showToast("请至少选择一个项目", "error");
      return;
    }

    setBatchLaunching(true);
    try {
      const launchedCount = await invoke<number>("batch_launch", { projects: selectedProjects });
      showToast(
        `批量启动成功: 已启动 ${launchedCount} 个开发项目`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast(`批量启动失败: ${err}`, "error");
    } finally {
      setBatchLaunching(false);
    }
  };

  // Toggle single selection
  // 切换单个选定的勾选状态
  const handleSelectToggle = (index: number, checked: boolean) => {
    setSelectedIndices((prev) => ({
      ...prev,
      [index]: checked,
    }));
  };

  // Multi-selection indicators and total counters
  // 勾选计数与状态绑定
  const selectedCount = Object.values(selectedIndices).filter(Boolean).length;
  const isAllSelected = projects.length > 0 && selectedCount === projects.length;

  // Select all or Clear all within list
  // 对列表中的所有项目进行全选或反选
  const handleToggleAll = () => {
    const newSelection: Record<number, boolean> = {};
    projects.forEach((_, index) => {
      newSelection[index] = !isAllSelected;
    });
    setSelectedIndices(newSelection);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`flex flex-col min-h-screen transition-luxury selection:bg-indigo-500/30 selection:text-indigo-200
      bg-slate-50 dark:bg-slate-950 
      text-slate-800 dark:text-slate-100
      tech-grid relative overflow-hidden
      ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Dark mode Nebula Glow: luxury background bloom */}
      {/* 暗色模式下顶部的极奢彩色漫反射微光 */}
      {theme === "dark" && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-gradient-to-b from-indigo-500/10 via-blue-500/5 to-transparent rounded-full blur-[90px] pointer-events-none -z-10" />
      )}

      {/* Header Panel */}
      {/* 仪表盘顶栏 */}
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* Main content viewport */}
      {/* 主视图视口区域 */}
      <main className="flex-1 flex flex-col max-w-none w-full mx-auto px-5 py-6 overflow-hidden z-10">

        {/* Counter and Utility Actions Bar */}
        {/* 项目项计数与多选批处理控制条 */}
        <div className="flex items-center justify-between mb-4.5 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
              项目总数:
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border transition-luxury
              bg-white dark:bg-slate-900 
              text-slate-655 dark:text-slate-350 
              border-slate-200/70 dark:border-slate-900"
            >
              {projects.length}
            </span>
            {selectedCount > 0 && (
              <>
                <span className="text-xs font-semibold text-slate-300 dark:text-slate-800 select-none">•</span>
                <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                  已选择:
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full border transition-luxury
                  bg-indigo-50 dark:bg-indigo-950/20 
                  text-indigo-600 dark:text-indigo-400 
                  border-indigo-100 dark:border-indigo-900/30"
                >
                  {selectedCount}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Configuration Button */}
            {/* 同步刷新配置按钮 */}
            <button
              onClick={() => fetchProjects(true)}
              disabled={loading}
              className="flex items-center justify-center p-2.5 rounded-xl border transition-luxury disabled:opacity-50 active:scale-95 cursor-pointer shadow-sm
                bg-white dark:bg-slate-950 
                hover:bg-slate-100 dark:hover:bg-slate-900/60 
                border-slate-200/80 dark:border-slate-900 
                hover:border-slate-300 dark:hover:border-slate-800 
                text-slate-400 dark:text-slate-550 
                hover:text-slate-700 dark:hover:text-slate-250"
              title="重新加载项目配置"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* Toggle All Checkbox */}
            {/* 批量多选切换药丸按钮 */}
            {projects.length > 0 && (
              <button
                onClick={handleToggleAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-luxury active:scale-[0.98] cursor-pointer shadow-sm
                  bg-white dark:bg-slate-955 
                  hover:bg-slate-100 dark:hover:bg-slate-900/60 
                  border-slate-200/80 dark:border-slate-900 
                  hover:border-slate-300 dark:hover:border-slate-800 
                  text-slate-500 dark:text-slate-400 
                  hover:text-slate-750 dark:hover:text-slate-200"
              >
                {isAllSelected ? (
                  <>
                    <Square className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    <span>清空选择</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    <span>全选项目</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list viewport */}
        {/* 高度紧凑、阻尼回弹的可滚动项目列表 */}
        {/* 动态自适应 pb-24 以免被底部的悬浮控制面板所遮挡 */}
        <div className={`flex-1 overflow-y-auto space-y-2 pr-1.5 py-1 transition-all duration-300 ${selectedCount > 0 ? "pb-24" : "pb-4"}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold tracking-wide">正在读取配置...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl transition-luxury
              border-slate-200/70 dark:border-slate-900 
              bg-white/30 dark:bg-slate-950/10 
              text-slate-400 dark:text-slate-500"
            >
              <Layers className="w-8 h-8 text-slate-300 dark:text-slate-800 stroke-[1.5] mb-2" />
              <p className="text-xs.5 font-bold">未配置任何开发项目</p>
              <p className="text-[11px] text-slate-450 dark:text-slate-600 mt-1">请编辑 projects.json 配置文件</p>
            </div>
          ) : (
            projects.map((project, index) => (
              <ProjectCard
                key={project.name + "-" + index}
                project={project}
                index={index}
                isSelected={!!selectedIndices[index]}
                onSelectChange={(checked) => handleSelectToggle(index, checked)}
                onLaunch={() => handleLaunch(project, index)}
                isLaunching={launchingIndex === index}
              />
            ))
          )}
        </div>
      </main>

      {/* Premium floating Action Button (FAB) for Batch Launch - Icon Only */}
      {/* 高端毛玻璃圆形悬浮操作按钮（FAB）：仅显示图标，带微型高亮角标与优雅升降动效 */}
      {projects.length > 0 && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out transform
          ${selectedCount === 0 
            ? "translate-y-28 opacity-0 pointer-events-none" 
            : "translate-y-0 opacity-100"
          }`}
        >
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 p-1.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={handleBatchLaunch}
              disabled={batchLaunching}
              className="relative w-12 h-12 flex items-center justify-center rounded-full font-bold transition-all duration-300 shadow-md active:scale-90 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-555 text-white shadow-indigo-500/20 dark:shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              title={`一键启动选中项目 (${selectedCount})`}
            >
              {batchLaunching ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4.5 h-4.5 fill-current translate-x-[0.5px]" />
              )}
            </button>
            
            {/* Floating micro selection count badge / 微型高亮选中计数角标 */}
            {!batchLaunching && selectedCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 select-none transition-all duration-300">
                {selectedCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Elegant Toast Feedback */}
      {/* 精致悬浮状态反馈弹窗 */}
      {toast && (
        <StatusToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
