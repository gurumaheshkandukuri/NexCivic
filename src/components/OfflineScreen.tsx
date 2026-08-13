import React, { useEffect } from "react";
import { WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import Logo from "./Logo";

export default function OfflineScreen() {
  useEffect(() => {
    const handleOnline = () => {
      console.log("[OfflineScreen] Internet restored. Reloading application...");
      window.location.reload();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0b0f19] text-slate-100 font-sans">
      <div className="relative w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center glass overflow-hidden">
        
        {/* Glow ambient effects */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-5 shadow-lg shadow-amber-500/5">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        <h2 className="font-display font-extrabold text-2xl text-slate-100 tracking-tight mb-2">
          You're Offline
        </h2>

        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
          You can still browse previously loaded content. Internet connection is required to submit new complaints or stream live telemetry updates.
        </p>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-300 flex items-center gap-3 text-left mb-6">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>The application will automatically reconnect as soon as network connectivity is restored.</span>
        </div>

        <button
          onClick={handleRetry}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 touch-target cursor-pointer transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>

      </div>
    </div>
  );
}
