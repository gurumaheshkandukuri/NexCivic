import React, { useState } from "react";
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Info, 
  Search,
  Filter
} from "lucide-react";
import { 
  NotificationPayload, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "../services/notificationService";
import { ROLES } from "../constants/roles";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationPayload[];
  unreadCount: number;
  userUID: string;
  userRole?: string;
  onOpenNotification?: (issueId: string) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  userUID,
  userRole,
  onOpenNotification
}: NotificationCenterProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  if (!isOpen) return null;

  const normalizedRole = userRole || "CITIZEN";
  const isInspector = normalizedRole === ROLES.FIELD_INSPECTOR || normalizedRole === "FieldInspector";
  const isHQ = normalizedRole === ROLES.MUNICIPALITY_HQ || normalizedRole === "MunicipalityHQ" || normalizedRole === "MunicipalityMgr";

  // Category Types mapping by role & type
  const getCategoryTypes = (category: string): string[] => {
    switch (category) {
      case "COMPLAINTS":
      case "NEW_COMPLAINTS":
        return ["NEW_COMPLAINT", "COMPLAINT_SUBMITTED", "STATUS_UPDATED"];
      case "ASSIGNMENTS":
        return ["COMPLAINT_ASSIGNED"];
      case "INSPECTION":
        return ["INSPECTION_STARTED", "INSPECTION_COMPLETED"];
      case "RESOLUTION":
        return ["RESOLUTION_APPROVED"];
      case "UPDATES":
        return ["STATUS_UPDATED", "FEEDBACK_RECEIVED"];
      case "SYSTEM":
        return ["SYSTEM_NOTIFICATION", "FEEDBACK_RECEIVED", "STATUS_UPDATED"];
      default:
        return [];
    }
  };

  // Available categories depending on user role
  const getAvailableCategories = () => {
    if (isInspector) {
      return [
        { id: "ALL", label: "All Types" },
        { id: "ASSIGNMENTS", label: "Assignments" },
        { id: "INSPECTION", label: "Inspections" },
        { id: "RESOLUTION", label: "Resolutions" },
        { id: "UPDATES", label: "Updates" },
      ];
    }
    if (isHQ) {
      return [
        { id: "ALL", label: "All Types" },
        { id: "NEW_COMPLAINTS", label: "New Grievances" },
        { id: "INSPECTION", label: "Inspections" },
        { id: "RESOLUTION", label: "Approvals" },
        { id: "SYSTEM", label: "System & Feedback" },
      ];
    }
    // Citizen / Default
    return [
      { id: "ALL", label: "All Types" },
      { id: "COMPLAINTS", label: "Complaints" },
      { id: "INSPECTION", label: "Inspections" },
      { id: "RESOLUTION", label: "Resolutions" },
    ];
  };

  const categories = getAvailableCategories();

  // In-Memory Combined Filtering Logic (AND condition)
  const filteredNotifications = notifications.filter((item) => {
    // 1. Status Filter
    if (statusFilter === "UNREAD" && item.read) return false;
    if (statusFilter === "READ" && !item.read) return false;

    // 2. Category Filter
    if (categoryFilter !== "ALL") {
      const allowedTypes = getCategoryTypes(categoryFilter);
      if (allowedTypes.length > 0 && !allowedTypes.includes(item.type)) {
        return false;
      }
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const bodyMatch = item.body?.toLowerCase().includes(q);
      const issueMatch = item.issueId?.toLowerCase().includes(q);
      const metadataMatch = JSON.stringify(item.metadata || {}).toLowerCase().includes(q);
      const typeMatch = item.type?.toLowerCase().includes(q);
      if (!titleMatch && !bodyMatch && !issueMatch && !metadataMatch && !typeMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate Status Counts in Memory
  const totalCount = notifications.length;
  const unreadTotal = notifications.filter(n => !n.read).length;
  const readTotal = notifications.filter(n => n.read).length;

  const handleMarkOne = async (id?: string) => {
    if (id) await markAsRead(id);
  };

  const handleMarkAll = async () => {
    await markAllAsRead(userUID, userRole);
  };

  const handleDeleteOne = async (id?: string) => {
    if (id) await deleteNotification(id);
  };

  const handleItemClick = async (item: NotificationPayload) => {
    if (!item.read && item.notificationId) {
      await markAsRead(item.notificationId);
    }
    if (item.issueId && onOpenNotification) {
      onOpenNotification(item.issueId);
      onClose();
    }
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
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 relative">
              <Bell className="w-5 h-5" />
              {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadTotal}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-100">
                Notification Center
              </h3>
              <span className="text-[10px] font-mono text-slate-400 block">
                {unreadTotal} unread alert{unreadTotal !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadTotal > 0 && (
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

        {/* Search & Filter Toolbar */}
        <div className="p-3 border-b border-white/10 bg-slate-900/40 flex flex-col gap-2.5 shrink-0">
          
          {/* Real-time Search Box */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500/50 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`flex-1 py-1 px-2 rounded-lg font-mono text-[10px] font-bold text-center transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("UNREAD")}
              className={`flex-1 py-1 px-2 rounded-lg font-mono text-[10px] font-bold text-center transition-all cursor-pointer ${
                statusFilter === "UNREAD"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              Unread ({unreadTotal})
            </button>
            <button
              onClick={() => setStatusFilter("READ")}
              className={`flex-1 py-1 px-2 rounded-lg font-mono text-[10px] font-bold text-center transition-all cursor-pointer ${
                statusFilter === "READ"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              Read ({readTotal})
            </button>
          </div>

          {/* Category Filter Pills (Horizontal Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs pt-0.5">
            <Filter className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`py-1 px-2.5 rounded-lg font-mono text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <Bell className="w-10 h-10 stroke-1 text-slate-600" />
              <span className="text-xs font-mono font-bold text-slate-400">
                {searchQuery ? "No notifications match your search query." : "No matching notifications found."}
              </span>
              {(statusFilter !== "ALL" || categoryFilter !== "ALL" || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setCategoryFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-1 py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.notificationId}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 rounded-2xl border transition-all relative group cursor-pointer ${
                  item.read
                    ? "bg-slate-900/40 border-slate-800/80 opacity-75 hover:bg-slate-800/60"
                    : "bg-slate-900/90 border-cyan-500/30 shadow-lg shadow-cyan-500/5 hover:border-cyan-500/50"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOne(item.notificationId);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-3 h-3" /> Mark Read
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOne(item.notificationId);
                          }}
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
