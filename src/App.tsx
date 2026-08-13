import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase-init";
import { authService } from "./services/authService";
import { motion } from "framer-motion";
import { 
  Home, 
  MapPin, 
  PlusCircle, 
  LayoutDashboard, 
  User, 
  LogIn 
} from "lucide-react";
import { 
  getUserProfile, 
} from "./services/userService";
import { ROLES } from "./constants/roles";
import { UserProfile } from "./types";

// Import modules
import Navbar from "./components/Navbar";
import LandingHero from "./components/LandingHero";
import AboutSection from "./components/AboutSection";
import ReportIssue from "./components/ReportIssue";
import CitizenDashboard from "./components/CitizenDashboard";
import AdminPanel from "./components/AdminPanel";
import MunicipalityMgrDashboard from "./components/MunicipalityMgrDashboard";
import MapExplorer from "./components/MapExplorer";
import AuthPage from "./components/AuthPage";
import Logo from "./components/Logo";
import TelanganaDashboard from "./components/TelanganaDashboard";
import ProfilePage from "./components/ProfilePage";
import InstallPwaModal from "./components/InstallPwaModal";
import OfflineBanner from "./components/OfflineBanner";
import PwaUpdateToast from "./components/PwaUpdateToast";
import SyncStatus from "./components/SyncStatus";
import { queueManager } from "./services/queueManager";
import NotificationPermissionModal from "./components/NotificationPermissionModal";
import NotificationToast from "./components/NotificationToast";
import NotificationCenter from "./components/NotificationCenter";
import { subscribeNotifications, NotificationPayload } from "./services/notificationService";
import { notificationWorkflow } from "./services/notificationWorkflow";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);

  const [activeTab, setActiveTab] = useState<string>("landing");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>("");

  // Notification Infrastructure States
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState<boolean>(false);

  const isCitizen = (u: UserProfile | null) => u && (u.role === ROLES.CITIZEN || (u.role as string) === "Citizen");
  const isHQ = (u: UserProfile | null) => u && (u.role === ROLES.MUNICIPALITY_HQ || (u.role as string) === "MunicipalityMgr" || (u.role as string) === "MunicipalityHQ");

  const canAccessRoute = (currentUser: UserProfile | null, route: string) => {
    const publicRoutes = ["landing", "map", "telangana", "auth"];
    if (publicRoutes.includes(route)) return true;
    if (!currentUser) return false;
    
    if (route === "report") return isCitizen(currentUser);
    
    return true;
  };

  // Scroll to top on active tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  // Apply permanent Dark theme to DOM, Initialize Offline Queue & Notification Workflow
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    queueManager.init();
    notificationWorkflow.init();
  }, []);

  // Realtime Notifications Subscription
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotifications(user.uid, (items, unread) => {
      setNotifications(items);
      setUnreadCount(unread);
      if (items.length > 0) {
        setLatestNotification(items[0]);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Listen to Auth State
  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);

      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            let profile = await getUserProfile(firebaseUser.uid);
            
            if (!profile) {
              for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 1000));
                profile = await getUserProfile(firebaseUser.uid);
                if (profile) break;
              }
            }

            if (profile) {
              setUser(profile);
              setAuthError("");
            } else {
              await authService.logout();
              setUser(null);
              setAuthError("Account not configured properly. Profile data missing.");
              setActiveTab("auth");
            }
          } catch (err) {
            console.error("Auth status sync errored:", err);
            await authService.logout();
            setUser(null);
            setAuthError("Authentication error occurred.");
            setActiveTab("auth");
          }
        } else {
          setUser(null);
          setAuthError("");
        }
        setLoading(false);
      });

      return () => unsub();
    };

    initializeUser();
  }, []);

  // Handle initial route from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setActiveTab(hash);
    }
  }, []);

  // Role-Based Guard
  useEffect(() => {
    if (!loading) {
      if (!canAccessRoute(user, activeTab)) {
        setActiveTab(user ? "dashboard" : "auth");
      }
    }
  }, [user, activeTab, loading]);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      setActiveTab(hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const handleRefresh = async () => {};

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex flex-col items-center justify-center gap-4 text-left">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--cyan)] to-[var(--blue)] flex items-center justify-center shadow-[0_0_20px_var(--cyan)] animate-spin">
          <span className="w-6 h-6 rounded-lg bg-slate-900" />
        </div>
        <span className="text-xs uppercase font-bold tracking-widest text-[var(--cyan)] font-mono animate-pulse">
          NexCivic Core Loading...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-void)] text-[var(--text-1)] select-none transition-all duration-300 relative overflow-x-hidden w-full max-w-[100vw]">
      
      {/* Global Animated Floating Background Orbs for a 3D Atmosphere */}
      <div className="bg-orb-purple top-[8%] -left-36 opacity-35" />
      <div className="bg-orb-cyan top-[28%] -right-36 opacity-20" />
      <div className="bg-orb-purple bottom-[32%] -left-24 opacity-25" />
      <div className="bg-orb-cyan bottom-[8%] -right-24 opacity-30" />

      {/* Universal Header Nav bar */}
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenNotification={() => {}}
      />

      {/* Main active route renders */}
      <main className="relative z-10 pt-16 md:pt-20 pb-20 md:pb-0 flex-1 w-full max-w-[100vw] overflow-x-hidden">
        
        {activeTab === "landing" && (
          <div className="animate-fadeIn">
            <LandingHero 
              users={[]} 
              setActiveTab={setActiveTab} 
              user={user} 
            />
            <AboutSection />
          </div>
        )}

        {activeTab === "map" && (
          <div className="animate-fadeIn">
            <MapExplorer 
              user={user} 
            />
          </div>
        )}

        {activeTab === "telangana" && (
          <div className="animate-fadeIn">
            <TelanganaDashboard />
          </div>
        )}

        {activeTab === "report" && isCitizen(user) && (
          <div className="animate-fadeIn">
            <ReportIssue 
              user={user!} 
              onSuccess={handleRefresh} 
              setActiveTab={setActiveTab} 
            />
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="animate-fadeIn">
            {user ? (
              isCitizen(user) ? (
                <CitizenDashboard 
                  user={user} 
                />
              ) : isHQ(user) ? (
                <MunicipalityMgrDashboard 
                  user={user} 
                />
              ) : (
                <AdminPanel 
                  user={user} 
                />
              )
            ) : (
              <AuthPage onSuccess={handleRefresh} />
            )}
          </div>
        )}

        {activeTab === "profile" && user && (
          <div className="animate-fadeIn">
            <ProfilePage 
              user={user} 
            />
          </div>
        )}

        {activeTab === "auth" && (
          <div className="animate-fadeIn">
            <AuthPage onSuccess={() => setActiveTab("dashboard")} globalError={authError} />
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (<768px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 pb-safe shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          
          <button
            onClick={() => setActiveTab("landing")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl touch-target transition-all ${
              activeTab === "landing"
                ? "text-indigo-400 font-bold bg-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          {user && isCitizen(user) && (
            <button
              onClick={() => setActiveTab("report")}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl touch-target transition-all ${
                activeTab === "report"
                  ? "text-indigo-400 font-bold bg-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <PlusCircle className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Report</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl touch-target transition-all ${
              activeTab === "map"
                ? "text-indigo-400 font-bold bg-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Map</span>
          </button>

          <button
            onClick={() => setActiveTab(user ? "dashboard" : "auth")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl touch-target transition-all ${
              activeTab === "dashboard" || activeTab === "auth"
                ? "text-indigo-400 font-bold bg-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab(user ? "profile" : "auth")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl touch-target transition-all ${
              activeTab === "profile"
                ? "text-indigo-400 font-bold bg-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {user ? <User className="w-5 h-5 mb-0.5" /> : <LogIn className="w-5 h-5 mb-0.5" />}
            <span className="text-[10px] tracking-tight">{user ? "Profile" : "Sign In"}</span>
          </button>

        </div>
      </nav>

      {/* Official Scroll-Reveal Footer */}
      {!loading && (
        <motion.footer 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="border-t border-white/10 bg-[#0b0f19]/75 backdrop-blur-xl py-12 px-4 md:px-12 mt-auto relative z-10 glass hidden md:block"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5 flex flex-col gap-3 text-center md:text-left">
              <div className="flex justify-center md:justify-start">
                <Logo size="md" />
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed font-sans font-medium">
                NexCivic is the next-generation metropolitan smart coordinate telemetry and semantic report clustering protocol. Fostering resilient, transparent, and responsive urban infrastructure.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono tracking-widest font-bold text-slate-400 uppercase">WARD ALLOCATED NODE v2.4</span>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col gap-3 text-center md:text-left">
              <span className="text-[10px] font-mono uppercase font-black text-slate-400 tracking-wider">Smart Layers</span>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-slate-400">
                <button onClick={() => setActiveTab("landing")} className="hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">About Paradigm</button>
                <button onClick={() => setActiveTab("map")} className="hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">Smart Map</button>
                <button onClick={() => setActiveTab("telangana")} className="hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">Telangana Desk</button>
                <button onClick={() => setActiveTab("dashboard")} className="hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">Staff Terminal</button>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-3 items-center md:items-end text-center md:text-right">
              <div className="flex flex-col gap-1 font-mono text-[9px] text-slate-400">
                <span className="font-extrabold tracking-wider uppercase text-slate-300">© 2026 NEXCIVIC SYSTEMS</span>
                <span>ALL RIGHTS RESERVED GLOBALLY</span>
              </div>
              
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-cyan-400/5 border border-cyan-400/10 text-[9px] font-mono text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>SECURED BY FIRESTORE DIRECT</span>
              </div>
            </div>
          </div>
        </motion.footer>
      )}

      {/* Floating Connectivity Banner */}
      <OfflineBanner />

      {/* PWA Custom Premium Install Modal Prompt */}
      <InstallPwaModal activeTab={activeTab} />

      {/* PWA Version Update Toast */}
      <PwaUpdateToast />

      {/* Offline Queue Sync Status Widget */}
      <SyncStatus />

      {/* Notification Permission Modal (30s delay) */}
      <NotificationPermissionModal activeTab={activeTab} />

      {/* Foreground Notification Toast */}
      <NotificationToast 
        latestNotification={latestNotification} 
        onOpenCenter={() => setIsNotifCenterOpen(true)} 
      />

      {/* Notification Center Drawer */}
      <NotificationCenter 
        isOpen={isNotifCenterOpen} 
        onClose={() => setIsNotifCenterOpen(false)} 
        notifications={notifications} 
        unreadCount={unreadCount} 
        userUID={user?.uid || ""} 
      />
    </div>
  );
}
