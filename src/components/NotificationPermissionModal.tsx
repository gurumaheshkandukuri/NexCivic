import React, { useState, useEffect } from "react";
import { Bell, X, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import Logo from "./Logo";

interface NotificationPermissionModalProps {
  activeTab?: string;
}

export default function NotificationPermissionModal({ activeTab }: NotificationPermissionModalProps) {
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if Browser Notifications supported
    if (!("Notification" in window)) return;

    // 2. Check if permission is already granted or denied
    if (Notification.permission !== "default") return;

    // 3. Check 14-day dismissal window
    const lastDismissed = localStorage.getItem("nexcivic_notif_modal_dismissed");
    if (lastDismissed) {
      const elapsed = Date.now() - parseInt(lastDismissed, 10);
      if (elapsed < 14 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 4. Timer: Wait 30 seconds before prompting
    const timer = setTimeout(() => {
      if (activeTab !== "auth") {
        setShowModal(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleEnable = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        console.log("[NotificationModal] Permission granted!");
        new Notification("NexCivic Notifications Active", {
          body: "You will now receive real-time grievance status updates.",
          icon: "/icon-192.png"
        });
      }
    } catch (err) {
      console.error("[NotificationModal] Permission request error:", err);
    } finally {
      setShowModal(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem("nexcivic_notif_modal_dismissed", Date.now().toString());
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0b0f19]/95 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden text-left glass">
        
        {/* Ambient glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target flex items-center justify-center"
          aria-label="Close notification modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Logo size="sm" />
          <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Realtime Alerts
          </span>
        </div>

        <h3 className="font-display font-extrabold text-xl text-slate-100 tracking-tight">
          Stay Informed with Real-Time Alerts
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Get instant browser notifications when your grievance report is inspected, dispatched, or resolved.
        </p>

        <div className="grid grid-cols-1 gap-2.5 my-5">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Instant Status Updates</span>
              <span className="text-[10px] text-slate-400 block">Know immediately when an officer is assigned</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Resolution Proof Alerts</span>
              <span className="text-[10px] text-slate-400 block">Receive digital resolution certificate alerts</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleEnable}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 touch-target cursor-pointer transition-all active:scale-95"
          >
            <Bell className="w-4 h-4" /> Enable Notifications
          </button>

          <button
            onClick={handleDismiss}
            className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs touch-target cursor-pointer transition-colors"
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
}
