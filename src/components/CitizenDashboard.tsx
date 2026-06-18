import React, { useState } from "react";
import { 
  Award, 
  Trash2, 
  Edit2, 
  Eye, 
  MessageSquare, 
  Star, 
  Clock, 
  CheckCircle2, 
  Settings,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  TrendingUp,
  Search
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Issue, UserProfile } from "../types";
import { addCommentToIssue, submitIssueRating } from "../dbService";

interface CitizenDashboardProps {
  user: UserProfile;
  issues: Issue[];
  onRefresh: () => void;
}

export default function CitizenDashboard({ user, issues, onRefresh }: CitizenDashboardProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState("");

  const myIssues = issues.filter(i => i.reportedBy === user.id);
  
  const filteredMyIssues = myIssues.filter((issue) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const categoryMatch = (issue.category || "").toLowerCase().includes(q);
    const landmarkMatch = (issue.address || "").toLowerCase().includes(q);
    const titleMatch = (issue.title || "").toLowerCase().includes(q);
    const statusMatch = (issue.status || "").toLowerCase().includes(q);
    
    return categoryMatch || landmarkMatch || titleMatch || statusMatch;
  });

  const resolvedIssuesCount = myIssues.filter(i => i.status === "Resolved").length;

  const currentBadges = user.badges || [];
  
  // Custom definitions for badges matching request layout
  const allBadges = [
    { id: "First Reporter", title: "First Reporter", description: "Earned by filing your very first platform report.", criteria: "reportCount >= 1" },
    { id: "Reporter", title: "Reporter", description: "Earned by filing 5 verified civic reports.", criteria: "reportCount >= 5" },
    { id: "Civic Hero", title: "Civic Hero", description: "Earned by filing 25 verified civic reports.", criteria: "reportCount >= 25" },
    { id: "Legend", title: "Legend", description: "Earned by filing 100 verified civic reports.", criteria: "reportCount >= 100" },
    { id: "Rising Star", title: "Rising Star", description: "Accumulate 100 active XP points in total.", criteria: "points >= 100" },
    { id: "Power User", title: "Power User", description: "Accumulate 500 active XP points in total.", criteria: "points >= 500" },
    { id: "Champion", title: "Champion", description: "Accumulate 1000 active XP points in total.", criteria: "points >= 1000" }
  ];

  const handleAddComment = async (issueId: string) => {
    if (!commentText.trim()) return;
    await addCommentToIssue(issueId, {
      userId: user.id,
      name: user.name,
      text: commentText
    });
    setCommentText("");
    
    // Refresh local details mock
    const updated = issues.find(i => i.id === issueId);
    if (updated) {
      setSelectedIssue({ 
        ...updated, 
        comments: [...updated.comments, { 
          id: String(Math.random()), 
          userId: user.id, 
          name: user.name, 
          text: commentText, 
          createdAt: new Date().toISOString() 
        }] 
      });
    }
  };

  const handleSubmitRating = async (issueId: string) => {
    await submitIssueRating(issueId, rating);
    if (selectedIssue) {
      setSelectedIssue({ ...selectedIssue, rating });
    }
    onRefresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      
      {/* Overview stats cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 text-left">
        <div className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-2)]">My reports</span>
            <span className="text-3xl font-display font-extrabold text-[var(--text-1)] block mt-1">
              {myIssues.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--cyan)]/5 flex items-center justify-center text-[var(--cyan)]">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-2)]">Resolved</span>
            <span className="text-3xl font-display font-extrabold text-[var(--green)] block mt-1">
              {resolvedIssuesCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[var(--green)]/5 flex items-center justify-center text-[var(--green)]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-2)]">Earned XP Points</span>
            <span className="text-3xl font-display font-extrabold text-amber-400 block mt-1">
              {user.points} XP
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-400/5 flex items-center justify-center text-amber-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-2)]">My Rank</span>
            <span className="text-3xl font-display font-extrabold text-purple-400 block mt-1">
              #{(user.points > 200) ? "1" : (user.points > 100) ? "2" : "3"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-400/5 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main issues Table block */}
        <div className="lg:col-span-8 flex flex-col gap-6 text-left">
          <div className="glass rounded-3xl p-6 border border-gray-700/10 overflow-hidden shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-700/20 pb-3 mb-4">
              <span className="font-display font-bold text-sm text-[var(--text-1)]">
                Issues Submitted By Me
              </span>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search category, landmark, etc..."
                  className="pl-9 pr-4 py-1.5 bg-[rgba(255,255,255,0.02)] border border-gray-700/40 rounded-xl outline-none text-xs focus:border-[var(--cyan)] w-full transition-all text-[var(--text-1)]"
                />
              </div>
            </div>

            {filteredMyIssues.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-3)]">
                {myIssues.length === 0 
                  ? "You haven't reported any issues yet. Click on 'Report Issue' above to begin!"
                  : "No reported issues match your search query."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-semibold">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700/15">
                      <th className="py-3 font-normal text-left">Title</th>
                      <th className="py-3 font-normal text-left">Category</th>
                      <th className="py-3 font-normal text-left">Priority</th>
                      <th className="py-3 font-normal text-left">Status</th>
                      <th className="py-3 font-normal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMyIssues.map((issue) => (
                      <tr key={issue.id} className="border-b border-gray-700/10 hover:bg-[rgba(255,255,255,0.01)] transition-all">
                        <td className="py-3 text-[var(--text-1)] font-bold max-w-[180px] truncate">
                          {issue.title}
                        </td>
                        <td className="py-3 text-[var(--text-2)]">
                          <div>{issue.category}</div>
                          {issue.suggestedDepartment && (
                            <span className="text-[8px] font-mono font-bold text-purple-400 bg-purple-500/5 px-1 py-0.5 rounded border border-purple-500/10 mt-0.5 inline-block">
                              {issue.suggestedDepartment}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            issue.priority === "Critical" ? "bg-[var(--red)]/10 text-[var(--red)]" 
                            : issue.priority === "High" ? "bg-[var(--orange)]/10 text-[var(--orange)]"
                            : issue.priority === "Medium" ? "bg-[var(--yellow)]/10 text-[var(--yellow)]"
                            : "bg-[var(--green)]/10 text-[var(--green)]"
                          }`}>
                            {issue.priority}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-[9px] font-extrabold border ${
                            issue.status === "Resolved" ? "bg-[var(--green)]/5 border-[var(--green)]/20 text-[var(--green)]"
                            : issue.status === "In Progress" ? "bg-[var(--blue)]/5 border-[var(--blue)]/20 text-[var(--blue)]"
                            : "bg-gray-500/5 border-gray-700/20 text-[var(--text-2)]"
                          }`}>
                            {issue.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setSelectedIssue(issue)}
                            className="p-1 px-3 bg-[var(--cyan)]/10 hover:bg-[var(--cyan)]/20 text-[var(--cyan)] rounded-lg font-bold hover:scale-103 transition-all inline-flex items-center gap-1 cursor-pointer text-[10px]"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right sub-panel - Badges */}
        <div className="lg:col-span-4 flex flex-col gap-6 text-left">
          
          {/* Status Distribution Doughnut Chart */}
          <div className="glass rounded-3xl p-6 border border-gray-700/10 shadow-2xl">
            <span className="font-display font-bold text-sm text-[var(--text-1)] mb-4 block border-b border-gray-700/10 pb-3 flex items-center justify-between">
              <span>My Reports Status Distribution</span>
              <TrendingUp className="w-4 h-4 text-[var(--cyan)]" />
            </span>
            
            {(() => {
              const openCount = myIssues.filter(i => i.status === "Open").length;
              const inProgressCount = myIssues.filter(i => i.status === "In Progress").length;
              const resolvedCount = myIssues.filter(i => i.status === "Resolved").length;

              const chartData = [
                { name: "Open / Pending", value: openCount, color: "#94a3b8" },
                { name: "In Progress", value: inProgressCount, color: "#38bdf8" },
                { name: "Resolved", value: resolvedCount, color: "#34d399" }
              ];

              const totalCount = openCount + inProgressCount + resolvedCount;
              const hasData = totalCount > 0;
              const displayChartData = hasData ? chartData.filter(d => d.value > 0) : [
                { name: "No Data", value: 1, color: "rgba(148, 163, 184, 0.1)" }
              ];

              return (
                <>
                  <div className="h-44 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={hasData ? 3 : 0}
                          dataKey="value"
                        >
                          {displayChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          cursor={false}
                          contentStyle={{ backgroundColor: "#060a15", borderColor: "#1e293b", borderRadius: "12px", fontSize: "11px" }}
                          itemStyle={{ color: "#ffffff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-black font-display text-[var(--text-1)]">
                        {totalCount}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Reports</span>
                    </div>
                  </div>

                  {hasData ? (
                    <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-semibold text-center pb-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mx-auto" />
                        <span className="text-slate-400 mt-1 uppercase text-[8px] font-bold">Open</span>
                        <span className="font-sans text-xs text-[var(--text-1)]">{openCount}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 mx-auto" />
                        <span className="text-sky-400 mt-1 uppercase text-[8px] font-bold">In-Progress</span>
                        <span className="font-sans text-xs text-[var(--text-1)]">{inProgressCount}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mx-auto" />
                        <span className="text-emerald-400 mt-1 uppercase text-[8px] font-bold">Resolved</span>
                        <span className="font-sans text-xs text-[var(--text-1)]">{resolvedCount}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 text-center italic mt-2">
                      No reports submitted yet. Submit a civic report to track your real-time status.
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          <div className="glass rounded-3xl p-6 border border-gray-700/10 shadow-2xl">
            <span className="font-display font-bold text-sm text-[var(--text-1)] mb-4 block border-b border-gray-700/10 pb-3">
              Badge collection achievement
            </span>

            <div className="flex flex-col gap-4">
              {allBadges.map((badge) => {
                const isEarned = currentBadges.includes(badge.id);
                return (
                  <div 
                    key={badge.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      isEarned 
                        ? "bg-amber-400/[0.02] border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]" 
                        : "bg-transparent border-gray-700/20 opacity-55"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isEarned ? "bg-amber-400/15 text-amber-400" : "bg-gray-500/10 text-gray-400"
                    }`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className={`block font-bold text-xs ${isEarned ? "text-amber-300" : "text-gray-400"}`}>
                        {badge.title} {isEarned && "🏆"}
                      </span>
                      <p className="text-[10px] text-[var(--text-2)] leading-relaxed mt-0.5">
                        {badge.description}
                      </p>
                      <span className="text-[8px] font-mono font-bold uppercase text-gray-500 mt-1 block">
                        Criteria: {badge.criteria}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* DETAIL MODAL WITH PROGRESS TIMELINE */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="glass max-w-2xl w-full rounded-3xl p-6 border border-slate-200/50 dark:border-white/10 max-h-[90vh] overflow-y-auto flex flex-col gap-5 text-left relative">
            <button
              onClick={() => setSelectedIssue(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.03)] transition-all"
            >
              ✕
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--cyan)] font-mono flex items-center gap-2 flex-wrap">
                <span>{selectedIssue.category || "General Incident"}</span>
                <span>•</span>
                <span>Reference: #{selectedIssue.id.split("_").pop()}</span>
                {selectedIssue.suggestedDepartment && (
                  <>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold uppercase text-[8px] border border-purple-500/20">Routed: {selectedIssue.suggestedDepartment}</span>
                  </>
                )}
              </span>
              <h3 className="font-display font-extrabold text-xl md:text-2xl text-[var(--text-1)] mt-1">
                {selectedIssue.title}
              </h3>
              <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
                "{selectedIssue.description}"
              </p>
            </div>

            {selectedIssue.resolutionNotes && (
              <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/15 text-left">
                <span className="text-[10px] uppercase font-bold text-orange-400 font-mono tracking-wider block mb-1">
                  ⚠️ Official Inspector Inspection & Resolution Notes
                </span>
                <p className="text-xs text-[var(--text-1)] leading-relaxed italic">
                  "{selectedIssue.resolutionNotes}"
                </p>
              </div>
            )}

            {/* Chronological Action & Status Timeline */}
            <div className="bg-[rgba(255,255,255,0.01)] p-5 rounded-2xl border border-gray-700/10 flex flex-col gap-4">
              <span className="text-[10px] uppercase font-bold text-[var(--text-2)] flex items-center gap-1.5 font-mono tracking-wider">
                <Clock className="w-4 h-4 text-[var(--cyan)] animate-pulse" /> Chronological Updates & Action History
              </span>

              <div className="relative border-l border-gray-700/30 ml-3 pl-6 flex flex-col gap-5 py-2">
                {(() => {
                  const formatTimestamp = (ts: any): string => {
                    if (!ts) return "";
                    if (typeof ts === "string") {
                      return new Date(ts).toLocaleString();
                    }
                    if (ts.toDate && typeof ts.toDate === "function") {
                      return ts.toDate().toLocaleString();
                    }
                    if (ts.seconds) {
                      return new Date(ts.seconds * 1000).toLocaleString();
                    }
                    return new Date(ts).toLocaleString();
                  };

                  const items: Array<{
                    id: string;
                    type: "creation" | "status" | "comment";
                    title: string;
                    text: string;
                    actor: string;
                    role: "Reporter" | "Authority" | "Citizen";
                    timestamp: any;
                  }> = [];

                  // 1. Creation event
                  if (selectedIssue.createdAt) {
                    items.push({
                      id: "creation",
                      type: "creation",
                      title: "Report Submitted",
                      text: `Issue initially filed: "${selectedIssue.title}"`,
                      actor: selectedIssue.reporterName || "Resident",
                      role: "Reporter",
                      timestamp: selectedIssue.createdAt,
                    });
                  }

                  // 2. Acknowledged (In Progress) status transition
                  if (selectedIssue.acknowledgedAt) {
                    items.push({
                      id: "acknowledged",
                      type: "status",
                      title: "Status Transition: In Progress",
                      text: "The report has been formally acknowledged and assigned to field crews for on-site correction.",
                      actor: selectedIssue.assignedToName || "Area Authority Inspector",
                      role: "Authority",
                      timestamp: selectedIssue.acknowledgedAt,
                    });
                  }

                  // 3. Resolved status transition
                  if (selectedIssue.resolvedAt) {
                    items.push({
                      id: "resolved",
                      type: "status",
                      title: "Status Transition: Resolved",
                      text: "Municipal works completed. The issue has been marked resolved on site.",
                      actor: selectedIssue.assignedToName || "Administrative Team",
                      role: "Authority",
                      timestamp: selectedIssue.resolvedAt,
                    });
                  }

                  // 4. Comments thread (citizen & authorities comments)
                  if (selectedIssue.comments && Array.isArray(selectedIssue.comments)) {
                    selectedIssue.comments.forEach((com) => {
                      const isAuth = 
                        com.name.toLowerCase().includes("inspector") || 
                        com.name.toLowerCase().includes("officer") || 
                        com.name.toLowerCase().includes("commissioner") || 
                        com.name.toLowerCase().includes("manager") ||
                        com.userId.startsWith("auth") || 
                        com.userId === "manager" ||
                        com.userId === selectedIssue.assignedTo;

                      items.push({
                        id: `com_${com.id || Math.random()}`,
                        type: "comment",
                        title: isAuth ? "Authority Response Note" : "Comment Posted",
                        text: com.text,
                        actor: com.name,
                        role: isAuth ? "Authority" : (com.userId === selectedIssue.reportedBy ? "Reporter" : "Citizen"),
                        timestamp: com.createdAt,
                      });
                    });
                  }

                  // Sort chronologically (oldest first so history reads downward naturally)
                  items.sort((a, b) => {
                    const getMs = (val: any) => {
                      if (!val) return 0;
                      if (typeof val === "string") return new Date(val).getTime();
                      if (val.toDate && typeof val.toDate === "function") return val.toDate().getTime();
                      if (val.seconds) return val.seconds * 1000;
                      return new Date(val).getTime();
                    };
                    return getMs(a.timestamp) - getMs(b.timestamp);
                  });

                  if (items.length === 0) {
                    return <span className="text-[10px] text-gray-500 italic">No action history logs yet.</span>;
                  }

                  return items.map((item) => {
                    const isAuthority = item.role === "Authority";
                    const formattedTime = formatTimestamp(item.timestamp);

                    return (
                      <div key={item.id} className="relative group/item text-left">
                        {/* Timeline Circle indicator */}
                        <div className={`absolute -left-[32px] top-1 w-3 h-3 rounded-full border bg-slate-950 flex items-center justify-center transition-all ${
                          item.type === "creation" 
                            ? "border-[var(--cyan)] shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
                            : item.type === "status"
                              ? item.title.includes("Resolved") ? "border-[var(--green)] shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "border-[var(--blue)] shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                              : "border-[var(--violet)] shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                        }`} />

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`font-display font-bold text-xs ${
                              item.type === "creation" 
                                ? "text-[var(--cyan)]" 
                                : item.type === "status"
                                  ? item.title.includes("Resolved") ? "text-[var(--green)]" : "text-[var(--blue)]"
                                  : "text-purple-300"
                            }`}>
                              {item.title}
                            </span>
                            <span className="text-[8px] font-mono font-medium text-gray-500">
                              {formattedTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-400 font-semibold">
                              By {item.actor}
                            </span>
                            {isAuthority && (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/10 text-[7px] font-mono font-bold uppercase rounded">
                                Official Authority
                              </span>
                            )}
                            {!isAuthority && item.role === "Reporter" && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-[7px] font-mono font-bold uppercase rounded">
                                Reporter
                              </span>
                            )}
                            {!isAuthority && item.role === "Citizen" && (
                              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 text-[7px] font-mono font-bold uppercase rounded">
                                Resident Citizen
                              </span>
                            )}
                          </div>

                          {item.text && (
                            <p className={`mt-1 text-[11px] leading-relaxed p-2.5 rounded-xl border ${
                              isAuthority 
                                ? "bg-red-550/[0.02] border-red-500/15 text-gray-200" 
                                : "bg-gray-500/5 border-gray-700/10 text-gray-300"
                            }`}>
                              {item.text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* If resolved before/after visual proof */}
            {selectedIssue.status === "Resolved" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-left">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Before photo</span>
                  <div className="h-32 bg-gray-500/10 rounded-xl flex items-center justify-center text-[10px] italic text-gray-500 border border-gray-700/20 overflow-hidden">
                    {selectedIssue.beforePhotoUrl || selectedIssue.imageUrl ? (
                      <img src={selectedIssue.beforePhotoUrl || selectedIssue.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      "No before photo provided"
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">After photo (Administrative Proof)</span>
                  <div className="h-32 bg-gray-500/10 rounded-xl flex items-center justify-center text-[10px] italic text-gray-500 border border-gray-700/20 overflow-hidden">
                    {selectedIssue.afterPhotoUrl ? (
                      <img src={selectedIssue.afterPhotoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center gap-1.5 p-3 text-center">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Work completed. Uploading check logs...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rating Section if Resolved */}
            {selectedIssue.status === "Resolved" && selectedIssue.rating === null && (
              <div className="p-4 bg-[var(--green)]/5 rounded-2xl border border-[var(--green)]/15 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[var(--green)]">Provide Resolution Satisfaction rating:</span>
                  <div className="flex gap-1.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-sm ${rating >= star ? "text-yellow-400" : "text-gray-600"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmitRating(selectedIssue.id)}
                  className="px-4 py-2 bg-[var(--green)] text-slate-950 font-bold rounded-xl text-[10px] cursor-pointer"
                >
                  Submit Rating
                </button>
              </div>
            )}

            {/* Chat Input Comment Action */}
            {selectedIssue.status !== "Resolved" && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-[var(--text-2)] flex items-center gap-1.5 font-mono">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--cyan)]" /> Post Communication Update / Comment
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type comments or inspect feedback updates..."
                    className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-gray-700/50 focus:border-[var(--cyan)] outline-none text-[11px] text-[var(--text-1)] flex-grow"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleAddComment(selectedIssue.id);
                      onRefresh();
                    }}
                    className="px-4 py-2 bg-[var(--cyan)] hover:scale-103 transition-transform text-slate-950 font-bold rounded-xl text-[10px] cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
