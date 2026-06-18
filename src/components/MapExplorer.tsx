import { useState, useEffect } from "react";
import { 
  Search, 
  Sparkles, 
  Filter, 
  MapPin, 
  Flame, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2, 
  X,
  Plus
} from "lucide-react";
import { Issue, UserProfile } from "../types";
import InteractiveMap from "./InteractiveMap";
import { confirmIssue } from "../dbService";
import TelanganaDashboard from "./TelanganaDashboard";

interface MapExplorerProps {
  issues: Issue[];
  user: UserProfile | null;
  onRefresh: () => void;
}

export default function MapExplorer({ issues, user, onRefresh }: MapExplorerProps) {
  const [viewMode, setViewMode] = useState<"incidents" | "telangana">("incidents");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedZone, setSelectedZone] = useState("All");
  const [showHeatmap, setShowHeatmap] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    // Search matching Title/Description/District
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "All" || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || issue.status === selectedStatus;
    const matchesPriority = selectedPriority === "All" || issue.priority === selectedPriority;
    const matchesZone = selectedZone === "All" || issue.zone === selectedZone;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesZone;
  });

  const handleConfirmAction = async (issueId: string) => {
    if (!user) {
      alert("Please log in to confirm and upvote this issue.");
      return;
    }
    await confirmIssue(issueId, user.id, user.name);
    onRefresh();

    // Refresh details modal local references
    const updated = issues.find(i => i.id === issueId);
    if (updated) setSelectedIssue(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col text-left">
      
      {/* Top Toggle Switch */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/40 pb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-[var(--text-1)] tracking-tight">
            Smart Map Explorer
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Toggle between local community incident maps and state-wide administrative analytics.</p>
        </div>

        <div className="inline-flex p-1 bg-[#080d1e]/80 border border-gray-800/85 rounded-2xl gap-1 shadow-inner self-start sm:self-center">
          <button
            onClick={() => setViewMode("incidents")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "incidents" 
                ? "bg-[var(--cyan)]/15 text-[var(--cyan)] border border-[var(--cyan)]/20 font-extrabold" 
                : "text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            🗺️ Incident Tracker Map
          </button>
          <button
            onClick={() => setViewMode("telangana")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "telangana" 
                ? "bg-[var(--cyan)]/15 text-[var(--cyan)] border border-[var(--cyan)]/20 font-extrabold" 
                : "text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            📊 Telangana State Analyzer Map
          </button>
        </div>
      </div>

      {viewMode === "telangana" ? (
        <div className="animate-fadeIn">
          <TelanganaDashboard />
        </div>
      ) : (
        <div className="h-[calc(100vh-170px)] flex flex-col lg:grid lg:grid-cols-12 gap-6 text-left animate-fadeIn">
      
      {/* Left side Filter & List explorer - ColSpan 4 */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
        
        {/* Header summary info */}
        <div className="bg-[rgba(255,255,255,0.01)] border border-gray-700/10 p-4 rounded-2xl">
          <span className="block font-display font-bold text-sm text-[var(--text-1)]">
            Explore Active Incidents
          </span>
          <span className="block text-[10px] text-gray-500 mt-0.5">
            Showing {filteredIssues.length} of {issues.length} active civic issues
          </span>
        </div>

        {/* Filters Panel */}
        <div className="glass p-4 rounded-2xl border border-[rgba(255,255,255,0.06)] flex flex-col gap-3">
          
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by street, landmark, text..."
              className="pl-9 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-gray-700/50 focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 rounded-lg bg-[var(--bg-void)] border border-gray-700/50 text-[10px] text-[var(--text-1)] outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Pothole">Potholes</option>
              <option value="Garbage Overflow">Garbage</option>
              <option value="Water Leakage">Water Leaks</option>
              <option value="Street Light">Street Lights</option>
              <option value="Drainage">Drainage</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-2 rounded-lg bg-[var(--bg-void)] border border-gray-700/50 text-[10px] text-[var(--text-1)] outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Futuristic Glowing Heatmap Toggle Switch */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/20 transition-all mt-1">
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 transition-all ${showHeatmap ? "text-orange-500 animate-pulse scale-110" : "text-gray-500"}`} />
              <div className="text-left">
                <span className="block text-xs font-bold text-[var(--text-1)]">Thermal Heatmap</span>
                <span className="block text-[8px] text-gray-400">Plot report density concentration</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-orange-500/20 transition-colors duration-200 ease-in-out focus:outline-none ${
                showHeatmap ? "bg-orange-500/90 shadow-[0_0_12px_rgba(249,115,22,0.5)]" : "bg-gray-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 mt-0.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showHeatmap ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

        </div>

        {/* Scrollable list items details */}
        <div className="flex-grow overflow-y-auto flex flex-col gap-2.5 max-h-[50vh] lg:max-h-[60vh] pr-1">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500 italic">No matching issues visible.</div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className={`p-3 rounded-2xl glass-interactive hover:scale-1 w-full text-left cursor-pointer border flex flex-col gap-2 ${
                  selectedIssue?.id === issue.id 
                    ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.02]" 
                    : "border-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--cyan)]">{issue.category}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${
                    issue.priority === "Critical" ? "bg-[var(--red)]" 
                    : issue.priority === "High" ? "bg-[var(--orange)]"
                    : issue.priority === "Medium" ? "bg-amber-400"
                    : "bg-[var(--green)]"
                  }`}>
                    {issue.priority}
                  </span>
                </div>

                <div className="font-extrabold text-xs text-[var(--text-1)] leading-snug line-clamp-1">{issue.title}</div>
                <div className="text-[10px] text-[var(--text-2)] line-clamp-2 leading-relaxed">"{issue.description}"</div>

                <div className="flex items-center justify-between border-t border-gray-700/10 pt-2 text-[9px] text-gray-500 mt-1">
                  <span>📍 {issue.address?.split(',').slice(0, 2).join(', ') || issue.zone}</span>
                  <span className="font-bold text-[var(--text-1)] bg-gray-700/20 px-1.5 py-0.5 rounded-md">
                     👥 {issue.confirmCount} votes
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Right side interactive Map space - ColSpan 8 */}
      <div className="lg:col-span-8 relative flex flex-col gap-4 h-full">
        <InteractiveMap 
          issues={filteredIssues}
          selectedIssueId={selectedIssue?.id}
          onSelectIssue={(issue) => setSelectedIssue(issue)}
          height="100%"
          showHeatmap={showHeatmap}
        />

        {/* Floating pop-up overlay if details selected */}
        {selectedIssue && (
          <div className="absolute bottom-4 left-4 right-4 glass rounded-3xl p-4 border border-[rgba(255,255,255,0.08)] z-30 shadow-2xl flex flex-col gap-3 text-left">
            <button
              onClick={() => setSelectedIssue(null)}
              className="absolute top-3 right-3 p-1.5 text-xs text-gray-500 hover:text-white rounded-md"
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono uppercase bg-[var(--cyan)]/10 text-[var(--cyan)] px-2 py-0.5 rounded-md">
                  {selectedIssue.category}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Reference: #{selectedIssue.id.split("_").pop()}</span>
              </div>
              <h4 className="font-bold text-sm text-[var(--text-1)] mt-1.5">{selectedIssue.title}</h4>
              <p className="text-[11px] text-[var(--text-2)] mt-0.5 leading-relaxed line-clamp-2">"{selectedIssue.description}"</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono text-gray-500 border-y border-gray-700/10 py-2">
              <div>
                <span>ZONE:</span> <strong className="text-[var(--text-1)] block font-sans">{selectedIssue.zone}</strong>
              </div>
              <div>
                <span>COORDINATES:</span> <strong className="text-[var(--text-1)] block">{selectedIssue.lat.toFixed(4)}, {selectedIssue.lng.toFixed(4)}</strong>
              </div>
              <div>
                <span>STATUS:</span> <strong className="text-[var(--text-1)] block font-sans capitalize">{selectedIssue.status}</strong>
              </div>
              <div>
                <span>UPVOTES:</span> <strong className="text-[var(--text-1)] block">{selectedIssue.confirmCount} confirmations</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && user.role === "Citizen" && !selectedIssue.confirmations.some(c => c.userId === user.id) ? (
                <button
                  type="button"
                  onClick={() => handleConfirmAction(selectedIssue.id)}
                  className="px-4 py-2 bg-[var(--cyan)] text-slate-950 font-bold rounded-xl text-[10px] hover:scale-102 transition-transform cursor-pointer"
                >
                  👍 Confirm / Upvote Issue
                </button>
              ) : selectedIssue.confirmations.some(c => c.userId === (user?.id || "")) ? (
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/10 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Upvote Casted Successfully
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 italic">Login as Citizen to Upvote alerts</span>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
      )}

    </div>
  );
}
