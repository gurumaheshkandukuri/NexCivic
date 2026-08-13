import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, CheckCircle2 } from "lucide-react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      // Auto-dismiss reconnected badge after 3.5 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-mono font-bold shadow-2xl flex items-center gap-2.5 transition-all duration-300 animate-slideDown">
      {isOffline ? (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-1.5 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Offline Mode — Limited functionality available</span>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Back Online — Everything is synced</span>
        </div>
      )}
    </div>
  );
}
