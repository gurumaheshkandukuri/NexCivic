import React, { useState, useEffect } from "react";
import { 
  Download, 
  X, 
  Zap, 
  WifiOff, 
  BellRing, 
  Smartphone, 
  Share, 
  PlusSquare,
  CheckCircle2
} from "lucide-react";
import Logo from "./Logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPwaModalProps {
  activeTab?: string;
  isOtherModalOpen?: boolean;
}

export default function InstallPwaModal({ activeTab, isOtherModalOpen = false }: InstallPwaModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Engagement tracking: User interacted OR spent 20s on site
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [timeElapsed, setTimeElapsed] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      return isStandaloneMedia || isIOSStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // 2. Check iOS browser detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Check for globally pre-captured prompt
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    // 4. Check dismissal history from localStorage (24 hours window instead of permanent)
    const lastDismissed = localStorage.getItem("nexcivic_pwa_dismissed");
    if (lastDismissed) {
      const elapsed = Date.now() - parseInt(lastDismissed, 10);
      if (elapsed < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem("nexcivic_pwa_dismissed");
      }
    }

    // 5. Track 5 seconds timer
    const timer = setTimeout(() => {
      setTimeElapsed(true);
    }, 5000);

    // 6. Track user interaction
    const handleUserInteraction = () => {
      setHasInteracted(true);
    };

    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("scroll", handleUserInteraction, { once: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true });

    // 7. Listen for beforeinstallprompt & custom events
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleCustomPromptReady = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setDeferredPrompt(customEvt.detail as BeforeInstallPromptEvent);
      } else if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      setShowModal(false);
      localStorage.removeItem("nexcivic_pwa_dismissed");
      console.log("[PWA] NexCivic App successfully installed!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("nexcivic-pwa-prompt-ready", handleCustomPromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("nexcivic-pwa-installed", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("scroll", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("nexcivic-pwa-prompt-ready", handleCustomPromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("nexcivic-pwa-installed", handleAppInstalled);
    };
  }, []);

  // Determine modal visibility
  useEffect(() => {
    if (isStandalone || isInstalled || isDismissed || activeTab === "auth" || isOtherModalOpen) {
      setShowModal(false);
      return;
    }

    const promptObj = deferredPrompt || (window as any).deferredPwaPrompt;
    const isEngaged = hasInteracted || timeElapsed;
    const isPromptReady = !!promptObj || isIOS;

    if (isEngaged && isPromptReady) {
      setShowModal(true);
    }
  }, [deferredPrompt, isStandalone, isInstalled, isDismissed, isIOS, hasInteracted, timeElapsed, activeTab, isOtherModalOpen]);

  const handleInstallClick = async () => {
    const promptObj = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptObj) {
      await promptObj.prompt();
      const choiceResult = await promptObj.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setShowModal(false);
        localStorage.removeItem("nexcivic_pwa_dismissed");
      }
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowModal(false);
    localStorage.setItem("nexcivic_pwa_dismissed", Date.now().toString());
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0b0f19]/95 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden text-left glass">
        
        {/* Glow ambient background orbs */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target flex items-center justify-center"
          aria-label="Close install prompt"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Header */}
        <div className="flex items-center gap-3 mb-4">
          <Logo size="sm" />
          <div>
            <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Official PWA
            </span>
          </div>
        </div>

        <h3 className="font-display font-extrabold text-xl text-slate-100 tracking-tight">
          Install NexCivic App
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Get a faster, native experience directly on your mobile device or desktop.
        </p>

        {/* Feature Benefits List */}
        <div className="grid grid-cols-1 gap-2.5 my-5">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Faster Performance</span>
              <span className="text-[10px] text-slate-400 block">Instant app launch directly from your home screen</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Offline Access</span>
              <span className="text-[10px] text-slate-400 block">Access incident telemetry reports without network dropouts</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Live Municipal Alerts</span>
              <span className="text-[10px] text-slate-400 block">Real-time resolution status updates for grievances</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Native Standalone Mode</span>
              <span className="text-[10px] text-slate-400 block">Full screen view without browser URL bars</span>
            </div>
          </div>
        </div>

        {/* iOS Safari Special Guidance */}
        {isIOS && !deferredPrompt && (
          <div className="p-3 mb-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-300">
            <span className="font-bold text-indigo-400 block mb-1">iOS Safari Installation Instructions:</span>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1">
              <Share className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tap <strong>Share</strong> button in Safari toolbar, then select <strong className="text-white">"Add to Home Screen"</strong></span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 touch-target cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" /> Install NexCivic
            </button>
          ) : null}

          <button
            onClick={handleDismiss}
            className={`py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs touch-target cursor-pointer transition-colors ${
              !deferredPrompt ? "w-full" : "w-auto"
            }`}
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
}
