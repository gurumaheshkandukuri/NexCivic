import React, { useState, useEffect } from "react";
import { Bell, X, AlertCircle, CheckCircle2, FileText, Info } from "lucide-react";
import { NotificationPayload, markAsRead } from "../services/notificationService";

interface NotificationToastProps {
  latestNotification?: NotificationPayload | null;
  onOpenCenter?: () => void;
}

export default function NotificationToast({ latestNotification, onOpenCenter }: NotificationToastProps) {
  const [activeToast, setActiveToast] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    if (latestNotification && !latestNotification.read) {
      setActiveToast(latestNotification);
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [latestNotification]);

  if (!activeToast) return null;

  const handleToastClick = async () => {
    if (activeToast.notificationId) {
      await markAsRead(activeToast.notificationId);
    }
    setActiveToast(null);
    if (onOpenCenter) onOpenCenter();
  };

  const getIcon = () => {
    switch (activeToast.type) {
      case "INSPECTION_COMPLETED":
      case "RESOLUTION_APPROVED":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "COMPLAINT_ASSIGNED":
      case "INSPECTION_STARTED":
        return <FileText className="w-5 h-5 text-cyan-400" />;
      case "STATUS_UPDATED":
        return <Info className="w-5 h-5 text-indigo-400" />;
      default:
        return <Bell className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div 
      onClick={handleToastClick}
      className="fixed top-16 right-4 z-50 max-w-sm w-full p-4 bg-[#0b0f19]/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100 animate-slideDown glass cursor-pointer hover:border-cyan-500/50 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              {activeToast.type.replace("_", " ")}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Just now</span>
          </div>

          <h4 className="text-xs font-extrabold text-slate-100 mt-1">
            {activeToast.title}
          </h4>

          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {activeToast.body}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveToast(null);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
