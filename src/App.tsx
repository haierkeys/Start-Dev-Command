import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, CheckSquare, Square, RefreshCw, Layers, Edit3, X, Copy, Check, Plus, Trash2, Settings2 } from "lucide-react";
import { Project } from "./types/project";
import { Header } from "./components/Header";
import { ProjectCard } from "./components/ProjectCard";

/**
 * Super lightweight client-side JSON syntax highlighter using regex.
 * 基于正则表达式的轻量级纯前端 JSON 语法高亮着色器。
 */
const highlightJson = (jsonStr: string): string => {
  if (!jsonStr) return "";
  try {
    // Escape HTML characters to prevent XSS injection / 转义 HTML 符号以防安全注入漏洞
    let html = jsonStr
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    // Lexical analysis colorizer / 正则语法分词着色器
    return html.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "text-amber-600 dark:text-amber-400 font-semibold"; // default for numbers / 默认数字与值
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-blue-500 dark:text-blue-400 font-bold"; // key strings / 属性键名
          } else {
            cls = "text-emerald-600 dark:text-emerald-400"; // value strings / 属性字符串值
          }
        } else if (/true|false/.test(match)) {
          cls = "text-purple-600 dark:text-purple-400 font-bold"; // boolean values / 布尔值
        } else if (/null/.test(match)) {
          cls = "text-slate-400 dark:text-slate-500 italic"; // null values / 空值
        }
        
        if (/:$/.test(match)) {
          return `<span class="${cls}">${match.slice(0, -1)}</span>:`;
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  } catch (e) {
    return jsonStr;
  }
};

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

  // Configuration editing states
  // 配置文件编辑相关状态
  const [configPath, setConfigPath] = useState<string>("");
  const [currentView, setCurrentView] = useState<"dashboard" | "edit">("dashboard");
  const [editMode, setEditMode] = useState<"gui" | "json">("gui");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [guiProjects, setGuiProjects] = useState<Project[]>([]);
  const [scrollTargetIndex, setScrollTargetIndex] = useState<number | null>(null);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const isPreventSaveRef = React.useRef(true);
  const preRef = React.useRef<HTMLPreElement>(null);

  // Theme state: defaults to 'dark'
  // 主题状态：默认为 'dark'
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });



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

  // Handle smooth scroll navigation & flash border highlight for card editor
  // 处理卡片编辑视图的顺滑定位与微光闪烁高亮提示
  useEffect(() => {
    if (currentView === "edit" && scrollTargetIndex !== null && guiProjects.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`edit-card-${scrollTargetIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setScrollTargetIndex(null); // Reset target / 复位锁定目标
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [currentView, scrollTargetIndex, guiProjects]);

  // Auto-save logic for GUI mode edits
  // GUI 模式下数据发生变动后的自动保存逻辑
  useEffect(() => {
    if (isPreventSaveRef.current || currentView !== "edit") return;
    if (editMode !== "gui") return;

    setSaveStatus("saving");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const finalJson = JSON.stringify(guiProjects, null, 2);
        await invoke("save_projects_raw", { contents: finalJson });
        setSaveStatus("saved");
        fetchProjects(true); // Silently reload sidebar/list data
      } catch (err: any) {
        console.error("Auto-save GUI error:", err);
        setSaveStatus("error");
        setAutoSaveError(err.message || String(err));
      }
    }, 450); // 450ms debounce for input edits

    return () => clearTimeout(delayDebounceFn);
  }, [guiProjects, editMode, currentView]);

  // Auto-save logic with JSON verification for raw editing
  // JSON 源码模式下的实时保存与合法性校验逻辑
  useEffect(() => {
    if (isPreventSaveRef.current || currentView !== "edit") return;
    if (editMode !== "json") return;

    try {
      // Validate JSON syntax before saving to disk / 语法格式前置检验
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) {
        throw new Error("配置文件必须是 JSON 数组格式");
      }
      setJsonError(null);
      setSaveStatus("saving");

      const delayDebounceFn = setTimeout(async () => {
        try {
          await invoke("save_projects_raw", { contents: rawJson });
          setSaveStatus("saved");
          fetchProjects(true);
        } catch (err: any) {
          console.error("Auto-save JSON error:", err);
          setSaveStatus("error");
          setAutoSaveError(err.message || String(err));
        }
      }, 700); // 700ms debounce for typing raw JSON

      return () => clearTimeout(delayDebounceFn);
    } catch (err: any) {
      // Set syntax error status, block auto-save to prevent file corruption
      // 捕获语法错误并提示，拦截写盘动作，绝不写入残缺配置
      setJsonError(err.message || String(err));
      setSaveStatus("error");
    }
  }, [rawJson, editMode, currentView]);

  // Safe flush on exit / 返回仪表盘时的安全写盘逻辑，确保数据零丢失与空白临时卡片净化
  // Support passing updatedProjects to circumvent stale state closure / 支持传入更新后的项目列表，绕过 React 异步状态闭包
  const handleBackToDashboard = async (updatedProjects?: Project[]) => {
    let finalGuiProjects = updatedProjects !== undefined ? updatedProjects : guiProjects;
    
    // Automatic cleanup: If the active edit card is a brand new project and was left entirely blank,
    // silently filter it out upon exit to keep the configuration clean and tidy.
    // 自动净化逻辑：如果当前处于活跃编辑的卡片是一个全新临时创建且被完全留空的占位卡片，则在返回时静默剔除
    if (updatedProjects === undefined && editMode === "gui" && activeEditIndex !== null && activeEditIndex < guiProjects.length) {
      const p = guiProjects[activeEditIndex];
      const isTempName = !p.name || p.name.startsWith("新项目-");
      const isEmptyPaths = !p.windows_path && !p.mac_path;
      const isEmptyCommand = !p.command || p.command === "npm run dev";
      if (isTempName && isEmptyPaths && isEmptyCommand) {
        finalGuiProjects = guiProjects.filter((_, idx) => idx !== activeEditIndex);
        setGuiProjects(finalGuiProjects);
      }
    }

    try {
      let finalJson = "";
      if (editMode === "gui") {
        finalJson = JSON.stringify(finalGuiProjects, null, 2);
      } else {
        // Final JSON verification / 终期验证
        JSON.parse(rawJson);
        finalJson = rawJson;
      }
      await invoke("save_projects_raw", { contents: finalJson });
    } catch (e) {
      console.error("Failed to flush changes on back:", e);
    }
    
    setActiveEditIndex(null);
    setCurrentView("dashboard");
    setIsCreatingNew(false);
    fetchProjects(true);
  };

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

    // Load configuration absolute path from Rust command
    // 从 Rust 后端异步获取当前生效配置文件的绝对路径
    try {
      const path = await invoke<string>("get_config_path");
      setConfigPath(path);
    } catch (pathErr) {
      console.error("Failed to get config path:", pathErr);
    }
  };

  // Switch edit mode with raw JSON <-> GUI project array bidirectional sync
  // 切换编辑模式，实现原始 JSON 与 GUI 项目数组的双向无缝同步
  const switchEditMode = (mode: "gui" | "json") => {
    if (mode === "json") {
      // Sync GUI to JSON / 从 GUI 同步至 JSON 源码
      const formatted = JSON.stringify(guiProjects, null, 2);
      setRawJson(formatted);
      setJsonError(null);
      setEditMode("json");
    } else {
      // Sync JSON to GUI / 从 JSON 源码同步至 GUI 界面
      try {
        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed)) {
          throw new Error("配置文件格式必须是 JSON 数组 / Configuration must be a JSON array");
        }
        
        // Auto-complete fields to prevent missing property errors
        // 自动补全缺失字段防止界面报错
        const formattedProjects = parsed.map((p: any) => ({
          name: p.name || "",
          windows_path: p.windows_path || "",
          mac_path: p.mac_path || "",
          command: p.command || "",
          win_shell: p.win_shell || "cmd",
          mac_shell: p.mac_shell || "default",
          wsl_shell: p.wsl_shell || "zsh"
        }));

        setGuiProjects(formattedProjects);
        setJsonError(null);
        setEditMode("gui");
      } catch (err: any) {
        console.error(err);
        setJsonError(err.message || String(err));
        showToast("JSON 语法解析失败，无法切换到界面模式", "error");
      }
    }
  };

  // Open edit modal and load raw projects.json text
  // Support specifying initial active index to edit / 支持指定初始激活的编辑项目索引
  const handleOpenEditModal = async (initialMode?: "gui" | "json" | "new", initialIndex?: number) => {
    try {
      setLoading(true);
      isPreventSaveRef.current = true; // Block auto-save during loading phase
      const raw = await invoke<string>("load_projects_raw");
      setRawJson(raw);
      setJsonError(null);

      // Attempt to load into GUI list / 尝试解析加载至 GUI 暂存列表
      try {
        const parsed = JSON.parse(raw);
        let baseProjects: Project[] = [];
        if (Array.isArray(parsed)) {
          baseProjects = parsed;
        }

        if (initialMode === "new") {
          setIsCreatingNew(true);
          // Auto create a blank project template and append to list
          // 自动创建一个新的空白项目配置模板并追加到列表
          const newProject: Project = {
            name: `新项目-${baseProjects.length + 1}`,
            windows_path: "",
            mac_path: "",
            command: "npm run dev",
            win_shell: "cmd",
            mac_shell: "default",
            wsl_shell: "zsh"
          };
          const updated = [...baseProjects, newProject];
          setGuiProjects(updated);
          setEditMode("gui");
          // Lock scroll target to the newly appended project card
          // 将顺滑滚动目标锁定到新追加的项目索引
          setScrollTargetIndex(baseProjects.length);
          setActiveEditIndex(baseProjects.length);
        } else {
          setIsCreatingNew(false);
          setGuiProjects(baseProjects);
          setEditMode(initialMode || "gui");
          setActiveEditIndex(initialIndex !== undefined ? initialIndex : 0);
        }
      } catch (e) {
        // Fallback or recovery when original JSON is corrupted
        // 若原始 JSON 已损坏，且请求新建，则创建并初始化带有一个新空项目的配置数组
        if (initialMode === "new") {
          setIsCreatingNew(true);
          const newProject: Project = {
            name: "新项目-1",
            windows_path: "",
            mac_path: "",
            command: "npm run dev",
            win_shell: "cmd",
            mac_shell: "default",
            wsl_shell: "zsh"
          };
          setGuiProjects([newProject]);
          setEditMode("gui");
          setScrollTargetIndex(0);
          setActiveEditIndex(0);
        } else {
          setIsCreatingNew(false);
          setGuiProjects([]);
          setEditMode("json");
          setActiveEditIndex(null);
        }
      }

      setCurrentView("edit");
      // Allow state updates to settle, then unblock auto-save and set status to saved
      setTimeout(() => {
        isPreventSaveRef.current = false;
        setSaveStatus("saved");
      }, 150);
    } catch (err) {
      console.error(err);
      showToast(`加载配置文件失败: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal for a single project card and trigger smooth scroll locking
  // 为特定项目卡片打开编辑面板并标记以触发顺滑定位
  // Pass index parameter to keep the active edit index correct / 传入 index 参数以保持编辑索引正确
  const handleEditSingleProject = async (index: number) => {
    setIsCreatingNew(false);
    setActiveEditIndex(index);
    setScrollTargetIndex(index);
    await handleOpenEditModal(undefined, index);
  };

  // Save config to file (supports both GUI and JSON modes)
  // 保存配置文件（兼容 GUI 与 JSON 模式）
  const handleSaveJson = async () => {
    setIsSaving(true);
    setJsonError(null);
    try {
      let finalJson = "";
      if (editMode === "gui") {
        finalJson = JSON.stringify(guiProjects, null, 2);
      } else {
        // Run a fast frontend validation to prevent saving syntax error raw json
        // 在前端运行快速校验以防在 JSON 源码模式下误存破损数据
        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed)) {
          throw new Error("配置文件必须是 JSON 数组格式 / Configuration must be a JSON array");
        }
        finalJson = rawJson;
      }

      await invoke("save_projects_raw", { contents: finalJson });
      showToast("配置文件保存成功", "success");
      setCurrentView("dashboard");
      setIsCreatingNew(false);
      await fetchProjects(true);
    } catch (err: any) {
      console.error(err);
      setJsonError(err.message || String(err));
      showToast("保存失败，请检查语法错误", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new project template in GUI list
  // 在 GUI 列表中添加一个新项目配置模版
  const handleAddGuiProject = () => {
    const newProject: Project = {
      name: `新项目-${guiProjects.length + 1}`,
      windows_path: "",
      mac_path: "",
      command: "npm run dev",
      win_shell: "cmd",
      mac_shell: "default",
      wsl_shell: "zsh"
    };
    const updated = [...guiProjects, newProject];
    setGuiProjects(updated);
  };

  // Remove a project from GUI list
  // 在 GUI 列表中移除一个项目配置
  const handleRemoveGuiProject = (indexToRemove: number) => {
    const updated = guiProjects.filter((_, idx) => idx !== indexToRemove);
    setGuiProjects(updated);
  };

  // Delete current editing project from header action
  // 从顶部 Header 点击删除当前编辑的项目
  // Pass updated array directly to circumvent stale state closure / 直接传入删除后的新数组以绕过 React 异步状态闭包
  const handleDeleteCurrentProject = () => {
    if (activeEditIndex !== null) {
      const updated = guiProjects.filter((_, idx) => idx !== activeEditIndex);
      setGuiProjects(updated);
      setActiveEditIndex(null);
      handleBackToDashboard(updated);
    }
  };

  // Open config directory in OS file manager
  // 在操作系统文件管理器中打开配置文件所在目录
  const handleOpenConfigDir = async () => {
    try {
      await invoke("open_config_dir");
    } catch (err) {
      console.error("Failed to open config directory:", err);
    }
  };

  // Update a single property of a project in GUI list
  // 修改 GUI 列表中某个项目的特定字段
  const handleUpdateGuiProject = (index: number, field: keyof Project, value: any) => {
    const updated = guiProjects.map((p, idx) => {
      if (idx === index) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setGuiProjects(updated);
  };

  // Copy configuration absolute path to clipboard
  // 复制配置文件绝对路径至剪贴板
  const handleCopyPath = () => {
    if (!configPath) return;
    navigator.clipboard.writeText(configPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    // 右下角提示已全局关闭
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

  // Synchronize scroll offsets between raw textarea and highlighted background layers
  // 在源码输入文本框与高亮着色背景层之间建立精准的像素级滚动偏移同步
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className={`flex flex-col h-screen transition-luxury selection:bg-blue-500/30 selection:text-blue-800 dark:selection:text-blue-200
      bg-background text-foreground
      tech-grid relative overflow-hidden
      ${theme === "dark" ? "dark" : ""}`}
    >

      {/* Header Panel */}
      {/* 仪表盘顶栏 */}
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme} 
        onRefresh={() => fetchProjects(true)}
        onEdit={handleOpenEditModal}
        loading={loading}
        currentView={currentView}
        onBack={handleBackToDashboard}
        isCreatingNew={isCreatingNew}
        showDelete={editMode === "gui" && activeEditIndex !== null && guiProjects.length > 0}
        onDelete={handleDeleteCurrentProject}
        isJsonMode={editMode === "json"}
        onOpenDir={handleOpenConfigDir}
      />

      {/* Main content viewport */}
      {/* 主视图视口区域 */}
      <main className="flex-1 flex flex-col max-w-none w-full mx-auto px-5 py-6 overflow-hidden z-10">

        {currentView === "dashboard" ? (
          <>
            {/* Counter and Utility Actions Bar */}
            {/* 项目项计数与多选批处理控制条 */}
            <div className="flex items-center justify-between mb-4.5 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  项目总数:
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full border transition-all
                  bg-secondary text-foreground border-[hsl(var(--border))]"
                >
                  {projects.length}
                </span>
                {selectedCount > 0 && (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground opacity-40 select-none">•</span>
                    <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      已选择:
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border transition-all
                      bg-blue-50/40 dark:bg-blue-950/20 
                      text-blue-600 dark:text-blue-400 
                      border-blue-100/50 dark:border-blue-900/30"
                    >
                      {selectedCount}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle All Checkbox */}
                {/* 批量多选切换药丸按钮 */}
                {projects.length > 0 && (
                  <button
                    onClick={handleToggleAll}
                    className="btn-icon-outline w-8 h-8 rounded-md shadow-sm"
                    title={isAllSelected ? "清空选择" : "全选项目"}
                  >
                    {isAllSelected ? (
                      <Square className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
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
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-550 gap-3">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold tracking-wide">正在读取配置...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 border border-dashed rounded-md transition-all
                  border-[hsl(var(--border))] bg-secondary/10 
                  text-muted-foreground text-center"
                >
                  <Layers className="w-8 h-8 text-muted-foreground/45 stroke-[1.5] mb-3" />
                  <p className="text-xs font-bold">未配置任何开发项目</p>
                  <button
                    onClick={() => handleOpenEditModal()}
                    className="btn-default mt-3 h-8 px-4 text-xs rounded-md shadow-sm"
                  >
                    前往配置项目
                  </button>
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
                    onEdit={() => handleEditSingleProject(index)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          /* Dynamic Page-Switch Settings View / 全屏切换项目设置页面 */
          <div className="flex-1 flex flex-col w-full h-full overflow-hidden transition-all duration-300 animate-in fade-in duration-200">
            {/* Modal Editor Area / 编辑内容主视图 */}
            {editMode === "gui" ? (
              <div className="flex-1 overflow-y-auto px-1 py-5 min-h-0 space-y-6">
                {guiProjects.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-20 select-none">
                    <Layers className="w-8 h-8 text-muted-foreground/30 stroke-[1.5]" />
                    <p className="text-xs font-semibold">没有任何开发项目，请添加新项目</p>
                    <button
                      onClick={handleAddGuiProject}
                      className="btn-default mt-2 h-8 px-4 text-xs rounded-md shadow-sm"
                    >
                      新增首个项目
                    </button>
                  </div>
                ) : (() => {
                  const currentIdx = activeEditIndex !== null && activeEditIndex < guiProjects.length ? activeEditIndex : 0;
                  const project = guiProjects[currentIdx];
                  if (!project) return null;

                  return (
                    <div className="w-full space-y-6">
                      <div 
                        id={`edit-card-${currentIdx}`}
                        className="space-y-5 transition-all"
                      >
                        {/* Name Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10.5px] font-bold text-muted-foreground">项目名称</label>
                          <input
                            type="text"
                            value={project.name}
                            onChange={(e) => handleUpdateGuiProject(currentIdx, "name", e.target.value)}
                            className="input-default font-sans font-semibold"
                            placeholder="例如: Start Dev CLI"
                          />
                        </div>

                        {/* Launch Command Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10.5px] font-bold text-muted-foreground">启动命令 (Command)</label>
                          <input
                            type="text"
                            value={project.command}
                            onChange={(e) => handleUpdateGuiProject(currentIdx, "command", e.target.value)}
                            className="input-default font-mono"
                            placeholder="例如: npm run dev"
                          />
                        </div>

                        {/* macOS Path Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10.5px] font-bold text-muted-foreground">macOS 项目路径 (Mac Path)</label>
                          <input
                            type="text"
                            value={project.mac_path || ""}
                            onChange={(e) => handleUpdateGuiProject(currentIdx, "mac_path", e.target.value)}
                            className="input-default font-mono"
                            placeholder="例如: ~/Dev/start-dev-command"
                          />
                        </div>

                        {/* Windows Path Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10.5px] font-bold text-muted-foreground">Windows 项目路径 (Win Path)</label>
                          <input
                            type="text"
                            value={project.windows_path || ""}
                            onChange={(e) => handleUpdateGuiProject(currentIdx, "windows_path", e.target.value)}
                            className="input-default font-mono"
                            placeholder="例如: D:\Workspace\start-dev-command"
                          />
                        </div>

                        {/* Shell Settings Header */}
                        <div className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider pt-2 flex items-center gap-2">
                          <Settings2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                          <span>平台 Shell 环境设置 (可选)</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Win Shell */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground">Windows Shell</label>
                            <select
                              value={project.win_shell || "cmd"}
                              onChange={(e) => handleUpdateGuiProject(currentIdx, "win_shell", e.target.value)}
                              className="input-default"
                            >
                              <option value="cmd">CMD</option>
                              <option value="powershell">PowerShell</option>
                              <option value="wsl">WSL</option>
                            </select>
                          </div>

                          {/* Mac Shell */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground">macOS Terminal</label>
                            <select
                              value={project.mac_shell || "default"}
                              onChange={(e) => handleUpdateGuiProject(currentIdx, "mac_shell", e.target.value)}
                              className="input-default"
                            >
                              <option value="default">Terminal (默认)</option>
                              <option value="iterm2">iTerm2</option>
                            </select>
                          </div>
                        </div>

                        {/* WSL Shell Options */}
                        {project.win_shell === "wsl" && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground">WSL Shell</label>
                            <select
                              value={project.wsl_shell || "zsh"}
                              onChange={(e) => handleUpdateGuiProject(currentIdx, "wsl_shell", e.target.value)}
                              className="input-default"
                            >
                              <option value="zsh">zsh</option>
                              <option value="bash">bash</option>
                              <option value="sh">sh</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* JSON Code Editor Mode / JSON 源码编辑模式 */
              <div className="flex-1 flex flex-col p-5 overflow-hidden relative">
                <div className="flex-1 relative w-full overflow-hidden border border-[hsl(var(--border))] rounded-md bg-background focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
                  {/* Highlight Display Layer / 语法高亮渲染背景层 */}
                  <pre
                    ref={preRef}
                    className="absolute inset-0 p-3.5 m-0 font-mono text-sm leading-relaxed overflow-auto pointer-events-none select-none whitespace-pre-wrap break-all text-wrap"
                    dangerouslySetInnerHTML={{ __html: highlightJson(rawJson) }}
                  />
                  {/* Active Textarea Input Layer / 真实交互文本输入层 */}
                  <textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 w-full h-full p-3.5 m-0 font-mono text-sm leading-relaxed bg-transparent border-0 resize-none outline-none focus:ring-0 overflow-auto text-transparent caret-foreground whitespace-pre-wrap break-all"
                    placeholder="// 请输入 JSON 格式的项目配置..."
                    spellCheck={false}
                    style={{ caretColor: "currentColor" }}
                  />
                </div>
                
                {/* Intelligent Error Message Banner */}
                {jsonError && (
                  <div className="mt-3 p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10 text-[11px] font-semibold text-rose-600 dark:text-rose-455 flex flex-col gap-0.5 animate-pulse">
                    <span className="font-bold uppercase tracking-wider text-[10px]">语法错误提示 / Syntax Error:</span>
                    <span className="font-mono break-all">{jsonError}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Premium floating Action Button (FAB) for Batch Launch - Icon Only */}
      {/* 高端毛玻璃圆形悬浮操作按钮（FAB）：仅显示图标，带微型高亮角标与优雅升降动效 */}
      {currentView === "dashboard" && projects.length > 0 && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out transform
          ${selectedCount === 0 
            ? "translate-y-28 opacity-0 pointer-events-none" 
            : "translate-y-0 opacity-100"
          }`}
        >
          <div className="relative bg-background/80 backdrop-blur-md border border-[hsl(var(--border))] p-1.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={handleBatchLaunch}
              disabled={batchLaunching}
              className="relative w-12 h-12 flex items-center justify-center rounded-full font-bold transition-all duration-300 shadow-md active:scale-90 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer disabled:opacity-50"
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


    </div>
  );
}

export default App;
