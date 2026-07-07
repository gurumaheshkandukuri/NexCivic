import React, { useState, useEffect, useMemo } from "react";
import { 
  Building, 
  Sparkles, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Users, 
  Download, 
  AlertTriangle, 
  Database, 
  Wrench, 
  Upload,
  Brain,
  MessageSquare,
  Activity,
  Plus,
  Filter,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Send,
  Check,
  Map,
  ShieldAlert,
  Star
} from "lucide-react";
import { Issue, UserProfile, ImportBatch } from "../types";
import { states, locationData } from "../constants/locations";
import { STATUS } from "../constants/status";
import { PRIORITIES } from "../constants/priorities";
import { CATEGORIES, CATEGORY_LIST } from "../constants/categories";
import { 
  updateIssueStatus, 
  mergeIssues, 
  createIssue
} from "../services/issueService";
import {
  getImportBatches,
  createImportBatch,
  deleteImportBatchCascade
} from "../services/adminService";
import { generateResolutionCertificate } from "../utils/pdfGenerator";
import { generateHQAnalytics } from "../utils/analytics/hqAnalytics";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from "recharts";
import { useLiveIssues } from "../hooks/useLiveIssues";
import { useLiveAnalytics } from "../hooks/useLiveAnalytics";

interface MunicipalityMgrDashboardProps {
  user: UserProfile;
}

