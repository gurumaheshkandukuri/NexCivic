import { useState, useEffect, useRef } from "react";
import { UserProfile, Notification } from "../types";
import { 
  Sun, 
  Moon, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Map, 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  ChevronDown, 
  X,
  Menu,
  CheckCircle,
  Settings,
  ShieldCheck,
  Info
} from "lucide-react";
import { markNotificationAsRead, markAllNotificationsAsRead } from "../services/notificationService";
import { useLiveNotifications } from "../hooks/useLiveNotifications";
import { useClickOutside } from "../hooks/useClickOutside";
import { ROLES } from "../constants/roles";
import { authService } from "../services/authService";
import Logo from "./Logo";

interface NavbarProps {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onOpenNotification: (issueId: string) => void;
}

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  onOpenNotification
}: NavbarProps) {
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setNotifDropdownOpen(false));
  useClickOutside(profileRef, () => setProfileDropdownOpen(false));

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { notifications, isSyncing } = useLiveNotifications(user?.uid);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSignOut = async () => {
    localStorage.removeItem("nex_civic_simulated_user");
    await authService.logout();
    setProfileDropdownOpen(false);
    window.location.reload();
  };

  const handleNotificationClick = async (notif: Notification) => {
    setNotifDropdownOpen(false);
    if (notif.notificationId) {
      await markNotificationAsRead(notif.notificationId);
    }
    
    // Parse issue reference if any from message pattern
    const match = notif.message?.match(/issue "([^"]+)"|problem "([^"]+)"/i);
    // Open main explorer
    setActiveTab(user?.role === ROLES.CITIZEN ? "dashboard" : "dashboard");
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex items-center justify-between w-full border-b backdrop-blur-xl ${
      scrolled 
        ? "py-3 px-6 md:px-12 bg-white/90 dark:bg-[#0b0f19]/90 border-slate-200/60 dark:border-white/10 shadow-[inset_4px_4px_8px_rgba(255,255,255,0.06),0_12px_24px_rgba(0,0,0,0.15)]" 
        : "py-4 md:py-5 px-6 md:px-12 bg-slate-50/25 dark:bg-slate-950/25 border-slate-200/10 dark:border-white/[0.04]"
    }`}>
      {/* Brand Logo & Tag */}
      <div 
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => setActiveTab("landing")}
      >
        <Logo size="md" themeType={theme} />
      </div>

      {/* Navigation Links based on Login Status and Role */}
      <div className="hidden md:flex items-center gap-1.5">
        <button
          onClick={() => setActiveTab("landing")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "landing" 
              ? "bg-[var(--cyan)]/12 text-[var(--cyan)] border border-[var(--cyan)]/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_16px_-6px_rgba(99,102,241,0.25)]" 
              : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border border-transparent"
          }`}
        >
          About Platform
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "map" 
              ? "bg-[var(--cyan)]/12 text-[var(--cyan)] border border-[var(--cyan)]/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_16px_-6px_rgba(99,102,241,0.25)]" 
              : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border border-transparent"
          }`}
        >
          <Map className="w-3.5 h-3.5" /> Interactive Map
        </button>

        <button
          onClick={() => setActiveTab("telangana")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "telangana" 
              ? "bg-[var(--cyan)]/12 text-[var(--cyan)] border border-[var(--cyan)]/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_16px_-6px_rgba(99,102,241,0.25)]" 
              : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border border-transparent"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Telangana Hub
        </button>

        {user && (
          <>
            {user.role === ROLES.CITIZEN && (
              <button
                onClick={() => setActiveTab("report")}
                className="px-4 py-2 h-9 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer clay-btn border border-white/20 transition-all hover:scale-105"
              >
                <FileText className="w-3.5 h-3.5" /> File Incident
              </button>
            )}

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "dashboard" 
                  ? "bg-[var(--cyan)]/12 text-[var(--cyan)] border border-[var(--cyan)]/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_16px_-6px_rgba(99,102,241,0.25)]" 
                  : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border border-transparent"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {user.role === ROLES.CITIZEN && "Citizen Panel"}
              {user.role === ROLES.FIELD_INSPECTOR && "Staff Terminal"}
              {user.role === ROLES.MUNICIPALITY_HQ && "HQ Executive Desk"}
            </button>
          </>
        )}

        {!user && (
          <button
            onClick={() => setActiveTab("auth")}
            className="ml-4 px-5 py-2 h-9 text-xs font-bold rounded-xl text-white clay-btn border border-white/20 transition-all duration-300 ease-out cursor-pointer hover:scale-105 active:scale-95"
          >
            Get Started
          </button>
        )}
      </div>

      {/* Right Utilites & User Profile Dropdowns */}
      <div className="flex items-center gap-3">
        {/* Theme select button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
          title="Toggle Light/Dark Theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-900" />}
        </button>

        {user && (
          <>
            {/* Interactive Bell dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  if (!notifDropdownOpen) setProfileDropdownOpen(false);
                  setNotifDropdownOpen(!notifDropdownOpen);
                }}
                className="p-2 rounded-lg text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-100 dark:hover:bg-white/[0.04] relative transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--red)] flex items-center justify-center text-[9px] text-white font-extrabold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Unread Alert Sub-Panel */}
              {notifDropdownOpen && (
                <div className="fixed md:absolute top-16 md:top-auto right-4 md:right-0 left-4 md:left-auto mt-3 w-[calc(100vw-2rem)] md:w-80 glass bg-white/98 dark:bg-[#0b0f19]/98 rounded-3xl p-5 shadow-2xl border border-slate-205/80 dark:border-white/10 z-50 text-left animate-zoomIn">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-2.5 mb-3">
                    <span className="font-display font-black text-xs uppercase tracking-wider text-[var(--cyan)]">Live Alerts</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-[var(--cyan)] hover:underline font-bold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto flex flex-col gap-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-1.5">
                        <CheckCircle className="w-8 h-8 text-emerald-400/50" />
                        <span className="font-bold">You're all caught up!</span>
                        <span className="text-[10px] text-slate-400">No unread metropolitan notifications.</span>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 rounded-xl text-xs cursor-pointer border transition-all ${
                            notif.read 
                              ? "bg-transparent border-transparent text-slate-600 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-white/[0.02]" 
                              : "bg-[var(--cyan)]/8 border-[var(--cyan)]/25 text-[var(--text-1)] font-semibold hover:bg-[var(--cyan)]/15"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--cyan)] shrink-0" />
                            <div>
                              <p className="line-clamp-3 leading-normal text-slate-700 dark:text-slate-200">{notif.message}</p>
                              <span className="text-[8px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mt-1 block">City Coordinate Update</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile settings action */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  if (!profileDropdownOpen) setNotifDropdownOpen(false);
                  setProfileDropdownOpen(!profileDropdownOpen);
                }}
                className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200 dark:hover:border-gray-700/20 transition-all text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--indigo)] to-[var(--violet)] flex items-center justify-center text-white font-extrabold shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left ml-1">
                  <div className="font-semibold text-xs leading-tight">{user.name}</div>
                  <div className="text-[10px] text-gray-500 leading-none capitalize">{user.role}</div>
                </div>
                <ChevronDown className="w-3 nav-chevron h-3 text-[var(--text-2)] ml-0.5" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 glass rounded-2xl p-2 shadow-2xl border border-slate-200 dark:border-white/10 z-50 flex flex-col gap-0.5 text-left bg-white/95 dark:bg-slate-950/95">
                  <div className="p-2 border-b border-slate-200 dark:border-gray-700/20 mb-1">
                    <span className="block text-xs font-black leading-tight text-slate-800 dark:text-slate-100">{user.name}</span>
                    <span className="block text-[9px] text-[var(--cyan)] leading-tight mt-1 bg-[var(--cyan)]/10 px-2 py-0.5 rounded w-max font-extrabold tracking-wide uppercase">{user.xp} XP Points</span>
                  </div>

                  <button
                    onClick={() => { setActiveTab("dashboard"); setProfileDropdownOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:text-[var(--text-1)] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all w-full text-left"
                  >
                    <LayoutDashboard className="w-4 h-4 text-cyan-400" /> Dashboard Panel
                  </button>

                  <button
                    onClick={() => { setActiveTab("profile"); setProfileDropdownOpen(false); }}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:text-[var(--text-1)] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all w-full text-left"
                  >
                    <UserIcon className="w-4 h-4 text-[var(--cyan)]" /> Real-time Profile
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 p-2 rounded-lg text-xs text-[var(--red)] hover:bg-[var(--red)]/5 transition-all w-full text-left mt-1 border-t border-slate-200/50 dark:border-white/5 pt-1.5"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-100 dark:hover:bg-white/[0.04]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Full-Screen Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 p-5 z-40 flex flex-col gap-3 shadow-2xl glass border-b border-slate-200 dark:border-white/10 bg-white/98 dark:bg-[#0b0f19]/98 animate-fadeIn">
          
          {user && (
            <div className="p-3 mb-2 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--indigo)] to-[var(--violet)] flex items-center justify-center text-white font-black text-sm shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="block font-bold text-xs text-[var(--text-1)]">{user.name}</span>
                <span className="block text-[9px] text-[var(--cyan)] font-bold uppercase">{user.role} • {user.xp} XP</span>
              </div>
            </div>
          )}

          <button
            onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-2.5 border transition-all ${
              activeTab === "landing" 
                ? "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border-transparent"
            }`}
          >
            <Info className="w-4 h-4 text-[var(--cyan)]" /> About Platform
          </button>

          <button
            onClick={() => { setActiveTab("map"); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-2.5 border transition-all ${
              activeTab === "map" 
                ? "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border-transparent"
            }`}
          >
            <Map className="w-4 h-4 text-[var(--cyan)]" /> Interactive Map
          </button>

          <button
            onClick={() => { setActiveTab("telangana"); setMobileMenuOpen(false); }}
            className={`w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-2.5 border transition-all ${
              activeTab === "telangana" 
                ? "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border-transparent"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[var(--cyan)]" /> Telangana Hub
          </button>

          {user && (
            <>
              {user.role === ROLES.CITIZEN && (
                <button
                  onClick={() => { setActiveTab("report"); setMobileMenuOpen(false); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-left font-extrabold text-xs flex items-center gap-2.5 border transition-all ${
                    activeTab === "report" 
                      ? "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                      : "text-[var(--cyan)] hover:text-white hover:bg-[var(--cyan)]/10 border-transparent"
                  }`}
                >
                  <FileText className="w-4 h-4" /> File Incident Report
                </button>
              )}

              <button
                onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                className={`w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-2.5 border transition-all ${
                  activeTab === "dashboard" 
                    ? "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                    : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border-transparent"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[var(--cyan)]" /> 
                {user.role === ROLES.CITIZEN && "Citizen Panel"}
                {user.role === ROLES.FIELD_INSPECTOR && "Staff Terminal"}
                {user.role === ROLES.MUNICIPALITY_HQ && "HQ Executive Desk"}
              </button>

              <button
                onClick={() => { setActiveTab("profile"); setMobileMenuOpen(false); }}
                className={`w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-2.5 border transition-all ${
                  activeTab === "profile" 
                    ? "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                    : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5 border-transparent"
                }`}
              >
                <UserIcon className="w-4 h-4 text-[var(--cyan)]" /> Real-time Profile
              </button>

              <div className="border-t border-slate-200/50 dark:border-white/5 my-1" />

              <button
                onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-2.5 text-[var(--red)] hover:bg-[var(--red)]/5 border border-transparent transition-all"
              >
                <LogOut className="w-4 h-4" /> Sign Out from Node
              </button>
            </>
          )}

          {!user && (
            <button
              onClick={() => { setActiveTab("auth"); setMobileMenuOpen(false); }}
              className="w-full py-2.5 mt-1 bg-[var(--cyan)] text-slate-950 font-bold rounded-xl text-center shadow-lg text-xs hover:scale-102 active:scale-98 transition-transform"
            >
              Sign In / Get Started
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
