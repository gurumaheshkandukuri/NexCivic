import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase-init";
import { motion } from "framer-motion";
import { 
  getUserProfile, 
  subscribeAllIssues, 
  checkAndSeedDatabase 
} from "./dbService";
import { Issue, UserProfile } from "./types";

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

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  const [activeTab, setActiveTab] = useState<string>("landing");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [loading, setLoading] = useState(true);

  // Scroll to top on active tab change to fix navigation scroll continuity
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  // Initialize and Seed empty database once on cold-boot
  useEffect(() => {
    const initializeDataSystem = async () => {
      try {
        await checkAndSeedDatabase();
      } catch (err) {
        console.warn("Database seeding skipped or errored:", err);
      }
    };
    initializeDataSystem();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);

      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            setUser(profile);
          } catch (err) {
            console.error("Auth status sync errored:", err);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsub();
    };

    initializeUser();
  }, []);

  // Subscribe to Live Issues Feed from Firestore
  useEffect(() => {
    const unsub = subscribeAllIssues((hotIssues) => {
      setIssues(hotIssues);
    });
    return () => unsub && unsub();
  }, []);

  // Apply visual theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleRefresh = async () => {
    // No-op. Live updates are fully managed by real-time Firestore subscriptions.
  };

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
    <div className="min-h-screen bg-[var(--bg-void)] text-[var(--text-1)] select-none transition-all duration-300 relative overflow-x-hidden">
      
      {/* Global Animated Floating Background Orbs for a 3D Atmosphere */}
      <div className="bg-orb-purple top-[8%] -left-36 opacity-35" />
      <div className="bg-orb-cyan top-[28%] -right-36 opacity-20" />
      <div className="bg-orb-purple bottom-[32%] -left-24 opacity-25" />
      <div className="bg-orb-cyan bottom-[8%] -right-24 opacity-30" />

      {/* Universal header Nav bar */}
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme} 
        toggleTheme={toggleTheme}
        onOpenNotification={() => {}}
      />

      {/* Main active route renders */}
      <main className="relative z-10 pt-20">
        
        {activeTab === "landing" && (
          <div className="animate-fadeIn">
            <LandingHero 
              issues={issues} 
              users={[]} 
              setActiveTab={setActiveTab} 
              user={user} 
              theme={theme}
            />
            <AboutSection />
          </div>
        )}

        {activeTab === "map" && (
          <div className="animate-fadeIn">
            <MapExplorer 
              issues={issues} 
              user={user} 
              onRefresh={handleRefresh} 
            />
          </div>
        )}

        {activeTab === "telangana" && (
          <div className="animate-fadeIn">
            <TelanganaDashboard />
          </div>
        )}

        {activeTab === "report" && user && user.role === "Citizen" && (
          <div className="animate-fadeIn">
            <ReportIssue 
              user={user} 
              issues={issues} 
              onSuccess={handleRefresh} 
              setActiveTab={setActiveTab} 
            />
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="animate-fadeIn">
            {user ? (
              user.role === "Citizen" ? (
                <CitizenDashboard 
                  user={user} 
                  issues={issues} 
                />
              ) : user.role === "MunicipalityMgr" ? (
                <MunicipalityMgrDashboard 
                  user={user} 
                  issues={issues} 
                  onRefresh={handleRefresh} 
                />
              ) : (
                <AdminPanel 
                  user={user} 
                  issues={issues} 
                  onRefresh={handleRefresh} 
                />
              )
            ) : (
              <AuthPage onSuccess={handleRefresh} theme={theme} />
            )}
          </div>
        )}

        {activeTab === "profile" && user && (
          <div className="animate-fadeIn">
            <ProfilePage 
              user={user} 
              issues={issues} 
              theme={theme} 
            />
          </div>
        )}

        {activeTab === "auth" && (
          <div className="animate-fadeIn">
            <AuthPage onSuccess={() => setActiveTab("dashboard")} theme={theme} />
          </div>
        )}

      </main>

      {/* Official Re-Architected Premium Glassmorphic Scroll-Reveal Footer */}
      {!loading && 
        <motion.footer 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="border-t border-slate-200/30 dark:border-white/10 bg-slate-100/60 dark:bg-[#0b0f19]/75 backdrop-blur-xl py-16 px-6 md:px-12 mt-20 relative z-10 glass"
        >
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            
            {/* Brand block (Span 5) */}
            <div className="md:col-span-5 flex flex-col gap-4 text-center md:text-left">
                <div className="flex justify-center md:justify-start">
                <Logo size="md" themeType={theme} />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed font-sans font-medium">
                NexCivic is the next-generation metropolitan smart coordinate telemetry and semantic report clustering protocol. Fostering resilient, transparent, and responsive urban infrastructure.
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono tracking-widest font-bold text-slate-500 dark:text-slate-400 uppercase">WARD ALLOCATED NODE v2.4</span>
                </div>
            </div>

            {/* Quick Navigation grid (Span 4) */}
            <div className="md:col-span-4 flex flex-col gap-4 text-center md:text-left">
                <span className="text-[10px] font-mono uppercase font-black text-slate-500 dark:text-slate-450 tracking-wider">Smart Layers</span>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <button onClick={() => setActiveTab("landing")} className="hover:text-cyan-600 dark:hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">About Paradigm</button>
                <button onClick={() => setActiveTab("map")} className="hover:text-cyan-600 dark:hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">Smart Map</button>
                <button onClick={() => setActiveTab("telangana")} className="hover:text-cyan-600 dark:hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">Telangana Desk</button>
                <button onClick={() => setActiveTab("dashboard")} className="hover:text-cyan-600 dark:hover:text-[var(--cyan)] transition-colors cursor-pointer text-center md:text-left">Staff Terminal</button>
                <span className="cursor-not-allowed text-center md:text-left opacity-50">Water supply lines</span>
                <span className="cursor-not-allowed text-center md:text-left opacity-50 font-normal">Thermal Heatmap</span>
                </div>
            </div>

            {/* Security details & Municipalities (Span 3) */}
            <div className="md:col-span-3 flex flex-col gap-4 items-center md:items-end text-center md:text-right">
                <div className="flex flex-col gap-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                <span className="font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-300">© 2026 NEXCIVIC SYSTEMS</span>
                <span>ALL RIGHTS RESERVED GLOBALLY</span>
                </div>
                
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-cyan-500/5 dark:bg-cyan-400/5 border border-cyan-500/10 dark:border-cyan-400/10 text-[9px] font-mono text-cyan-600 dark:text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>SECURED BY FIRESTORE DIRECT</span>
                </div>
            </div>

            </div>
        </motion.footer>
        }

    </div>
  );
}