export default function MunicipalityMgrDashboard({ user }: MunicipalityMgrDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "backlog" | "imports" | "duplicates">("overview");

  // Filters state
  const [filterState, setFilterState] = useState<string>(user.assignedState || "all");
  const [filterDistrict, setFilterDistrict] = useState<string>("all");
  const [filterUlb, setFilterUlb] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    start: "2026-05-01",
    end: new Date().toISOString().split("T")[0]
  });

  // State handles for reports updates
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [statusInput, setStatusInput] = useState<"Open" | "In Progress" | "Resolved">("In Progress");
  const [assignedDept, setAssignedDept] = useState("");
  const [assignedOfficer, setAssignedOfficer] = useState("");
  const [notes, setNotes] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // State handles for CSV import
  const [csvRaw, setCsvRaw] = useState("");
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({});
  const [importStatus, setImportStatus] = useState("");
  const [importBatchesList, setImportBatchesList] = useState<ImportBatch[]>([]);

  // State handles for duplicate scanning via Gemini
  const [duplicateScanResults, setDuplicateScanResults] = useState<any[]>([]);
  const [scanningDuplicates, setScanningDuplicates] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    const list = await getImportBatches();
    setImportBatchesList(list);
  };

  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({
    scope: "hq",
    state: user.assignedState || ""
  });

  // Filter Issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // State > District > ULB filter
      if (filterState !== "all" && issue.state !== filterState) return false;
      if (filterDistrict !== "all" && issue.district !== filterDistrict) return false;
      if (filterUlb !== "all" && issue.ulb !== filterUlb) return false;
      // Date filter
      let issueTime = 0;
      if (issue.createdAt) {
        if (typeof issue.createdAt === "string") issueTime = new Date(issue.createdAt).getTime();
        else if ((issue.createdAt as any).toDate) issueTime = (issue.createdAt as any).toDate().getTime();
        else if ((issue.createdAt as any).seconds) issueTime = (issue.createdAt as any).seconds * 1000;
        else issueTime = new Date(issue.createdAt as any).getTime();
      }
      const startTime = new Date(dateRange.start).getTime();
      const endTime = new Date(dateRange.end + "T23:59:59").getTime();
      if (issueTime < startTime || issueTime > endTime) {
        return false;
      }
      return true;
    });
  }, [issues, filterState, filterDistrict, filterUlb, dateRange]);

  // Metric calculation helpers
  const analytics = useLiveAnalytics(user, filteredIssues);
  
  if (!analytics) return null;
  const { summary, charts, metadata } = analytics;

  // CSV Drag/Drop Parse Handlers
  const handleCSVDragOver = (e: React.DragOverEvent) => {
    e.preventDefault();
  };

  const handleCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setCsvRaw(text);
        parseCSVText(text);
      };
      reader.readAsText(file);
    }
  };

  const parseCSVText = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    const headers = firstLine.split(",").map(h => h.replace(/^"|"$/g, "").trim());
    setParsedHeaders(headers);

    const rows = lines.slice(1).map((line) => {
      return line.split(",").map(val => val.replace(/^"|"$/g, "").trim());
    });
    setParsedRows(rows);

    // Default mappings
    const mappings: any = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("title") || lower.includes("headline")) mappings["title"] = h;
      if (lower.includes("desc")) mappings["description"] = h;
      if (lower.includes("cat")) mappings["category"] = h;
      if (lower.includes("prior") || lower.includes("severe")) mappings["priority"] = h;
      if (lower.includes("landmark") || lower.includes("add")) mappings["address"] = h;
    });
    setColumnMappings(mappings);
  };

  const executeImport = async () => {
    if (parsedRows.length === 0) return;
    setImportStatus("Parsing logs & committing schema rows...");

    try {
      const batchId = await createImportBatch({
        batchName: `Manager Cargo ${new Date().toLocaleDateString()}`,
        type: "issues",
        rowCount: parsedRows.length,
        successCount: parsedRows.length,
        importedBy: user.name
      });

      const titleCol = columnMappings["title"];
      const descCol = columnMappings["description"];
      const catCol = columnMappings["category"];
      const priCol = columnMappings["priority"];
      const addCol = columnMappings["address"];

      const tIdx = titleCol ? parsedHeaders.indexOf(titleCol) : -1;
      const dIdx = descCol ? parsedHeaders.indexOf(descCol) : -1;
      const cIdx = catCol ? parsedHeaders.indexOf(catCol) : -1;
      const pIdx = priCol ? parsedHeaders.indexOf(priCol) : -1;
      const aIdx = addCol ? parsedHeaders.indexOf(addCol) : -1;

      for (const row of parsedRows) {
        const title = tIdx !== -1 && row[tIdx] ? row[tIdx].trim() : "Imported Structural Fault";
        const description = dIdx !== -1 && row[dIdx] ? row[dIdx].trim() : "Bulk imported incident via commissioner. Urgent field inspection required.";
        
        let category = "Other";
        if (cIdx !== -1 && row[cIdx]) {
          const rawCat = row[cIdx].trim();
          const matchedCat = CATEGORY_LIST.find(
            c => c.toLowerCase() === rawCat.toLowerCase() || rawCat.toLowerCase().includes(c.toLowerCase())
          );
          if (matchedCat) category = matchedCat;
        }

        let priority: "Low" | "Medium" | "High" | "Critical" = "Medium";
        if (pIdx !== -1 && row[pIdx]) {
          const rawPri = row[pIdx].trim().charAt(0).toUpperCase() + row[pIdx].trim().slice(1).toLowerCase();
          if (["Low", "Medium", "High", "Critical"].includes(rawPri)) {
            priority = rawPri as any;
          }
        }

        const address = aIdx !== -1 && row[aIdx] ? row[aIdx].trim() : "Mumbai Metropolitan Area";
        const lat = 19.076 + (Math.random() - 0.5) * 0.08;
        const lng = 72.8777 + (Math.random() - 0.5) * 0.08;

        await createIssue({
          title,
          description,
          category,
          priority,
          landmark: address,
          latitude: lat,
          longitude: lng,
          state: "Maharashtra", district: "Mumbai", ulb: "BMC",
          status: "Submitted",
          reportedByUID: user.uid,
          reportedByName: user.name,
           
          source: "csv_import",
          importBatch: batchId,
        });
      }

      setImportStatus("Import complete!");
      setCsvRaw("");
      setParsedRows([]);
      setParsedHeaders([]);
      loadBatches();
      
      
      setTimeout(() => {
        setImportStatus("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setImportStatus("Import errored");
    }
  };

  // Duplicate Scanner
  const handleDuplicateScan = async () => {
    setScanningDuplicates(true);
    try {
      const res = await fetch("/api/gemini/scan-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: issues.map(i => ({ id: i.complaintId, title: i.title, description: i.description, lat: i.latitude, lng: i.longitude })) })
      });
      const data = await res.json();
      setDuplicateScanResults(data.duplicates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningDuplicates(false);
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    const issueId = selectedIssue.uid!;

    await updateIssueStatus(issueId, statusInput, {
      afterPhotoUrl: afterPhoto || undefined,
      comments: notes || undefined,
      assignedDept: assignedDept || undefined,
      assignedOfficer: assignedOfficer || undefined,
    }, user);

    setHighlightedId(issueId);
    setTimeout(() => {
      setHighlightedId(null);
    }, 5000);

    setSelectedIssue(null);
    setNotes("");
    setAfterPhoto("");
    setAssignedDept("");
    setAssignedOfficer("");
    
  };

  const handleDeleteBatch = async (batchId: string, type: "issues" | "survey") => {
    if (confirm("Proceeding will delete all associated dataset rows imported in this batch. Delete anyway?")) {
      await deleteImportBatchCascade(batchId, type);
      loadBatches();
      
    }
  };

  const handleMergeAction = async (primaryId: string, duplicateId: string) => {
    await mergeIssues(primaryId, [duplicateId], user.uid);
    
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8 text-left">
      
      {/* Upper header segment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Municipality HQ Analytics
            {isSyncing && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                SYNCING
              </span>
            )}
            {isOffline && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-mono">
                <AlertTriangle className="w-3 h-3" />
                OFFLINE
              </span>
            )}
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold text-[10px] uppercase font-mono mt-2">
            <Building className="w-3.5 h-3.5" />
            <span>MUNICIPAL HQ STRATEGIC CONSOLE</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-[var(--text-1)] mt-2">
            Regional Supervisor Desk
          </h2>
          <p className="text-xs text-[var(--text-2)] mt-1.5">
            HQ Terminal for <strong className="text-[var(--cyan)]">{user.name}</strong> • Managing cross-ward services, telemetry metrics, and duplicate scanning.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/40 p-3.5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-gray-500 mr-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope Filters</span>
          </div>
          
          {user.assignedState ? (
            <div className="bg-[var(--cyan)]/10 border border-[var(--cyan)]/30 text-[11px] font-bold text-[var(--cyan)] py-1.5 px-3 rounded-lg flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {user.assignedState}
            </div>
          ) : (
            <select 
              value={filterState} 
              onChange={(e) => { setFilterState(e.target.value); setFilterDistrict("all"); setFilterUlb("all"); }}
              className="bg-slate-950 border border-gray-800 text-[11px] font-bold text-white py-1.5 px-2 rounded-lg focus:outline-none focus:border-[var(--cyan)] transition-colors cursor-pointer"
            >
              <option value="all">🌐 All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select 
            value={filterDistrict} 
            onChange={(e) => { setFilterDistrict(e.target.value); setFilterUlb("all"); }}
            disabled={filterState === "all"}
            className="bg-slate-950 border border-gray-800 text-[11px] font-bold text-white py-1.5 px-2 rounded-lg focus:outline-none focus:border-[var(--cyan)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <option value="all">📍 All Districts</option>
            {filterState !== "all" && Object.keys(locationData[filterState as keyof typeof locationData] || {}).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select 
            value={filterUlb} 
            onChange={(e) => setFilterUlb(e.target.value)}
            disabled={filterDistrict === "all"}
            className="bg-slate-950 border border-gray-800 text-[11px] font-bold text-white py-1.5 px-2 rounded-lg focus:outline-none focus:border-[var(--cyan)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <option value="all">🏢 All ULBs</option>
            {filterDistrict !== "all" && (locationData[filterState as keyof typeof locationData] as any)?.[filterDistrict]?.map((u: string) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 border-l border-gray-800 pl-3.5">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-slate-950 border border-gray-800 text-[11px] font-bold text-white py-1 px-1.5 rounded-lg focus:outline-none focus:border-[var(--cyan)]"
            />
            <span className="text-[10px] text-gray-500 font-extrabold uppercase">to</span>
            <input 
              type="date" 
              value={dateRange.end}
              value-max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-slate-950 border border-gray-800 text-[11px] font-bold text-white py-1 px-1.5 rounded-lg focus:outline-none focus:border-[var(--cyan)]"
            />
          </div>
        </div>
      </div>

      {/* Sub tabs line */}
      <div className="flex gap-4 border-b border-gray-850">
        {(["overview", "backlog", "imports", "duplicates"] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-1 text-xs uppercase font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === tab ? "border-[var(--cyan)] text-[var(--cyan)]" : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tab === "overview" && "📊 Performance Analytics"}
            {tab === "backlog" && "📋 Operations Backlog"}
            {tab === "imports" && "📥 CSV Integration"}
            {tab === "duplicates" && "🤖 Semantic Merges"}
          </button>
        ))}
      </div>

      {/* Overview/Performance Tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="flex justify-end mb-2 -mt-4">
            <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>
          </div>
          {/* Key Metric cards in Claymorphism */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Aggregated</span>
              <span className="text-xl font-display font-black text-white block mt-1">{summary.totalIncidents}</span>
            </div>
            
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-rose-500 font-bold block">Open Backlog</span>
              <span className="text-xl font-display font-black text-rose-400 block mt-1">{summary.openBacklog}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-blue-500 font-bold block">Active In Field</span>
              <span className="text-xl font-display font-black text-blue-400 block mt-1">{summary.activeInField}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-emerald-500 font-bold block">Certified Closed</span>
              <span className="text-xl font-display font-black text-emerald-400 block mt-1">{summary.certifiedClosed}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-left flex flex-col justify-between shadow-[inset_0_3px_10px_rgba(245,158,11,0.05)]">
              <span className="text-[10px] uppercase text-amber-500 font-bold block flex justify-between">
                Avg Resolution <span className={summary.workloadTrend.includes("↑") ? "text-rose-400" : summary.workloadTrend.includes("↓") ? "text-emerald-400" : "text-amber-500"}>{summary.workloadTrend}</span>
              </span>
              <span className="text-xl font-display font-black text-amber-400 block mt-1">{summary.averageResolutionTimeDays === "Insufficient Data" ? <span className="text-xs text-amber-500/50 font-normal">Insufficient Data</span> : `${summary.averageResolutionTimeDays}d`}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-[var(--cyan)] font-bold block">Top Category</span>
              <span className="text-sm font-display font-black text-[var(--cyan)] block mt-1 truncate">{summary.topCategory === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : summary.topCategory}</span>
            </div>
            
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-indigo-400 font-bold block">Top District</span>
              <span className="text-sm font-display font-black text-indigo-400 block mt-1 truncate">{summary.topDistrict === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : summary.topDistrict}</span>
            </div>
            
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between glass">
              <span className="text-[10px] uppercase text-yellow-400 font-bold block">Satisfaction</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xl font-display font-black text-yellow-400">{summary.citizenSatisfaction === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : summary.citizenSatisfaction}</span>
                {summary.citizenSatisfaction !== "Insufficient Data" ? <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category breakdown bar */}
            <div className="lg:col-span-8 glass p-5 rounded-3xl border border-white/5 h-80 shadow-xl relative">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] block">
                  Incident Volume & Resolution Status by Category
                </span>
                <span className="text-[9px] font-mono tracking-widest text-[#5ca2eb] font-bold bg-[#5ca2eb]/10 px-2 py-0.5 rounded-md uppercase">Wards Cross-Audit</span>
              </div>
              
              {charts.categoryDistribution.length === 0 ? (
                <div className="h-[75%] flex items-center justify-center text-gray-500 text-sm">
                  No analytics available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts.categoryDistribution}>
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "11px" }} />
                    <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                    <Bar name="Total Incidents" dataKey="total" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
                    <Bar name="Resolved Issues" dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Severity Priority Donuts */}
            <div className="lg:col-span-4 glass p-5 rounded-3xl border border-white/5 flex flex-col justify-between shadow-xl">
              <div>
                <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] mb-3 block">
                  Priority Risk Distribution
                </span>
                
                {charts.priorityDistribution.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-gray-500 text-sm">
                    No analytics available yet.
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie
                          data={charts.priorityDistribution}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="priority"
                        >
                          {charts.priorityDistribution.map((entry, index) => {
                             let color = "var(--green)";
                             if (entry.priority === "Critical") color = "var(--red)";
                             if (entry.priority === "High") color = "var(--orange)";
                             if (entry.priority === "Medium") color = "var(--yellow)";
                             return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Severity</span>
                      <span className="text-xl font-display font-black text-white">{summary.totalIncidents}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend checklist */}
              {charts.priorityDistribution.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {charts.priorityDistribution.map((pSym) => {
                    let colorClass = "bg-[var(--green)]";
                    if (pSym.priority === "Critical") colorClass = "bg-[var(--red)]";
                    if (pSym.priority === "High") colorClass = "bg-[var(--orange)]";
                    if (pSym.priority === "Medium") colorClass = "bg-[var(--yellow)]";
                    return (
                      <div key={pSym.priority} className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold px-2 py-1 bg-slate-900/30 rounded-lg border border-white/5">
                        <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                        <span>{pSym.priority}: {pSym.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timeline trend graph */}
            <div className="glass p-5 rounded-3xl border border-white/5 h-64 shadow-xl">
              <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] mb-4 block">
                Monthly Trend Activity
              </span>
              {charts.monthlyTrend.length === 0 ? (
                <div className="h-[75%] flex items-center justify-center text-gray-500 text-sm">
                  No analytics available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={charts.monthlyTrend}>
                    <defs>
                      <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="cyberGradient2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }} />
                    <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                    <Area name="Submitted" type="monotone" dataKey="submitted" stroke="var(--cyan)" strokeWidth={2.5} fillOpacity={1} fill="url(#cyberGradient)" />
                    <Area name="Resolved" type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#cyberGradient2)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Department Workload / District Comparison */}
            <div className="glass p-5 rounded-3xl border border-white/5 h-64 shadow-xl">
              <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] mb-4 block">
                District Comparison Workload
              </span>
              {charts.districtComparison.length === 0 ? (
                <div className="h-[75%] flex items-center justify-center text-gray-500 text-sm">
                  No analytics available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={charts.districtComparison} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="district" width={80} stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }} />
                    <Bar name="Active Tickets" dataKey="count" fill="var(--orange)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backlog Operations control Board */}
      {activeTab === "backlog" && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-display font-bold text-sm text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[var(--cyan)]" /> Registered Incidents Ward Queue ({filteredIssues.length})
            </h3>
            <span className="text-[10px] text-gray-500">Double click an issue to initiate rapid administrative dispatch</span>
          </div>

          <div className="bg-slate-900/35 border border-white/5 rounded-3xl overflow-hidden glass shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-800 bg-slate-950/45 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-4">Ticket ID & Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Location (ULB)</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Registered By</th>
                    <th className="p-4">State Agency</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                        No active incident reports match the chosen filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue) => {
                      const isHilited = highlightedId === issue.complaintId;
                      return (
                        <tr 
                          key={issue.complaintId} 
                          className={`transition-colors hover:bg-white/5 cursor-pointer md:table-row ${
                            isHilited ? "bg-[var(--cyan)]/[0.08] animate-pulse" : ""
                          }`}
                        >
                          <td className="p-4 font-semibold" onClick={() => setSelectedIssue(issue)}>
                            <div className="flex flex-col">
                              <span className="font-bold text-[var(--text-1)] text-xs font-sans hover:text-[var(--cyan)] transition-colors">{issue.title}</span>
                              <span className="text-[10px] font-mono text-gray-500 mt-0.5 max-w-xs truncate">📍 {issue.landmark}</span>
                            </div>
                          </td>
                          <td className="p-4" onClick={() => setSelectedIssue(issue)}>
                            <span className="px-2.5 py-1 rounded-lg bg-gray-800/60 font-bold border border-gray-700/40 text-[10px]">
                              {issue.category}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-gray-400" onClick={() => setSelectedIssue(issue)}>
                            {issue.ulb || issue.district || issue.state || "N/A"}
                          </td>
                          <td className="p-4" onClick={() => setSelectedIssue(issue)}>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider ${
                              issue.priority === PRIORITIES.CRITICAL ? "text-red-400" :
                              issue.priority === PRIORITIES.HIGH ? "text-orange-400" :
                              issue.priority === PRIORITIES.MEDIUM ? "text-amber-400" :
                              "text-emerald-400"
                            }`}>
                              {issue.priority}
                            </span>
                          </td>
                          <td className="p-4" onClick={() => setSelectedIssue(issue)}>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-300">{issue.reportedByName}</span>
                              <span className="text-[9px] font-mono text-gray-550">{""}</span>
                            </div>
                          </td>
                          <td className="p-4" onClick={() => setSelectedIssue(issue)}>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold text-[var(--cyan)] uppercase tracking-wide">
                                🏢 {issue.category || "Other"}
                              </span>
                              <span className="text-[9px] text-gray-500 mt-0.5 font-sans">
                                {issue.assignedInspectorName ? `👷 ${issue.assignedInspectorName}` : "⚠️ Unassigned Officer"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center" onClick={() => setSelectedIssue(issue)}>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${
                              issue.status === STATUS.RESOLVED ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              issue.status === STATUS.IN_PROGRESS ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20"
                            }`}>
                              {issue.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedIssue(issue);
                                setStatusInput(issue.status);
                                setAssignedDept(issue.category || "");
                                setAssignedOfficer(issue.assignedInspectorName || "");
                              }}
                              className="px-3 py-1 bg-[var(--cyan)] hover:scale-103 transition-transform text-slate-950 font-extrabold text-[10px] rounded-lg cursor-pointer"
                            >
                              Dispatch HQ
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CSV Integration Logs tab */}
      {activeTab === "imports" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left animate-fadeIn">
          
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="glass p-5 rounded-3xl border border-white/5 flex flex-col gap-3">
              <h4 className="font-display font-bold text-xs uppercase text-gray-300 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[var(--cyan)]" /> Bulk CSV Cargo Intake
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Drag-and-drop a structural data CSV file to align column headers and commit issues directly into the Firestore telemetry list.
              </p>

              <div
                onDragOver={handleCSVDragOver}
                onDrop={handleCSVDrop}
                className="w-full h-40 border-2 border-dashed border-gray-700 hover:border-[var(--cyan)]/40 hover:bg-[var(--cyan)]/[0.01] rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all"
              >
                <Database className="w-8 h-8 text-[var(--cyan)] mb-2 animate-bounce" />
                <span className="text-[11px] font-bold text-white uppercase">Intake Incident CSV File</span>
                <span className="text-[9px] text-gray-500 mt-1 block">Drop raw table spreadsheet here</span>
              </div>

              {parsedRows.length > 0 && (
                <div className="p-3 bg-[var(--cyan)]/5 border border-[var(--cyan)]/15 rounded-xl text-[10px] space-y-1.5 mt-2">
                  <div className="flex justify-between items-center text-white">
                    <span className="font-bold">✓ Parsing metrics completed:</span>
                    <span className="font-mono text-[var(--cyan)]">{parsedRows.length} Rows Identified</span>
                  </div>
                  
                  {/* Mapping options */}
                  <div className="space-y-1 pt-1.5 border-t border-gray-800">
                    <span className="block text-[8px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Column bindings:</span>
                    {["title", "description", "category", "priority"].map((element) => (
                      <div key={element} className="flex justify-between items-center">
                        <span className="capitalize font-mono text-gray-400 text-[9px]">{element}:</span>
                        <select
                          value={columnMappings[element] || ""}
                          onChange={(e) => setColumnMappings(prev => ({ ...prev, [element]: e.target.value }))}
                          className="bg-slate-950 border border-gray-800 text-[9px] px-1 rounded text-white"
                        >
                          <option value="">-- Bind --</option>
                          {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={executeImport}
                    className="w-full py-2.5 mt-2.5 clay-btn text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer"
                  >
                    Commit Bulk Import Cargo
                  </button>
                </div>
              )}

              {importStatus && (
                <div className="p-2 ml-1 text-center font-mono text-[10px] text-[var(--cyan)] uppercase animate-pulse border border-[var(--cyan)]/15 bg-[var(--cyan)]/5 rounded-lg">
                  {importStatus}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-7 flex flex-col gap-4">
            <span className="font-display font-bold text-sm text-[var(--text-1)] uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" /> Active Bulk Import Batches logs ({importBatchesList.length})
            </span>

            <div className="flex flex-col gap-3.5">
              {importBatchesList.length === 0 ? (
                <div className="p-8 border border-white/5 bg-slate-900/10 text-center rounded-3xl text-gray-500 font-sans font-medium">
                  No CSV telemetry cargo batches logged in database yet.
                </div>
              ) : (
                importBatchesList.map((batch) => (
                  <div key={batch.id} className="p-4 rounded-2xl bg-slate-900/35 border border-white/5 flex justify-between items-center glass">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-white uppercase font-sans">{batch.batchName}</span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-gray-400 leading-none">
                        <span>Imported by: <strong>{batch.importedBy}</strong></span>
                        <span>•</span>
                        <span>Quantity: <strong>{batch.rowCount} Rows</strong></span>
                        <span>•</span>
                        <span>Committed: <strong>{new Date(batch.createdAt).toLocaleString()}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBatch(batch.id, batch.type)}
                      className="p-2 hover:bg-rose-500/10 rounded-xl text-rose-400 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                      title="Cascade delete all batch items"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Semantic duplicate scanner merges tab */}
      {activeTab === "duplicates" && (
        <div className="flex flex-col gap-4 text-left animate-fadeIn">
          
          <div className="p-5 rounded-3xl bg-slate-950/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass">
            <div className="max-w-xl">
              <span className="text-[10px] uppercase font-mono tracking-widest font-extrabold text-[var(--cyan)] flex items-center gap-1.5">
                <Brain className="w-4 h-4 animate-pulse" /> SEMANTIC GEOLOCATIONAL RESOLUTION
              </span>
              <h4 className="font-display font-extrabold text-base text-[var(--text-1)] mt-1.5">
                Duplicate Incident Merging Board
              </h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Execute cross-vector proximity analyses via the server-side Gemini duplicates audit framework to prevent duplications across wards.
              </p>
            </div>
            <button
              onClick={handleDuplicateScan}
              disabled={scanningDuplicates}
              className="py-3 px-5 clay-btn text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-transform duration-200"
            >
              <Sparkles className="w-4 h-4 text-white animate-spin" style={{ animationDuration: scanningDuplicates ? "2.5s" : "0s" }} />
              {scanningDuplicates ? "Cross-Audit Analysing Proximities..." : "Initiate Proximity Search"}
            </button>
          </div>

          <div className="space-y-4 mt-2">
            {duplicateScanResults.length === 0 ? (
              <div className="p-8 border border-white/5 bg-slate-900/10 rounded-3xl text-center text-gray-500 font-sans font-medium">
                No active duplicate records clustered. Select 'Initiate Proximity Search' to parse live tickets against geometric ward thresholds.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {duplicateScanResults.map((cluster, cIdx) => (
                  <div key={cIdx} className="glass border border-white/5 rounded-3xl p-5 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <span className="text-[9px] font-mono font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" /> Incident Collision Cluster #{cIdx + 1}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500">{cluster.matches?.length || 0} overlapping files</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Primary representation */}
                      <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-left">
                        <span className="block text-[8px] font-bold text-emerald-400 font-mono uppercase tracking-widest mb-1">Assumed Master Ticket</span>
                        <span className="block font-bold text-xs text-white">{cluster.primary?.title}</span>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 italic">"{cluster.primary?.description}"</p>
                        <span className="block text-[9px] text-gray-500 font-mono mt-1.5">📍 {cluster.primary?.address}</span>
                      </div>

                      {/* Overlapping tickets */}
                      {cluster.matches?.map((match: any, mIdx: number) => (
                        <div key={mIdx} className="p-3.5 bg-red-500/5 hover:bg-slate-900/60 border border-red-550/10 hover:border-gray-800 rounded-xl flex items-start justify-between gap-3 transition-colors">
                          <div className="text-left flex-grow">
                            <span className="block text-[8px] font-bold text-red-400 font-mono uppercase tracking-widest mb-1">Clashing Duplicate</span>
                            <span className="block font-bold text-xs text-white">{match.title}</span>
                            <span className="block text-[9px] text-gray-400 mt-0.5 max-w-sm font-sans truncate">{match.address}</span>
                          </div>
                          
                          <button
                            onClick={() => handleMergeAction(cluster.primary.uid, match.uid)}
                            className="px-3 py-1.5 text-[10px] font-bold bg-amber-500 hover:scale-103 text-slate-950 rounded-lg shrink-0 transition-transform cursor-pointer"
                          >
                            Merge Node
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* DISPATCH HQ MODAL PANEL */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass max-w-xl w-full rounded-2xl p-6 border border-white/10 animate-zoomIn flex flex-col gap-4 text-left relative overflow-hidden bg-slate-950">
            
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <span className="text-[10px] uppercase font-mono tracking-widest font-extrabold text-[var(--cyan)] flex items-center gap-1.5">
                <Wrench className="w-4 h-4 animate-spin text-[var(--cyan)]" /> DISPATCH & RESOLVE CONSOLE
              </span>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="text-xs text-gray-500 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-sans font-black text-sm text-[var(--text-1)]">{selectedIssue.title}</h4>
                <p className="text-[11px] text-gray-400 font-sans leading-relaxed mt-1">{selectedIssue.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[9px] text-gray-400">
                  <span>📍 Area: <strong>{selectedIssue.address}</strong></span>
                  <span>📅 Reported: <strong>{new Date(selectedIssue.createdAt).toLocaleDateString()}</strong></span>
                  <span>👤 Reporter: <strong>{selectedIssue.reporterName}</strong></span>
                  <span>📡 Category: <strong>{selectedIssue.category}</strong></span>
                </div>
              </div>

              {(selectedIssue.imageUrl || selectedIssue.imageData) && (
                <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-800">
                  <img src={selectedIssue.imageUrl || selectedIssue.imageData || ""} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Inspection Notes Block */}
              {(selectedIssue.workCompleted || selectedIssue.materialsUsed || selectedIssue.estimatedCost || selectedIssue.timeSpent || selectedIssue.inspectionRemarks) && (
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 text-left">
                  <span className="text-[9px] font-extrabold uppercase text-gray-400 border-b border-gray-800 pb-2 mb-2 block w-full">
                    📋 Inspector Field Notes
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {selectedIssue.workCompleted && (
                      <div><span className="text-gray-500 block text-[9px] uppercase font-mono">Work Completed</span><strong className="text-white">{selectedIssue.workCompleted}</strong></div>
                    )}
                    {selectedIssue.materialsUsed && (
                      <div><span className="text-gray-500 block text-[9px] uppercase font-mono">Materials Used</span><strong className="text-white">{selectedIssue.materialsUsed}</strong></div>
                    )}
                    {selectedIssue.estimatedCost && (
                      <div><span className="text-gray-500 block text-[9px] uppercase font-mono">Estimated Cost</span><strong className="text-white">₹{selectedIssue.estimatedCost}</strong></div>
                    )}
                    {selectedIssue.timeSpent && (
                      <div><span className="text-gray-500 block text-[9px] uppercase font-mono">Time Spent</span><strong className="text-white">{selectedIssue.timeSpent}</strong></div>
                    )}
                  </div>
                  {selectedIssue.inspectionRemarks && (
                    <div className="mt-3 pt-2 border-t border-gray-800/50">
                      <span className="text-gray-500 block text-[9px] uppercase font-mono mb-0.5">Remarks</span>
                      <p className="text-[11px] text-gray-300">{selectedIssue.inspectionRemarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Citizen Rating Block */}
              {selectedIssue.rating && (
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 text-left">
                  <span className="text-[9px] font-extrabold uppercase text-yellow-500 border-b border-yellow-500/20 pb-2 mb-2 block w-full">
                    ⭐ Citizen Resolution Rating
                  </span>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`w-5 h-5 ${star <= selectedIssue.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                    ))}
                  </div>
                  {selectedIssue.ratingFeedback && (
                    <div className="mt-2 pt-2 border-t border-yellow-500/20">
                      <span className="text-yellow-500 block text-[9px] uppercase font-mono mb-0.5">Feedback</span>
                      <p className="text-[11px] text-yellow-100 italic">"{selectedIssue.ratingFeedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status Update Form */}
              <form onSubmit={handleUpdateStatusSubmit} className="space-y-3.5 pt-3.5 border-t border-gray-800 text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-gray-400">Status tier</label>
                    <select
                      value={statusInput}
                      onChange={(e: any) => setStatusInput(e.target.value)}
                      className="p-2.5 rounded-lg bg-slate-900 border border-gray-800 text-white outline-none"
                    >
                      <option value={STATUS.SUBMITTED}>Submitted (Log as queue)</option>
                      <option value={STATUS.IN_PROGRESS}>In Progress (Dispatch officers)</option>
                      <option value={STATUS.RESOLVED}>Resolved (Commit as sealed)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-gray-400">Route Department agency</label>
                    <select
                      value={assignedDept}
                      onChange={(e) => setAssignedDept(e.target.value)}
                      className="p-2.5 rounded-lg bg-slate-900 border border-gray-800 text-white outline-none"
                    >
                      <option value="">-- Let Department Suggested --</option>
                      <option value="Roads and Infrastructure">Roads and Infrastructure</option>
                      <option value="Utilities and Water Works">Utilities and Water Works</option>
                      <option value="Sanitation Hygiene">Sanitation Hygiene</option>
                      <option value="Power Grid & streetlights">Power Grid & streetlights</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-gray-400">Dispatch officer engineer</label>
                    <select
                      value={assignedOfficer}
                      onChange={(e) => setAssignedOfficer(e.target.value)}
                      className="p-2.5 rounded-lg bg-slate-900 border border-gray-800 text-white outline-none"
                    >
                      <option value="">-- Let Unassigned --</option>
                      <option value="Inspector Suresh Patil">Inspector Suresh Patil (Zone A)</option>
                      <option value="Inspector Kavita Rao">Inspector Kavita Rao (Zone B)</option>
                      <option value="Inspector NexCivic">Inspector NexCivic (All Zones)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-extrabold uppercase text-gray-400">Sealed Close photo url (Resolutions)</label>
                    <input
                      type="text"
                      value={afterPhoto}
                      onChange={(e) => setAfterPhoto(e.target.value)}
                      placeholder="e.g. https://images.unsplash.com/restored-road..."
                      className="p-2.5 rounded-lg bg-slate-900 border border-gray-800 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-gray-400">Resolution Logs of Inspection notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter technical comments or resolution reasons..."
                    className="p-2.5 rounded-lg bg-slate-900 border border-gray-800 text-white outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedIssue(null)}
                    className="py-2.5 border border-gray-800 hover:border-gray-600 rounded-lg text-[11px] font-bold text-center"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 clay-btn text-white text-[11px] font-extrabold rounded-lg text-center"
                  >
                    Commit Dispatch & Log
                  </button>
                </div>
              </form>
              
              {selectedIssue.status === STATUS.RESOLVED && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => generateResolutionCertificate(selectedIssue, user)}
                    className="w-full py-3 bg-[var(--cyan)]/20 text-[var(--cyan)] font-bold rounded-xl text-xs hover:bg-[var(--cyan)]/30 transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" /> Download Resolution Report (PDF)
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
