import React, { useState, useEffect } from "react";
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
  UploadCloud,
  CheckCircle,
  Star
} from "lucide-react";
import { Issue, UserProfile, ImportBatch } from "../types";
import { 
  updateIssueStatus, 
  mergeIssues, 
  createIssue,
  acceptCase,
  startInspection,
  completeInspection,
  submitRecommendation,
  uploadInspectionImage
} from "../services/issueService";
import { 
  getImportBatches, 
  createImportBatch, 
  deleteImportBatchCascade
} from "../services/adminService";
import { generateResolutionCertificate } from "../utils/pdfGenerator";
import { generateInspectorAnalytics } from "../utils/analytics/inspectorAnalytics";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { STATUS } from "../constants/status";

import { useLiveIssues } from "../hooks/useLiveIssues";
import { useLiveAnalytics } from "../hooks/useLiveAnalytics";

interface AdminPanelProps {
  user: UserProfile;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "imports" | "duplicates">("overview");

  // State handles for reports updates
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [statusInput, setStatusInput] = useState<"Open" | "In Progress" | "Resolved">("In Progress");
  const [notes, setNotes] = useState("");
  const [workCompleted, setWorkCompleted] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [recommendation, setRecommendation] = useState<"RESOLVE" | "REJECT">("RESOLVE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reporterEmail, setReporterEmail] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedIssue && selectedIssue.reportedByUID && selectedIssue.reportedByUID !== "anonymous") {
      setReporterEmail(null);
      import("firebase/firestore").then(({ doc, getDoc }) => {
        import("../firebase-init").then(({ db }) => {
          getDoc(doc(db, "users", selectedIssue.reportedByUID)).then((snap) => {
            if (snap.exists()) {
              setReporterEmail(snap.data().email || null);
            }
          }).catch(() => setReporterEmail(null));
        });
      });
    } else {
      setReporterEmail(null);
    }
  }, [selectedIssue]);

  const loadBatches = async () => {
    const list = await getImportBatches();
    setImportBatchesList(list);
  };

  // Recharts metric calculations
  const { issues, isSyncing, isOffline, lastSynced } = useLiveIssues({
    scope: "inspector",
    userId: user.uid
  });

  const analytics = useLiveAnalytics(user, issues);
  
  if (!analytics) return null;
  const { summary, charts, metadata } = analytics;
  
  // Keep legacy priority and category charts for Inspector if not ported to new charts object
  const priorityData = [
    { name: "Critical", value: issues.filter(i => i.priority === "Critical").length, color: "var(--red)" },
    { name: "High", value: issues.filter(i => i.priority === "High").length, color: "var(--orange)" },
    { name: "Medium", value: issues.filter(i => i.priority === "Medium").length, color: "var(--yellow)" },
    { name: "Low", value: issues.filter(i => i.priority === "Low").length, color: "var(--green)" }
  ].filter(p => p.value > 0);

  const categoryData = [
    { category: "Pothole", count: issues.filter(i => i.category === "Pothole").length },
    { category: "Garbage", count: issues.filter(i => i.category === "Garbage Overflow").length },
    { category: "Water", count: issues.filter(i => i.category === "Water Leakage").length },
    { category: "Lights", count: issues.filter(i => i.category === "Street Light").length },
    { category: "Drainage", count: issues.filter(i => i.category === "Drainage").length },
    { category: "Infras.", count: issues.filter(i => i.category === "Infrastructure").length }
  ].filter(c => c.count > 0);

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

    // Parse commas while respecting quotes if any
    const firstLine = lines[0];
    const headers = firstLine.split(",").map(h => h.replace(/^"|"$/g, "").trim());
    setParsedHeaders(headers);

    const rows = lines.slice(1).map((line) => {
      return line.split(",").map(val => val.replace(/^"|"$/g, "").trim());
    });
    setParsedRows(rows);

    // Default basic mapping guesses
    const mappings: any = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("title") || lower.includes("headline")) mappings["title"] = h;
      if (lower.includes("desc")) mappings["description"] = h;
      if (lower.includes("cat")) mappings["category"] = h;
      if (lower.includes("prior") || lower.includes("severe")) mappings["priority"] = h;
      if (lower.includes("landmark") || lower.includes("add")) mappings["address"] = h;
      if (lower.includes("nps") || lower.includes("net promoter")) mappings["nps"] = h;
      if (lower.includes("satisfac")) mappings["satisfaction"] = h;
      if (lower.includes("age")) mappings["ageGroup"] = h;
    });
    setColumnMappings(mappings);
  };

  // Submit CSV Import mapping
  const executeImport = async () => {
    if (parsedRows.length === 0) return;
    setImportStatus("Importing & indexing rows...");

    try {
      // Import issues
      const batchId = await createImportBatch({
        batchName: `Issues Cargo ${new Date().toLocaleDateString()}`,
        type: "issues",
        rowCount: parsedRows.length,
        successCount: parsedRows.length,
        importedBy: user.name
      });

      setImportStatus("Committing imported issues to Firestore database...");

      // Get mappings indices
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

      // Loop through parsedRows and add each to Firestore
      for (const row of parsedRows) {
        const title = tIdx !== -1 && row[tIdx] ? row[tIdx].trim() : "Untitled Fault Issue";
        const description = dIdx !== -1 && row[dIdx] ? row[dIdx].trim() : "Imported civic fault cargo record.";
        
        let category = "Other";
        if (cIdx !== -1 && row[cIdx]) {
          const rawCat = row[cIdx].trim();
          const matchedCat = ["Pothole", "Garbage Overflow", "Water Leakage", "Street Light", "Drainage", "Infrastructure"].find(
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

        const address = aIdx !== -1 && row[aIdx] ? row[aIdx].trim() : "Mumbai Metropolitan Division";

        // slightly disperse locations around Mumbai center
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
          state: user.assignedState || "Delhi",
          district: user.assignedDistrict || "Central",
          ulb: user.assignedULBs?.[0] || "NDMC",
          status: "Submitted",
          reportedByUID: user.uid,
          reportedByName: user.name,
           
          source: "csv_import",
          importBatch: batchId,
        });
      }

      setImportStatus("Import complete!");
      // Reset
      setCsvRaw("");
      setParsedRows([]);
      setParsedHeaders([]);
      loadBatches();
      
      // Clear status with a slight delay
      setTimeout(() => {
        setImportStatus("");
      }, 3000);
    } catch (err) {
      console.error("Import error:", err);
      setImportStatus("Import errored");
    }
  };

  // call server-side duplicate scanner via Gemini
  const handleDuplicateScan = async () => {
    setScanningDuplicates(true);
    try {
      const res = await fetch("/api/gemini/scan-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: issues.map(i => ({ id: i.uid, title: i.title, description: i.description, lat: i.latitude, lng: i.longitude })) })
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
      comments: notes || undefined
    });

    // Smooth transition effect: highlight the row in the table
    setHighlightedId(issueId);
    setTimeout(() => {
      setHighlightedId(null);
    }, 5000);

    // Close
    setSelectedIssue(null);
    setNotes("");
    setAfterPhoto("");
  };

  const handleAccept = async () => {
    if (!selectedIssue) return;
    setIsSubmitting(true);
    try {
      await acceptCase(selectedIssue.uid!, user);
      setSelectedIssue(null);
    } catch (err) {
      console.error(err);
      alert("Failed to accept case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async () => {
    if (!selectedIssue) return;
    setIsSubmitting(true);
    try {
      await startInspection(selectedIssue.uid!, user, selectedIssue.complaintId, selectedIssue.reportedByUID);
      setSelectedIssue(null);
    } catch (err) {
      console.error(err);
      alert("Failed to start inspection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedIssue) return;
    if (!notes.trim()) {
      alert("Remarks are required to complete inspection.");
      return;
    }
    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      const totalFiles = beforeFiles.length + afterFiles.length;
      let completedFiles = 0;

      const uploadWithProgress = (f: File, type: 'before' | 'after') => {
        return uploadInspectionImage(f, selectedIssue.complaintId, type, (prog) => {
          const overall = totalFiles > 0 ? ((completedFiles * 100) + prog) / totalFiles : 100;
          setUploadProgress(Math.round(overall));
          setUploadStatusText(`Uploading ${type} image ${completedFiles + 1} of ${totalFiles}... ${Math.round(prog)}%`);
        }).then(url => {
          completedFiles++;
          return url;
        });
      };

      setUploadStatusText(beforeFiles.length > 0 ? "Uploading before images..." : "Preparing...");
      const bUrls: string[] = [];
      for (const f of beforeFiles) {
        bUrls.push(await uploadWithProgress(f, 'before'));
      }

      if (afterFiles.length > 0) setUploadStatusText("Uploading after images...");
      const aUrls: string[] = [];
      for (const f of afterFiles) {
        aUrls.push(await uploadWithProgress(f, 'after'));
      }

      setUploadStatusText("Updating case details...");
      
      const notesPayload = {
        workCompleted,
        materialsUsed,
        estimatedCost,
        timeSpent,
        remarks: notes
      };
      
      await completeInspection(selectedIssue.uid!, user, selectedIssue.complaintId, selectedIssue.reportedByUID, bUrls, aUrls, notesPayload);
      
      setBeforeFiles([]);
      setAfterFiles([]);
      setNotes("");
      setWorkCompleted("");
      setMaterialsUsed("");
      setEstimatedCost("");
      setTimeSpent("");
      setUploadProgress(0);
      setUploadStatusText("");
      setSelectedIssue(null);
    } catch (err) {
      console.error(err);
      alert("Failed to complete inspection.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  const handleRecommend = async () => {
    if (!selectedIssue) return;
    if (!notes.trim()) {
      alert("Recommendation remarks are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitRecommendation(selectedIssue.uid!, user, recommendation, notes);
      setNotes("");
      setSelectedIssue(null);
    } catch (err) {
      console.error(err);
      alert("Failed to submit recommendation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 5) {
      alert("Maximum 5 files allowed.");
      return;
    }
    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} exceeds 5MB limit.`);
        return false;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
        alert(`${f.name} format not supported. Use JPG, PNG, or WEBP.`);
        return false;
      }
      return true;
    });
    
    if (type === 'before') {
      setBeforeFiles(prev => [...prev, ...validFiles].slice(0, 5));
    } else {
      setAfterFiles(prev => [...prev, ...validFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDeleteBatch = async (batchId: string, type: "issues" | "survey") => {
    if (confirm("WARNING: Proceeding will trace and delete all associated dataset rows imported in this batch. Delete anyway?")) {
      await deleteImportBatchCascade(batchId, type);
      loadBatches();
    }
  };

  // Execute manual merge
  const handleMergeAction = async (primaryId: string, duplicateId: string) => {
    await mergeIssues(primaryId, [duplicateId], user.uid);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6 text-left">
      {/* Tab Navigation */}
      {(() => {
        console.log("TRACE AdminPanel selectedIssue render:", selectedIssue);
        return null;
      })()}
      <div className="flex border-b border-gray-800 mb-6 px-6 pt-6">
        {(["overview", "reports", "imports", "duplicates"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-1 text-xs font-bold capitalize transition-all border-b-2 cursor-pointer ${
              activeTab === tab ? "border-[var(--cyan)] text-[var(--cyan)]" : "border-transparent text-gray-500 hover:text-white"
            }`}
          >
            {tab === "overview" && "🏠 Overview Metrics"}
            {tab === "reports" && "🛠️ Assign & Resolve"}
            {tab === "imports" && "📥 CSV Imports"}
            {tab === "duplicates" && "🤖 AI Duplicate Scanner"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="flex-1">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Inspector Terminal
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
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Field execution interface for managing assigned civic reports and dispatch tracking.
          </p>
        </div>
          <div className="flex justify-end mb-2 -mt-4">
            <span className="text-[10px] text-gray-400 font-mono">Last Updated: Just now</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Submitted</span>
              <span className="text-2xl font-black text-indigo-400 block mt-1">{summary.assigned}</span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">In Progress</span>
              <span className="text-2xl font-black text-amber-400 block mt-1">{summary.accepted}</span>
            </div>
            <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Completed</span>
              <span className="text-2xl font-black text-emerald-400 block mt-1">{summary.completed}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--cyan)]/5 border border-[var(--cyan)]/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block flex justify-between">
                Success Rate <span className={summary.performanceTrend.includes("↑") ? "text-emerald-400" : summary.performanceTrend.includes("↓") ? "text-rose-400" : "text-gray-400"}>{summary.performanceTrend}</span>
              </span>
              <span className="text-2xl font-black text-white block mt-1">{summary.resolutionSuccessRate === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : `${summary.resolutionSuccessRate}%`}</span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Avg Completion</span>
              <span className="text-2xl font-black text-white block mt-1">{summary.averageCompletionTimeDays === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : `${summary.averageCompletionTimeDays}d`}</span>
            </div>

            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Avg Inspection</span>
              <span className="text-2xl font-black text-orange-400 block mt-1">{summary.averageInspectionDurationHours === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : `${summary.averageInspectionDurationHours}h`}</span>
            </div>
            <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Citizen Rating</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-2xl font-black text-yellow-400">{summary.averageCitizenRating === "Insufficient Data" ? <span className="text-xs text-gray-500 font-normal">Insufficient Data</span> : summary.averageCitizenRating}</span>
                {summary.averageCitizenRating !== "Insufficient Data" ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : null}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--cyan)]/5 border border-[var(--cyan)]/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">This Week</span>
              <span className="text-2xl font-black text-cyan-400 block mt-1">{summary.casesThisWeek}</span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">This Month</span>
              <span className="text-2xl font-black text-blue-400 block mt-1">{summary.casesThisMonth}</span>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-left flex flex-col justify-between">
              <span className="text-[10px] uppercase text-gray-400 font-bold block">Longest Pending</span>
              <span className="text-2xl font-black text-red-400 block mt-1">{summary.longestPendingCaseDays ? `${summary.longestPendingCaseDays}d` : '0d'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 glass p-5 rounded-3xl border border-gray-700/10 h-64 shadow-xl">
              <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] mb-3 block">
                Incidents Distributed by category
              </span>
              {categoryData.length === 0 ? (
                <div className="h-[75%] flex items-center justify-center text-gray-500 text-sm">
                  No analytics available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={categoryData}>
                    <XAxis dataKey="category" stroke="#6b7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(10,17,40,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                    <Bar dataKey="count" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-4 glass p-5 rounded-3xl border border-gray-700/10 flex flex-col gap-4 shadow-xl justify-between">
              <div>
                <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] mb-2 block">
                  Incidents split by severity
                </span>
                {priorityData.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-gray-500 text-sm">
                    No analytics available yet.
                  </div>
                ) : (
                  <>
                    <div className="h-44 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                          <Pie data={priorityData} innerRadius={45} outerRadius={60} paddingAngle={3} dataKey="value">
                            {priorityData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {priorityData.length > 0 && (
                <div className="flex flex-col gap-1.5 text-[11px] font-mono leading-none">
                  {priorityData.map((d) => (
                    <div key={d.name} className="flex justify-between items-center bg-gray-500/5 p-2 rounded-lg">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        {d.name.toUpperCase()}
                      </span>
                      <span className="font-bold text-[var(--text-1)]">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="glass rounded-3xl p-6 border border-gray-700/10 shadow-2xl overflow-hidden">
          <span className="font-display font-semibold text-sm text-[var(--text-1)] block mb-4 border-b border-gray-700/10 pb-3">
            Grievances Field Dispatch Operations Dashboard
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700/15">
                  <th className="py-3 text-left">Incident Title</th>
                  <th className="py-3 text-left">Zone / Ward</th>
                  <th className="py-3 text-left">Reporter Label</th>
                  <th className="py-3 text-left">Severity</th>
                  <th className="py-3 text-left">Workflow State</th>
                  <th className="py-3 text-right">Dispatch Control</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const isHighlighted = highlightedId === issue.uid;
                  return (
                    <tr 
                      key={issue.uid} 
                      className={`border-b border-gray-700/10 hover:bg-[rgba(255,255,255,0.01)] transition-all duration-1000 ${
                        isHighlighted 
                          ? "bg-[var(--cyan)]/15 border-[var(--cyan)] shadow-[0_0_20px_rgba(0,229,255,0.15)] border-l-4 border-l-[var(--cyan)] pl-2" 
                          : ""
                      }`}
                    >
                      <td className="py-3 text-[var(--text-1)] font-bold max-w-[200px] truncate">
                        <div>{issue.title}</div>
                        {issue.category && (
                          <span className="text-[8px] font-mono font-bold text-purple-400 bg-purple-500/5 px-1 py-0.5 rounded border border-purple-500/10 mt-0.5 inline-block">
                            {issue.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-[var(--text-2)]">{issue.area || issue.ulb || "N/A"}</td>
                      <td className="py-3 text-gray-500">{issue.reportedByName || "Anonymous"}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          issue.priority === "Critical" ? "bg-[var(--red)]/10 text-[var(--red)]" 
                          : issue.priority === "High" ? "bg-orange-500/10 text-orange-400"
                          : "bg-gray-700/20 text-gray-400"
                        }`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-[9px] font-extrabold border ${
                          [STATUS.INSPECTION_STARTED, STATUS.RECOMMENDED_RESOLUTION, STATUS.RECOMMENDED_REJECTION, STATUS.AWAITING_HQ_REVIEW].includes(issue.status) ? "bg-[var(--blue)]/5 border-[var(--blue)]/20 text-[var(--blue)]"
                          : [STATUS.RESOLVED, STATUS.INSPECTION_COMPLETED].includes(issue.status) ? "bg-[var(--green)]/5 border-[var(--green)]/20 text-[var(--green)]"
                          : "bg-gray-500/5 border-gray-700/20 text-[var(--text-2)]"
                        }`}>{issue.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setStatusInput(issue.status as any);
                            setNotes(issue.recommendationRemarks || "");
                            setAfterPhoto(issue.resolutionImages?.[0] || "");
                          }}
                          className="p-1 px-3 bg-[var(--cyan)] hover:scale-103 transition-transform text-slate-950 rounded-lg font-bold cursor-pointer text-[10px]"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "imports" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel parse & mapping */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div 
              onDragOver={handleCSVDragOver}
              onDrop={handleCSVDrop}
              className="glass rounded-3xl p-8 text-center border-2 border-dashed border-gray-700 hover:border-[var(--cyan)] transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px]"
            >
              <Upload className="w-10 h-10 text-[var(--cyan)] mb-3 animate-bounce" />
              <div className="font-bold text-xs text-[var(--text-1)]">Drag and drop administrative Google Sheets CSV cargo</div>
              <p className="text-[10px] text-gray-500 mt-1">Or paste your tabular raw columns text index details directly</p>
            </div>

            {parsedRows.length > 0 && (
              <div className="glass p-5 rounded-2xl border border-slate-200/50 dark:border-white/10 flex flex-col gap-4 text-left">
                <span className="font-display font-bold text-xs uppercase text-amber-400">Parsed CSV: Record detected ({parsedRows.length} rows)</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Mapping Title Column</label>
                    <select
                      value={columnMappings["title"] || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, title: e.target.value })}
                      className="p-2.5 rounded-lg bg-[var(--bg-void)] border border-gray-700 text-xs text-[var(--text-1)]"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Mapping Description Column</label>
                    <select
                      value={columnMappings["description"] || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, description: e.target.value })}
                      className="p-2.5 rounded-lg bg-[var(--bg-void)] border border-gray-700 text-xs text-[var(--text-1)]"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Mapping Category Column (Optional)</label>
                    <select
                      value={columnMappings["category"] || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, category: e.target.value })}
                      className="p-2.5 rounded-lg bg-[var(--bg-void)] border border-gray-700 text-xs text-[var(--text-1)]"
                    >
                      <option value="">-- Select Column (or Auto Match) --</option>
                      {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Mapping Priority Column (Optional)</label>
                    <select
                      value={columnMappings["priority"] || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, priority: e.target.value })}
                      className="p-2.5 rounded-lg bg-[var(--bg-void)] border border-gray-700 text-xs text-[var(--text-1)]"
                    >
                      <option value="">-- Select Column (or default Medium) --</option>
                      {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Mapping Landmark / Address Column (Optional)</label>
                    <select
                      value={columnMappings["address"] || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, address: e.target.value })}
                      className="p-2.5 rounded-lg bg-[var(--bg-void)] border border-gray-700 text-xs text-[var(--text-1)]"
                    >
                      <option value="">-- Select Column (or default Mumbai) --</option>
                      {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={executeImport}
                  className="w-full py-3 bg-[var(--cyan)] text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-lg mt-2"
                >
                  Execute Cargo Pipeline Import
                </button>
                {importStatus && <span className="text-[10px] text-amber-400 font-mono italic animate-pulse">{importStatus}</span>}
              </div>
            )}
          </div>

          {/* Right batch history logs */}
          <div className="lg:col-span-4 glass rounded-3xl p-5 border border-gray-700/10 flex flex-col gap-4 shadow-xl">
            <span className="font-display font-bold text-xs uppercase text-[var(--text-2)] mb-2 block border-b border-gray-700/10 pb-3">Cargo Import Logs</span>

            {importBatchesList.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">No batch records processed yet.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {importBatchesList.map((batch) => (
                  <div key={batch.id} className="p-3 rounded-2xl bg-gray-500/5 text-xs flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-[var(--text-1)]">{batch.batchName}</span>
                      <span className="block text-[9px] text-gray-500 mt-0.5">Rows: {batch.rowCount} | Operator: {batch.importedBy}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBatch(batch.id, batch.type as any)}
                      className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold"
                    >
                      Cascade Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "duplicates" && (
        <div className="glass rounded-3xl p-6 border border-gray-700/10 shadow-2xl flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-gray-700/10 pb-3">
            <div>
              <span className="font-display font-semibold text-sm text-[var(--text-1)]">
                AI Semantic Merge Operations Dashboard
              </span>
              <p className="text-[10px] text-gray-500 mt-1">Scan existing logs for duplication patterns and merge datasets easily</p>
            </div>

            <button
              onClick={handleDuplicateScan}
              disabled={scanningDuplicates}
              className="px-4 py-2 bg-gradient-to-r from-[var(--cyan)] to-[var(--blue)] hover:scale-103 transition-transform text-slate-950 font-black rounded-xl text-[10px] cursor-pointer"
            >
              {scanningDuplicates ? "Scanning..." : "🤖 Scan Duplicates Pattern"}
            </button>
          </div>

          {duplicateScanResults.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500 italic">No duplicates identified in scanner trace buffer.</div>
          ) : (
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
              {duplicateScanResults.map((dup, dIdx) => (
                <div key={dIdx} className="p-4 rounded-2xl bg-amber-500/[0.01] border border-amber-500/15 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-[var(--text-1)]">Duplication Pattern Match</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[rgba(255,255,255,0.01)] p-2.5 rounded-xl">
                        <strong className="text-[10px] text-gray-500 block">PRIMARY INCIDENT REFERENCE</strong>
                        <span className="font-bold text-[var(--text-2)]">{dup.primaryIssueTitle}</span>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.01)] p-2.5 rounded-xl">
                        <strong className="text-[10px] text-gray-500 block">SECONDARY / DUPLICATED ROW</strong>
                        <span className="font-bold text-[var(--text-2)]">{dup.duplicateTitle}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-400 italic">"Reason: {dup.reason}"</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMergeAction(dup.primaryIssueId, dup.duplicateIssueId)}
                    className="p-2 bg-[var(--cyan)] text-slate-950 hover:scale-103 transition-transform font-bold rounded-lg text-[10px] self-end md:self-center"
                  >
                    Merge Duplicate Record
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INSPECT ACTION STATUS DIALOG */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] overflow-hidden">
          <div className="glass max-w-4xl w-full rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/10 flex flex-col gap-6 text-left relative max-h-[90vh] overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedIssue(null)}
              className="absolute top-5 right-5 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.03)] transition-all z-10 font-bold"
              title="Close Details Modal"
            >
              ✕
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--cyan)] font-mono flex items-center gap-2 flex-wrap">
                <span>{selectedIssue.category || "General Incident"}</span>
                <span>•</span>
                <span>Reference: {selectedIssue.complaintId}</span>
              </span>
              <h3 className="font-display font-extrabold text-xl md:text-2xl text-[var(--text-1)] mt-1">
                {selectedIssue.title}
              </h3>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start overflow-y-auto">
              {/* Left Column: Full Report Information */}
              <div className="lg:col-span-7 flex flex-col gap-5 lg:pr-2 pb-4">
                {/* Image Section */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider flex items-center gap-1.5">
                    🖼️ Original Report Photograph
                  </span>
                  <div className="relative h-56 w-full rounded-2xl border border-gray-750 bg-gray-950/40 overflow-hidden flex items-center justify-center shadow-inner">
                    {selectedIssue.imageUrl ? (
                      <img 
                        src={selectedIssue.imageUrl} 
                        referrerPolicy="no-referrer" 
                        alt={selectedIssue.title} 
                        className="w-full h-full object-cover" 
                      />
                    ) : selectedIssue.imageData ? (
                      <img 
                        src={selectedIssue.imageData} 
                        alt={selectedIssue.title} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="text-center p-6 flex flex-col items-center gap-2">
                        <span className="text-xs text-gray-500 italic">No illustration photograph was uploaded with this grievance.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider">
                    📝 Detailed Description
                  </span>
                  <div className="p-4 bg-[rgba(255,255,255,0.01)] rounded-2xl border border-gray-700/15 text-xs leading-relaxed text-[var(--text-2)] whitespace-pre-line shadow-sm min-h-[80px]">
                    {selectedIssue.description || "No supplemental details provided."}
                  </div>
                </div>

                {/* Reporter and Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 p-4 bg-gray-500/5 rounded-2xl border border-gray-700/10 text-left">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono flex items-center gap-1.5">
                      👤 Reporter Details
                    </span>
                    <div className="text-xs flex flex-col gap-1 mt-1">
                      <div>
                        <span className="text-gray-500 text-[10px] block font-sans">NAME</span>
                        <strong className="text-[var(--text-1)]">{selectedIssue.reportedByName || "Anonymous Resident"}</strong>
                      </div>
                      {reporterEmail && (
                        <div className="mt-1">
                          <span className="text-gray-500 text-[10px] block font-sans">EMAIL</span>
                          <strong className="text-[var(--text-2)] break-all">
                            {reporterEmail}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-4 bg-gray-500/5 rounded-2xl border border-gray-700/10 text-left">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono flex items-center gap-1.5">
                      📆 Metadata & Date
                    </span>
                    <div className="text-xs flex flex-col gap-1 mt-1">
                      <div>
                        <span className="text-gray-500 text-[10px] block font-sans font-normal">TIMESTAMP</span>
                        <strong className="text-[var(--text-1)]">
                          {(() => {
                            const ts = selectedIssue.createdAt;
                            if (!ts) return "N/A";
                            if (typeof ts === "string") return new Date(ts).toLocaleString();
                            if (ts.toDate && typeof ts.toDate === "function") return ts.toDate().toLocaleString();
                            if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
                            return new Date(ts).toLocaleString();
                          })()}
                        </strong>
                      </div>
                      <div className="mt-1.5 flex justify-between items-center">
                        <div>
                          <span className="text-gray-500 text-[10px] block font-sans font-normal">SOURCE CHANNEL</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold capitalize mt-0.5 ${
                            selectedIssue.source === "csv_import" ? "bg-amber-400/10 text-amber-400"
                            : selectedIssue.source === "survey_import" ? "bg-blue-400/10 text-blue-400"
                            : "bg-[var(--cyan)]/10 text-[var(--cyan)]"
                          }`}>
                            {selectedIssue.source === "csv_import" ? "CSV Pipeline" : selectedIssue.source === "survey_import" ? "Survey Feed" : "Platform App"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block font-sans font-normal">PRIORITY</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase mt-0.5 ${
                            selectedIssue.priority === "Critical" ? "bg-[var(--red)]/10 text-[var(--red)]"
                            : selectedIssue.priority === "High" ? "bg-orange-500/10 text-orange-400"
                            : "bg-gray-700/20 text-gray-400"
                          }`}>
                            {selectedIssue.priority || "Medium"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="flex flex-col gap-2 p-4 bg-gray-500/5 rounded-2xl border border-gray-700/10 text-left">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono flex items-center gap-1.5">
                    📍 Area & Geographic Location
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 text-xs text-left">
                    <div>
                      <span className="text-gray-500 text-[10px] block font-sans">WARD / ZONE</span>
                      <strong className="text-[var(--text-1)]">{selectedIssue.area || selectedIssue.ulb || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block font-sans">COORDINATES</span>
                      <strong className="text-[var(--text-2)] font-mono">{selectedIssue.latitude?.toFixed(6) ?? "19.119700"}, {selectedIssue.longitude?.toFixed(6) ?? "72.846800"}</strong>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700/10 text-left">
                    <span className="text-gray-500 text-[10px] block font-sans">PROVIDED ADDRESS</span>
                    <strong className="text-[var(--text-1)] text-[11px] block mt-0.5 leading-snug">{selectedIssue.landmark || "No strict address provided."}</strong>
                  </div>
                </div>

                {/* Inspection Notes Block (only show if available) */}
                {(selectedIssue.workCompleted || selectedIssue.materialsUsed || selectedIssue.estimatedCost || selectedIssue.timeSpent || selectedIssue.inspectionRemarks) && (
                  <div className="flex flex-col gap-2 p-4 bg-gray-500/5 rounded-2xl border border-gray-700/10 text-left mt-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono flex items-center gap-1.5 border-b border-gray-750 pb-2 mb-1">
                      📋 Inspection Notes
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-1">
                      {selectedIssue.workCompleted && (
                        <div>
                          <span className="text-gray-500 text-[10px] block font-sans">WORK COMPLETED</span>
                          <strong className="text-[var(--text-1)]">{selectedIssue.workCompleted}</strong>
                        </div>
                      )}
                      {selectedIssue.materialsUsed && (
                        <div>
                          <span className="text-gray-500 text-[10px] block font-sans">MATERIALS USED</span>
                          <strong className="text-[var(--text-1)]">{selectedIssue.materialsUsed}</strong>
                        </div>
                      )}
                      {selectedIssue.estimatedCost && (
                        <div>
                          <span className="text-gray-500 text-[10px] block font-sans">ESTIMATED COST</span>
                          <strong className="text-[var(--text-1)]">₹{selectedIssue.estimatedCost}</strong>
                        </div>
                      )}
                      {selectedIssue.timeSpent && (
                        <div>
                          <span className="text-gray-500 text-[10px] block font-sans">TIME SPENT</span>
                          <strong className="text-[var(--text-1)]">{selectedIssue.timeSpent}</strong>
                        </div>
                      )}
                    </div>
                    {selectedIssue.inspectionRemarks && (
                      <div className="mt-2 pt-2 border-t border-gray-700/10 text-left">
                        <span className="text-gray-500 text-[10px] block font-sans">REMARKS</span>
                        <strong className="text-[var(--text-1)] text-[11px] block mt-0.5 leading-snug">{selectedIssue.inspectionRemarks}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Citizen Rating Block */}
                {selectedIssue.rating && (
                  <div className="flex flex-col gap-2 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/20 text-left mt-1">
                    <span className="text-[10px] uppercase font-bold text-yellow-500 font-mono flex items-center gap-1.5 border-b border-yellow-500/20 pb-2 mb-1">
                      ⭐ Citizen Resolution Rating
                    </span>
                    <div className="flex gap-1 mt-1 mb-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= selectedIssue.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                      ))}
                    </div>
                    {selectedIssue.ratingFeedback && (
                      <div className="mt-1 pt-1 border-t border-yellow-500/10 text-left">
                        <span className="text-yellow-500 text-[10px] block font-sans">FEEDBACK</span>
                        <strong className="text-yellow-100 text-[11px] block mt-0.5 leading-snug italic">"{selectedIssue.ratingFeedback}"</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Citizens Comments Thread block */}
                <div className="flex flex-col gap-2.5 p-4 bg-gray-500/5 rounded-2xl border border-gray-700/10 text-left mt-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-mono flex items-center gap-1.5 border-b border-gray-750 pb-2 mb-1">
                    💬 Citizen Comments Thread & Feedbacks
                  </span>
                  
                  {(!selectedIssue.comments || selectedIssue.comments.length === 0) ? (
                    <p className="text-[10px] text-gray-500 italic text-center py-2">No comments have been posted on this issue yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
                      {selectedIssue.comments.map((com, idx) => (
                        <div key={com.userUID || idx} className="p-2 bg-[rgba(255,255,255,0.01)] border border-gray-750 rounded-xl text-[11px]">
                          <div className="flex justify-between items-center mb-1">
                            <strong className="text-gray-300 font-bold">{com.userName}</strong>
                            <span className="text-[8px] text-gray-500 font-mono">
                              {new Date(com.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-400 leading-normal whitespace-pre-wrap">{com.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Field Dispatch Actions */}
              <div className="lg:col-span-5 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-gray-750 pt-5 lg:pt-0 lg:pl-6 justify-between text-left pb-4">
                <div className="flex flex-col gap-5">
                  <div className="pb-1 border-b border-gray-750 text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
                      ⚙️ Dispatch Control Centre
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">Process this grievance in real-time following strict protocol.</p>
                  </div>

                  {selectedIssue.status === STATUS.ASSIGNED && (
                    <button
                      onClick={handleAccept}
                      disabled={isSubmitting}
                      className="w-full py-3.5 mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs hover:scale-101 transition-all disabled:opacity-50 cursor-pointer shadow-lg"
                    >
                      {isSubmitting ? "Processing..." : "Accept Case"}
                    </button>
                  )}

                  {selectedIssue.status === STATUS.ACCEPTED && (
                    <button
                      onClick={handleStart}
                      disabled={isSubmitting}
                      className="w-full py-3.5 mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs hover:scale-101 transition-all disabled:opacity-50 cursor-pointer shadow-lg"
                    >
                      {isSubmitting ? "Processing..." : "Start Inspection"}
                    </button>
                  )}

                  {selectedIssue.status === STATUS.INSPECTION_STARTED && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Before Images (Max 5, 5MB each)</label>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFileChange(e, 'before')}
                          className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--cyan)] file:text-slate-950 hover:file:bg-[var(--cyan)]/90"
                        />
                        <div className="text-[10px] text-gray-500">{beforeFiles.length} files selected</div>
                        {beforeFiles.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto mt-2 pb-2">
                            {beforeFiles.map((f, i) => (
                              <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-700 flex-shrink-0 group">
                                <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="Before preview" />
                                <button onClick={() => removeFile(i, 'before')} className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">After Images (Max 5, 5MB each)</label>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleFileChange(e, 'after')}
                          className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--cyan)] file:text-slate-950 hover:file:bg-[var(--cyan)]/90"
                        />
                        <div className="text-[10px] text-gray-500">{afterFiles.length} files selected</div>
                        {afterFiles.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto mt-2 pb-2">
                            {afterFiles.map((f, i) => (
                              <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-700 flex-shrink-0 group">
                                <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="After preview" />
                                <button onClick={() => removeFile(i, 'after')} className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Work Completed</label>
                        <input
                          type="text"
                          value={workCompleted}
                          onChange={(e) => setWorkCompleted(e.target.value)}
                          placeholder="e.g. Patched 3 potholes on main road"
                          className="p-3 bg-[rgba(255,255,255,0.02)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Materials Used</label>
                        <input
                          type="text"
                          value={materialsUsed}
                          onChange={(e) => setMaterialsUsed(e.target.value)}
                          placeholder="e.g. 50kg asphalt, 10 liters tar"
                          className="p-3 bg-[rgba(255,255,255,0.02)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Estimated Cost (₹)</label>
                          <input
                            type="number"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                            placeholder="e.g. 4500"
                            className="p-3 bg-[rgba(255,255,255,0.02)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none"
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Time Spent</label>
                          <input
                            type="text"
                            value={timeSpent}
                            onChange={(e) => setTimeSpent(e.target.value)}
                            placeholder="e.g. 4 hours"
                            className="p-3 bg-[rgba(255,255,255,0.02)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Inspection Remarks</label>
                        <textarea
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Log repair details, dispatched engineers, material audits, progress updates..."
                          className="p-3 bg-[rgba(255,255,255,0.02)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none resize-none"
                        />
                      </div>

                      {isSubmitting && (uploadProgress > 0) && (
                        <div className="w-full flex flex-col gap-2 mt-2">
                          <div className="w-full bg-gray-800 rounded-full h-1.5">
                            <div className="bg-[var(--cyan)] h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                          <div className="text-[10px] text-[var(--cyan)] font-mono text-center">{uploadStatusText}</div>
                        </div>
                      )}

                      <button
                        onClick={handleComplete}
                        disabled={isSubmitting}
                        className="w-full py-3.5 mt-2 bg-[var(--cyan)] hover:bg-[var(--cyan)]/90 text-slate-950 font-bold rounded-xl text-xs hover:scale-101 transition-all disabled:opacity-50 cursor-pointer shadow-lg block relative overflow-hidden"
                      >
                        <span className="relative z-10">{isSubmitting ? "Uploading Evidence..." : "Complete Inspection"}</span>
                      </button>
                    </div>
                  )}

                  {selectedIssue.status === STATUS.INSPECTION_COMPLETED && (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Recommendation</label>
                        <select
                          value={recommendation}
                          onChange={(e: any) => setRecommendation(e.target.value)}
                          className="p-3 bg-[var(--bg-void)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none"
                        >
                          <option value="RESOLVE">Recommend Resolve</option>
                          <option value="REJECT">Recommend Reject</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Recommendation Remarks</label>
                        <textarea
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Explain why this issue should be resolved or rejected..."
                          className="p-3 bg-[rgba(255,255,255,0.02)] border border-gray-700 text-xs text-white rounded-xl focus:border-[var(--cyan)] outline-none resize-none"
                        />
                      </div>

                      <button
                        onClick={handleRecommend}
                        disabled={isSubmitting}
                        className="w-full py-3.5 mt-2 bg-[var(--green)] hover:bg-[var(--green)]/90 text-white font-bold rounded-xl text-xs hover:scale-101 transition-all disabled:opacity-50 cursor-pointer shadow-lg block"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Recommendation"}
                      </button>
                    </div>
                  )}

                  {[STATUS.AWAITING_HQ_REVIEW, STATUS.RESOLVED, STATUS.REJECTED].includes(selectedIssue.status as any) && (
                    <div className="flex flex-col gap-2">
                      <div className="p-4 bg-[var(--cyan)]/10 border border-[var(--cyan)]/20 rounded-xl text-center text-[var(--cyan)] text-xs font-bold">
                        Protocol Completed. Currently: {selectedIssue.status}
                      </div>
                      {selectedIssue.status === STATUS.RESOLVED && (
                        <button
                          onClick={() => generateResolutionCertificate(selectedIssue, user)}
                          className="w-full py-3 bg-[var(--cyan)]/20 text-[var(--cyan)] font-bold rounded-xl text-xs hover:bg-[var(--cyan)]/30 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Download className="w-4 h-4" /> Download Resolution Report (PDF)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
