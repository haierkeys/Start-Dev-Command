import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

/**
 * Props for the Toast notification
 * 状态通知组件属性
 */
interface StatusToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

/**
 * Premium theme-aware toast notification component
 * 适配主题的高级悬浮状态通知组件
 */
export const StatusToast: React.FC<StatusToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === "success";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300
      bg-white/95 dark:bg-slate-900/90 
      border-slate-200/80 dark:border-slate-800 
      shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/40"
    >
      <div className={`flex-shrink-0 p-1.5 rounded-lg ${
        isSuccess 
          ? "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400" 
          : "bg-rose-500/10 text-rose-650 dark:text-rose-400"
      }`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 min-w-[200px]">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {isSuccess ? "成功" : "错误"}
        </h4>
        <p className="text-sm font-semibold mt-0.5 text-slate-800 dark:text-slate-100">{message}</p>
      </div>

      <button
        onClick={onClose}
        className="transition-colors p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
