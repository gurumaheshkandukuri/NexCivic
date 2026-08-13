import React, { useState } from "react";
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Info, 
  AlertTriangle,
  Filter
} from "lucide-react";
import { 
  NotificationPayload, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "../services/notificationService";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationPayload[];
  unreadCount: number;
  userUID: string;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  userUID
}: NotificationCenterProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((item) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "UNREAD") return !item.read;
    return item.type === selectedFilter;
  });

  const handleMarkOne = async (id?: string) => {
    if (id) await markAsRead(id);
  };

  const handleMarkAll = async () => {
    await markAllAsRead(userUID);
  };

  const handleDeleteOne = async (id?: string) => {
    if (id) await deleteNotification(id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "INSPECTION_COMPLETED":
      case "RESOLUTION_APPROVED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "COMPLAINT_ASSIGNED":
      case "INSPECTION_STARTED":
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case "STATUS_UPDATED":
        return <Info className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#0b0f19] border-l border-white/10 h-full flex flex-col shadow-2xl glass text-left relative overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-100">
                Notification Center
              </h3>
              <span className="text-[10px] font-mono text-slate-400 block">
                {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-colors touch-target cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Read All
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target flex items-center justify-center"
              aria-label="Close notification drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 border-b border-white/5 bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          {["ALL", "UNREAD", "STATUS_UPDATED", "COMPLAINT_ASSIGNED", "INSPECTION_COMPLETED"].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`py-1 px-2.5 rounded-lg font-mono text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === filter
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <Bell className="w-10 h-10 stroke-1 text-slate-600" />
              <span className="text-xs font-mono">No notifications found</span>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.notificationId}
                className={`p-3.5 rounded-2xl border transition-all relative group ${
                  item.read
                    ? "bg-slate-900/40 border-slate-800/80 opacity-75"
                    : "bg-slate-900/90 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {item.type.replace("_", " ")}
                      </span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 mt-1.5 truncate">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {item.body}
                    </p>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[10px] font-mono">
                      <span className="text-slate-500">
                        {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                      </span>

                      <div className="flex items-center gap-2">
                        {!item.read && (
                          <button
                            onClick={() => handleMarkOne(item.notificationId)}
                            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-3 h-3" /> Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOne(item.notificationId)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
