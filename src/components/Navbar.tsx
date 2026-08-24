import { useState, useEffect, useRef } from "react";
import { UserProfile, Notification } from "../types";
import { 
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
  Info,
  ShieldCheck,
  Home
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
  onOpenNotification: (issueId: string) => void;
  onOpenNotificationCenter?: () => void;
}

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  onOpenNotification,
  onOpenNotificationCenter
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
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { notifications } = useLiveNotifications(user?.uid, user?.role);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSignOut = async () => {
    localStorage.removeItem("nex_civic_simulated_user");
    await authService.logout();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    window.location.reload();
  };

  const handleNotificationClick = async (notif: Notification) => {
    setNotifDropdownOpen(false);
    if (notif.notificationId) {
      await markNotificationAsRead(notif.notificationId);
    }
    setActiveTab("dashboard");
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex items-center justify-between w-full border-b backdrop-blur-xl ${
        scrolled 
          ? "py-2.5 md:py-3 px-4 md:px-12 bg-[#0b0f19]/90 border-white/10 shadow-[inset_4px_4px_8px_rgba(255,255,255,0.06),0_12px_24px_rgba(0,0,0,0.35)]" 
          : "py-3 md:py-5 px-4 md:px-12 bg-slate-950/40 border-white/[0.04]"
      }`}>
        {/* Brand Logo */}
        <div 
          className="flex items-center cursor-pointer touch-target"
          onClick={() => setActiveTab("landing")}
        >
          <Logo size="sm" />
        </div>

        {/* Desktop Navigation Links */}
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

        {/* Right Utilities & Notifications */}
        <div className="flex items-center gap-2 md:gap-3">
          {user && (
            <>
              {/* Interactive Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    if (onOpenNotificationCenter) {
                      onOpenNotificationCenter();
                    } else {
                      if (!notifDropdownOpen) setProfileDropdownOpen(false);
                      setNotifDropdownOpen(!notifDropdownOpen);
                    }
                  }}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] relative transition-all touch-target flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-white font-extrabold animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="fixed md:absolute top-16 md:top-auto right-3 md:right-0 left-3 md:left-auto mt-2 w-[calc(100vw-1.5rem)] md:w-80 glass bg-[#0b0f19]/98 rounded-3xl p-4 shadow-2xl border border-white/10 z-50 text-left animate-zoomIn max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
                      <span className="font-display font-black text-xs uppercase tracking-wider text-indigo-400">Live Alerts</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-indigo-400 hover:underline font-bold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto flex flex-col gap-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-1.5">
                          <CheckCircle className="w-8 h-8 text-emerald-400/50" />
                          <span className="font-bold">You're all caught up!</span>
                          <span className="text-[10px] text-slate-400">No unread metropolitan notifications.</span>
                        </div>
                      ) : (
                        notifications.map((notif, idx) => (
                          <div
                            key={notif.notificationId || notif.id || `notif_${idx}`}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-xl text-xs cursor-pointer border transition-all ${
                              notif.read 
                                ? "bg-transparent border-transparent text-slate-350 hover:bg-white/[0.02]" 
                                : "bg-indigo-500/10 border-indigo-500/30 text-slate-100 font-semibold hover:bg-indigo-500/20"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              <div>
                                <p className="line-clamp-3 leading-normal text-slate-200">{notif.message}</p>
                                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mt-1 block">City Coordinate Update</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Profile Trigger */}
              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  onClick={() => {
                    if (!profileDropdownOpen) setNotifDropdownOpen(false);
                    setProfileDropdownOpen(!profileDropdownOpen);
                  }}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-gray-700/30 transition-all text-xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-extrabold shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left ml-1">
                    <div className="font-semibold text-xs leading-tight text-slate-100">{user.name}</div>
                    <div className="text-[10px] text-slate-400 leading-none capitalize">{user.role}</div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-2xl p-2 shadow-2xl border border-white/10 z-50 flex flex-col gap-0.5 text-left bg-slate-950/95">
                    <div className="p-2 border-b border-gray-800/40 mb-1">
                      <span className="block text-xs font-black leading-tight text-slate-100">{user.name}</span>
                      <span className="block text-[9px] text-indigo-400 leading-tight mt-1 bg-indigo-500/10 px-2 py-0.5 rounded w-max font-extrabold tracking-wide uppercase">{user.xp} XP Points</span>
                    </div>

                    <button
                      onClick={() => { setActiveTab("dashboard"); setProfileDropdownOpen(false); }}
                      className="flex items-center gap-2 p-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all w-full text-left"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Terminal Dashboard
                    </button>

                    <button
                      onClick={() => { setActiveTab("profile"); setProfileDropdownOpen(false); }}
                      className="flex items-center gap-2 p-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all w-full text-left"
                    >
                      <UserIcon className="w-4 h-4 text-indigo-400" /> Account Profile
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 p-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-all w-full text-left mt-1 border-t border-white/10 pt-1.5"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile Hamburger Trigger (<1024px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-slate-200 hover:bg-white/10 touch-target flex items-center justify-center transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-indigo-400" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* MOBILE SLIDE-OVER DRAWER (HAMBURGER MENU) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-over Content Drawer */}
          <div className="relative w-4/5 max-w-xs bg-[#0b0f19] border-l border-slate-800 h-full p-6 pt-20 flex flex-col justify-between z-50 shadow-2xl overflow-y-auto">
            <div className="flex flex-col gap-3">
              
              {user ? (
                <div className="p-3.5 mb-2 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-xs text-slate-100">{user.name}</span>
                    <span className="block text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{user.role} • {user.xp} XP</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 mb-2 rounded-2xl bg-slate-900/40 border border-slate-800 text-left">
                  <span className="text-xs font-bold text-slate-300">Welcome to NexCivic</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sign in to manage issues & track reports.</p>
                </div>
              )}

              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black text-left px-1 mt-2">
                Main Navigation
              </span>

              <button
                onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-3 border touch-target transition-all ${
                  activeTab === "landing" 
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-extrabold" 
                    : "text-slate-300 hover:bg-slate-900/50 border-transparent"
                }`}
              >
                <Home className="w-4 h-4 text-indigo-400" /> Home Overview
              </button>

              <button
                onClick={() => { setActiveTab("map"); setMobileMenuOpen(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-3 border touch-target transition-all ${
                  activeTab === "map" 
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-extrabold" 
                    : "text-slate-300 hover:bg-slate-900/50 border-transparent"
                }`}
              >
                <Map className="w-4 h-4 text-indigo-400" /> Smart Telemetry Map
              </button>

              <button
                onClick={() => { setActiveTab("telangana"); setMobileMenuOpen(false); }}
                className={`w-full py-3 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-3 border touch-target transition-all ${
                  activeTab === "telangana" 
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-extrabold" 
                    : "text-slate-300 hover:bg-slate-900/50 border-transparent"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Telangana State Hub
              </button>

              {user && (
                <>
                  {user.role === ROLES.CITIZEN && (
                    <button
                      onClick={() => { setActiveTab("report"); setMobileMenuOpen(false); }}
                      className={`w-full py-3 px-4 rounded-xl text-left font-extrabold text-xs flex items-center gap-3 border touch-target transition-all ${
                        activeTab === "report" 
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" 
                          : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                      }`}
                    >
                      <FileText className="w-4 h-4" /> File Incident Report
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                    className={`w-full py-3 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-3 border touch-target transition-all ${
                      activeTab === "dashboard" 
                        ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-extrabold" 
                        : "text-slate-300 hover:bg-slate-900/50 border-transparent"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" /> 
                    {user.role === ROLES.CITIZEN && "Citizen Panel"}
                    {user.role === ROLES.FIELD_INSPECTOR && "Staff Terminal"}
                    {user.role === ROLES.MUNICIPALITY_HQ && "HQ Executive Desk"}
                  </button>

                  <button
                    onClick={() => { setActiveTab("profile"); setMobileMenuOpen(false); }}
                    className={`w-full py-3 px-4 rounded-xl text-left font-bold text-xs flex items-center gap-3 border touch-target transition-all ${
                      activeTab === "profile" 
                        ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-extrabold" 
                        : "text-slate-300 hover:bg-slate-900/50 border-transparent"
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-indigo-400" /> Account Profile
                  </button>
                </>
              )}

              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black text-left px-1 mt-4">
                Secondary System
              </span>

              <button
                onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); }}
                className="w-full py-2.5 px-4 rounded-xl text-left font-semibold text-xs flex items-center gap-3 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent touch-target"
              >
                <Info className="w-4 h-4 text-slate-400" /> About & Security
              </button>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full py-3 px-4 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 touch-target"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { setActiveTab("auth"); setMobileMenuOpen(false); }}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold rounded-xl text-center shadow-lg text-xs touch-target"
                >
                  Sign In / Register
                </button>
              )}

              <span className="text-[9px] font-mono text-slate-400 text-center">
                NexCivic PWA v2.4 • Ward Node Active
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
