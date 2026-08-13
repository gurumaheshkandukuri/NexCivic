import React, { useState, useEffect } from "react";
import { RefreshCw, X, Sparkles } from "lucide-react";

export default function PwaUpdateToast() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const handleSwUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
      if (customEvent.detail && customEvent.detail.waiting) {
        setSwRegistration(customEvent.detail);
        setShowToast(true);
      }
    };

    window.addEventListener("nexcivic-sw-update", handleSwUpdate);
    return () => window.removeEventListener("nexcivic-sw-update", handleSwUpdate);
  }, []);

  const handleUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      setShowToast(false);
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-full p-4 bg-[#0b0f19]/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100 animate-slideUp glass">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
          <Sparkles className="w-5 h-5 animate-spin" />
        </div>

        <div className="flex-1">
          <h4 className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
            Update Available
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              NEW
            </span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            A new version of NexCivic is available with performance optimizations.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleUpdate}
              className="py-2 px-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 touch-target cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Update Now
            </button>

            <button
              onClick={handleDismiss}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs touch-target cursor-pointer transition-colors"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          aria-label="Dismiss update toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
