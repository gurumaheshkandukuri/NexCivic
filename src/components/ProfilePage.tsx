import { useState, useEffect, FormEvent } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  Briefcase, 
  ShieldCheck, 
  Edit3, 
  Save, 
  X, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  FileText, 
  AlertTriangle, 
  Sparkles,
  Calendar,
  Building
} from "lucide-react";
import { UserProfile, Issue } from "../types";
import { updateUserProfile } from "../dbService";
import { motion } from "motion/react";
import confetti from "canvas-confetti";

interface ProfilePageProps {
  user: UserProfile;
  issues: Issue[];
  onRefresh: () => Promise<void>;
  theme: "light" | "dark";
}

export default function ProfilePage({ user, issues, onRefresh, theme }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [address, setAddress] = useState(user.address || "");
  const [department, setDepartment] = useState(user.department || "");
  const [zone, setZone] = useState(user.zone || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if user changes externally
  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || "");
    setAddress(user.address || "");
    setDepartment(user.department || "");
    setZone(user.zone || "");
  }, [user]);

  // Real-time calculations from global issues state
  const myReports = issues.filter(issue => issue.reportedBy === user.id);
  const myReportsCount = myReports.length;
  const myResolvedReportsCount = myReports.filter(issue => issue.status === "Resolved").length;
  const myPendingReportsCount = myReports.filter(issue => issue.status !== "Resolved").length;

  const myAssignedIssues = issues.filter(issue => issue.assignedTo === user.id);
  const myAssignedCount = myAssignedIssues.length;
  const myResolvedCount = myAssignedIssues.filter(issue => issue.status === "Resolved").length;
  const myActiveCount = myAssignedIssues.filter(issue => issue.status === "In Progress" || issue.status === "Open").length;

  const badgeLevel = user.role === "Citizen"
    ? user.points >= 500 ? "Grand Civic Guardian"
      : user.points >= 250 ? "Metropolitan Sentinel"
      : user.points >= 100 ? "Active Steward"
      : "Civic Aspirant"
    : user.role === "Authority"
      ? "Authorized Field Officer"
      : "Senior Municipality HQ Director";

  const bannerColor = user.role === "Citizen"
    ? "from-cyan-500/20 via-indigo-500/10 to-violet-500/20"
    : user.role === "Authority"
      ? "from-indigo-500/20 via-purple-500/10 to-pink-500/20"
      : "from-amber-500/20 via-orange-500/10 to-red-500/20";

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = {
        name,
        phone,
        address,
        department,
        zone
      };
      await updateUserProfile(user.id, updates);
      
      // Update local storage representation to reflect immediately
      const savedUserJson = localStorage.getItem("nex_civic_simulated_user");
      if (savedUserJson) {
        const parsed = JSON.parse(savedUserJson);
        localStorage.setItem("nex_civic_simulated_user", JSON.stringify({ ...parsed, ...updates }));
      }
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      
      setIsEditing(false);
      await onRefresh();
    } catch (err) {
      console.error("Error saving profile changes:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      {/* Decorative Orbs inside the viewport bounds */}
      <div className="absolute top-20 -left-12 w-48 h-48 bg-gradient-to-tr from-cyan-400 to-indigo-400 rounded-full blur-[80px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-20 -right-12 w-48 h-48 bg-gradient-to-tr from-indigo-400 to-rose-400 rounded-full blur-[80px] opacity-10 pointer-events-none" />

      {/* Profile Header Canvas Card */}
      <div className={`relative rounded-3xl overflow-hidden glass border border-slate-200/60 dark:border-white/10 shadow-2xl mb-8 bg-gradient-to-br ${bannerColor} backdrop-blur-xl p-6 md:p-8 text-left`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar block */}
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-[var(--indigo)] to-[var(--violet)] flex items-center justify-center text-white text-3xl font-black shadow-xl ring-2 ring-white/20 dark:ring-white/10">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[var(--cyan)] text-slate-950 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full shadow-md tracking-wider">
                {user.role}
              </div>
            </div>

            {/* Profile Name & Level Info */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-display font-black text-[var(--text-1)] tracking-tight">
                  {user.name}
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                  {badgeLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user.email || "node-guest@nex_civic.gov"}
              </p>
              
              {user.role === "Citizen" && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-[var(--cyan)] font-mono tracking-wider">
                    {user.points} XP Accumulation
                  </span>
                  <div className="w-20 md:w-28 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (user.points / 600) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-1)] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Information
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-[var(--text-2)] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time calculated telemetry statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {user.role === "Citizen" ? (
          <>
            <div className="glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-950/10 text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-cyan-400" /> Incidents Filed
              </span>
              <span className="text-2xl font-display font-black text-[var(--text-1)]">{myReportsCount}</span>
              <span className="block text-[10px] text-slate-400 mt-1">Direct community reports</span>
            </div>
            
            <div className="glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-950/10 text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Resolved Successfully
              </span>
              <span className="text-2xl font-display font-black text-emerald-400">{myResolvedReportsCount}</span>
              <span className="block text-[10px] text-slate-400 mt-1">SLA verification approved</span>
            </div>

            <div className="glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-950/10 text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-indigo-400" /> Earned Badges
              </span>
              <span className="text-2xl font-display font-black text-indigo-400">{user.badges?.length || 1}</span>
              <span className="block text-[10px] text-slate-400 mt-1">Honorary civic rankings</span>
            </div>
          </>
        ) : (
          <>
            <div className="glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-950/10 text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-rose-400" /> Total Active Ops
              </span>
              <span className="text-2xl font-display font-black text-rose-400">{myActiveCount}</span>
              <span className="block text-[10px] text-slate-400 mt-1">Assigned cases needing action</span>
            </div>

            <div className="glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-950/10 text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Resolved Actions
              </span>
              <span className="text-2xl font-display font-black text-green-400">{myResolvedCount}</span>
              <span className="block text-[10px] text-slate-400 mt-1">Operations signed off</span>
            </div>

            <div className="glass rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-950/10 text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Response Rating
              </span>
              <span className="text-2xl font-display font-black text-amber-500">98% SLA</span>
              <span className="block text-[10px] text-slate-400 mt-1">Averages under 18 hours</span>
            </div>
          </>
        )}
      </div>

      {/* Main split grid: Profile info editing vs. active case records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        {/* Left Side: Profile Information Box */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass rounded-3xl p-6 border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-slate-950/10 flex flex-col gap-5">
            <h2 className="font-display font-black text-sm uppercase text-[var(--text-1)] flex items-center gap-1.5 border-b border-slate-200 dark:border-white/5 pb-3">
              <ShieldCheck className="w-4 h-4 text-[var(--cyan)]" /> Credentials Details
            </h2>

            {isEditing ? (
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-450">Display Tag Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="p-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 outline-none focus:border-[var(--cyan)] text-[var(--text-1)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-450">Phone Link</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="p-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 outline-none focus:border-[var(--cyan)] text-[var(--text-1)]"
                  />
                </div>

                {user.role !== "Citizen" ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-450">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Road Works"
                      className="p-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 outline-none focus:border-[var(--cyan)] text-[var(--text-1)]"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-450">Primary Zone</label>
                    <input
                      type="text"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      placeholder="e.g., Ward 4 - Gachibowli"
                      className="p-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 outline-none focus:border-[var(--cyan)] text-[var(--text-1)]"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-450">Mailing Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Physical residential or office office address"
                    rows={3}
                    className="p-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-gray-800 outline-none focus:border-[var(--cyan)] text-[var(--text-1)] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 bg-[var(--cyan)] text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition-all text-center"
                >
                  <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Commit Secure Update"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400 font-medium">Official ID Badge</span>
                  <span className="font-mono text-[var(--cyan)] font-extrabold uppercase">NC-2026-{user.id.substring(0, 5).toUpperCase()}</span>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Direct Line</span>
                  <span className="text-[var(--text-1)] font-bold">{user.phone || "Not linked"}</span>
                </div>

                {user.role !== "Citizen" ? (
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-white/5">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Division Dept</span>
                    <span className="text-[var(--text-1)] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-500/20">{user.department || "Municipal Core Admin"}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-white/5">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Regional Area</span>
                    <span className="text-[var(--text-1)] font-bold capitalize">{user.zone || "Telangana Central"}</span>
                  </div>
                )}

                <div className="flex items-start justify-between pb-2.5 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5 animate-bounce" /> Location GPS</span>
                  <span className="text-[var(--text-1)] text-right font-medium max-w-[150px] leading-relaxed line-clamp-3">{user.address || "Hyderabad Urban Area"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Stationed Since</span>
                  <span className="text-slate-500 font-mono text-[10px]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "June 2026"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Your Live Case Files */}
        <div className="lg:col-span-7">
          <div className="glass rounded-3xl p-6 border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-slate-950/10 flex flex-col gap-4">
            <h2 className="font-display font-black text-sm uppercase text-[var(--text-1)] flex items-center gap-1.5 border-b border-slate-200 dark:border-white/5 pb-3">
              <TrendingUp className="w-4 h-4 text-[var(--cyan)]" /> 
              {user.role === "Citizen" ? "Your Real-Time Field Incident Logs" : "Your Active Case Operation Files"}
            </h2>

            <div className="max-h-96 overflow-y-auto flex flex-col gap-3 pr-1">
              {user.role === "Citizen" ? (
                myReports.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                    <Sparkles className="w-8 h-8 text-cyan-400/30" />
                    <span className="font-bold text-xs">No active reports filed under your credentials</span>
                    <span className="text-[10px] text-slate-500">File a civic incident at the File Incident tab above.</span>
                  </div>
                ) : (
                  myReports.map((report) => (
                    <div 
                      key={report.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-4 shadow-sm hover:border-[var(--cyan)]/20 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--text-1)] line-clamp-1">{report.title}</span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            report.priority === "Critical" ? "bg-red-500/10 text-red-400"
                              : report.priority === "High" ? "bg-orange-500/10 text-orange-400"
                                : "bg-cyan-500/10 text-cyan-400"
                          }`}>
                            {report.priority}
                          </span>
                        </div>
                        <span className="block text-[9px] text-slate-400 mt-1">{report.category} • {report.address || report.location}</span>
                      </div>
                      
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-full ${
                        report.status === "Resolved" ? "bg-emerald-500/10 text-emerald-400"
                          : report.status === "In Progress" ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  ))
                )
              ) : (
                myAssignedIssues.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                    <Sparkles className="w-8 h-8 text-indigo-400/30" />
                    <span className="font-bold text-xs">No active duty cases assigned to you</span>
                    <span className="text-[10px] text-slate-500">HQ Directors distribute workloads or select items from active pools.</span>
                  </div>
                ) : (
                  myAssignedIssues.map((report) => (
                    <div 
                      key={report.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-4 shadow-sm hover:border-[var(--cyan)]/20 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--text-1)] line-clamp-1">{report.title}</span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            report.priority === "Critical" ? "bg-red-500/10 text-red-500"
                              : report.priority === "High" ? "bg-orange-400/10 text-orange-400"
                                : "bg-cyan-400/10 text-cyan-400"
                          }`}>
                            {report.priority}
                          </span>
                        </div>
                        <span className="block text-[9px] text-slate-400 mt-1">Reporter: {report.reporterName} • {report.address || report.location}</span>
                      </div>
                      
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-full ${
                        report.status === "Resolved" ? "bg-emerald-500/10 text-emerald-400"
                          : report.status === "In Progress" ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
