import { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Search, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  FileText, 
  Sparkles, 
  PieChart as PieIcon, 
  ChevronRight, 
  Zap, 
  RefreshCw,
  Clock
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { telanganaULBData, TelanganaULBRecord } from "../data/telanganaStatistics";

declare const L: any; // Leaflet script is loaded in main index.html CDN

export default function TelanganaDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "critical" | "flawless" | "high-volume">("all");
  const [selectedUlb, setSelectedUlb] = useState<TelanganaULBRecord | null>(null);
  
  // Local theme state synchronized via MutationObserver
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark" | "">("");

  useEffect(() => {
    const checkTheme = () => {
      const activeTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "dark";
      setCurrentTheme(activeTheme);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    return () => observer.disconnect();
  }, []);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  // 1. Calculate general summary stats dynamically
  const totalReceived = telanganaULBData.reduce((acc, curr) => acc + curr.received, 0);
  const totalCompleted = telanganaULBData.reduce((acc, curr) => acc + curr.completed, 0);
  const totalPending = telanganaULBData.reduce((acc, curr) => acc + curr.pending, 0);
  const averageCompletionRate = Number((telanganaULBData.reduce((acc, curr) => acc + curr.completionRate, 0) / telanganaULBData.length).toFixed(2));
  
  // Top pending ULBs (Critical alert areas)
  const sortedByPending = [...telanganaULBData].sort((a, b) => b.pending - a.pending);
  const criticalList = telanganaULBData.filter(item => item.pending > 10);
  const flawlessList = telanganaULBData.filter(item => item.completionRate === 100);
  const highVolumeList = telanganaULBData.filter(item => item.received >= 1000);

  // Filter actual data based on search and selected active statistics filter
  const filteredRecords = telanganaULBData.filter(item => {
    const matchesSearch = item.ulb.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === "critical") return item.pending > 10;
    if (filterType === "flawless") return item.completionRate === 100;
    if (filterType === "high-volume") return item.received >= 1000;
    return true;
  });

  // Recharts: Highest Pending ULBs
  const topPendingChartData = sortedByPending.slice(0, 8).map(item => ({
    name: item.ulb,
    Pending: item.pending,
    Received: item.received,
    Rate: item.completionRate
  }));

  // Recharts: High Volume Solvers
  const topReceivedChartData = [...telanganaULBData]
    .sort((a, b) => b.received - a.received)
    .slice(0, 8)
    .map(item => ({
      name: item.ulb,
      Received: item.received,
      Completed: item.completed
    }));

  // Map Setup
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof L === "undefined") {
      console.warn("Leaflet library not pre-loaded on page.");
      return;
    }

    // Centered around Telangana coordinates [17.85, 79.15]
    const map = L.map(mapContainerRef.current).setView([17.85, 79.15], 8);
    mapRef.current = map;

    // CartoDB dark or light basemap tiling
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution: '&copy; Telangana State OS & OpenStreetMap'
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Markers to Map
  useEffect(() => {
    if (!mapRef.current || typeof L === "undefined") return;

    // Clear existing markers
    Object.keys(markersRef.current).forEach(key => {
      mapRef.current.removeLayer(markersRef.current[key]);
    });
    markersRef.current = {};

    filteredRecords.forEach(record => {
      // Color strategy: Red/Orange for pending, Green for completely solved (100%), Cyan for high volume with good completion
      let markerColor = "#fd7e14"; // Orange high volume or standard
      if (record.completionRate === 100) {
        markerColor = "#00ffa3"; // Flawless green
      } else if (record.pending > 15) {
        markerColor = "#ff2d6b"; // Critical red alert
      } else if (record.received > 5000) {
        markerColor = "#00e5ff"; // Mega-volume blue
      }

      // Radius size proportional to received volume (clamped for visual fit)
      const radius = Math.max(6, Math.min(24, Math.sqrt(record.received) * 0.2 + 5));

      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            width: ${radius * 2}px; 
            height: ${radius * 2}px; 
            background: ${markerColor}2c; 
            border: 2px solid ${markerColor}; 
            border-radius: 50%; 
            box-shadow: 0 0 12px ${markerColor};
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease-in-out;
          ">
            <span style="font-size: 8px; color: ${markerColor}; font-weight: 800;">
              ${record.pending > 0 ? record.pending : "✓"}
            </span>
          </div>
          ${record.pending >= 15 ? `
            <div style="
              position: absolute;
              width: ${radius * 3.5}px;
              height: ${radius * 3.5}px;
              border: 1px solid ${markerColor};
              border-radius: 50%;
              animation: map-ping-anim 2s infinite ease-out;
            "></div>
          ` : ""}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "telangana-marker-icon",
        iconSize: [radius * 2, radius * 2],
        iconAnchor: [radius, radius]
      });

      const marker = L.marker([record.lat, record.lng], { icon: customIcon }).addTo(mapRef.current);
      markersRef.current[record.ulb] = marker;

      // Popup details
      const popupContent = `
        <div class="p-3 text-left leading-normal" style="min-width: 220px; font-family: var(--font-sans);">
          <div class="flex items-center justify-between border-b border-gray-700/10 pb-1.5 mb-1.5">
            <span class="font-display font-semibold text-xs uppercase tracking-wider text-[var(--cyan)]">
              🏢 ${record.ulb} ULB
            </span>
            <span class="px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-950" style="background-color: ${markerColor};">
              ${record.completionRate}% Done
            </span>
          </div>

          <div class="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[10px] text-gray-500 font-mono mb-2">
            <div>
              <span>RECEIVED:</span>
              <strong class="text-[var(--text-1)] block text-xs font-sans">${record.received.toLocaleString()}</strong>
            </div>
            <div>
              <span>RESOLVED:</span>
              <strong class="text-emerald-400 block text-xs font-sans">${record.completed.toLocaleString()}</strong>
            </div>
            <div>
              <span>PENDING STATUS:</span>
              <strong class="${record.pending > 0 ? 'text-rose-400' : 'text-emerald-400'} block text-xs font-sans">${record.pending}</strong>
            </div>
            <div>
              <span>RANK CATEGORY:</span>
              <span class="text-[var(--text-1)] block font-sans">${record.received > 10000 ? "Metropolitan" : record.received > 1000 ? "Major City" : "Local Body"}</span>
            </div>
          </div>

          <button 
            id="view-ulb-btn-${record.ulb.replace(/\s+/g, '-')}"
            style="width: 100%;"
            class="px-2.5 py-1 text-center bg-gray-800 hover:bg-gray-750 font-bold font-sans text-[9px] rounded-lg border border-gray-700/40 text-[var(--cyan)] mt-1 cursor-pointer transition-all"
          >
            Load Specific Analytics &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-ulb-btn-${record.ulb.replace(/\s+/g, '-')}`);
        if (btn) {
          btn.onclick = () => {
            setSelectedUlb(record);
          };
        }
      });
    });
  }, [filteredRecords]);

  // Handle flying & zoom transitions to selected ULB
  const handleSelectUlbItem = (record: TelanganaULBRecord) => {
    setSelectedUlb(record);
    if (mapRef.current && record.lat && record.lng) {
      mapRef.current.flyTo([record.lat, record.lng], 11, { duration: 1.5 });
      const marker = markersRef.current[record.ulb];
      if (marker) {
        setTimeout(() => marker.openPopup(), 1500);
      }
    }
  };

  // Sync map tiles dynamically when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const tileUrl = currentTheme === "light" 
      ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    // Remove existing tilelayers & append new theme
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    L.tileLayer(tileUrl, {
      attribution: '&copy; Telangana State OS & OpenStreetMap'
    }).addTo(mapRef.current);
  }, [currentTheme]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fadeIn text-left">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 dark:border-gray-800/60 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--cyan)] font-mono text-xs uppercase tracking-widest font-bold">
            <TrendingUp className="w-4 h-4 animate-pulse" /> Telangana State Command Center
          </div>
          <h1 className="font-display font-black text-3xl md:text-4xl text-[var(--text-1)] tracking-tight mt-1">
            Grievance Redressal Board Map Analyzer
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Real-time diagnostic analytics, coverage metrics and strategic AI resource dispatch logs compiled across 72 Telangana Urban Local Bodies (ULBs).
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => {
              setSearchTerm("");
              setFilterType("all");
              setSelectedUlb(null);
              mapRef.current?.setView([17.85, 79.15], 8);
            }}
            className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-[var(--text-1)] rounded-xl border border-slate-200 dark:border-gray-800/60 transition-all text-xs flex items-center gap-2 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset View
          </button>
        </div>
      </div>

      {/* Grid: 4 Core Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 flex flex-col gap-1 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--cyan)]/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12 transition-transform group-hover:scale-125" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Total Grievances Received</span>
          <span className="font-display font-black text-2xl md:text-3xl text-[var(--text-1)] tracking-tight">
            {totalReceived.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3 text-[var(--cyan)]" /> Tracked State-wide
          </span>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 flex flex-col gap-1 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12 transition-transform group-hover:scale-125" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Successfully Completed</span>
          <span className="font-display font-black text-2xl md:text-3xl text-emerald-400 tracking-tight">
            {totalCompleted.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> High resolution delivery
          </span>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 flex flex-col gap-1 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12 transition-transform group-hover:scale-125" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Active Pending Alerts</span>
          <span className="font-display font-black text-2xl md:text-3xl text-rose-400 tracking-tight">
            {totalPending.toLocaleString()}
          </span>
          <span className="text-[10px] text-rose-400/80 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Immediate intervention items
          </span>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-gray-800/60 flex flex-col gap-1 text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12 transition-transform group-hover:scale-125" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">State Avg Completion Rate</span>
          <span className="font-display font-black text-2xl md:text-3xl text-amber-400 tracking-tight">
            {averageCompletionRate}%
          </span>
          <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Outperforming targets
          </span>
        </div>

      </div>

      {/* Main Content Splitting: Map & List Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-12">
        
        {/* Map Column (Colspan 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass rounded-3xl p-4 border border-slate-200 dark:border-gray-800/60 flex flex-col h-[520px] relative overflow-hidden">
            <span className="font-display font-bold text-xs uppercase text-gray-400 block mb-3 px-1">
              🗺️ Interactive Coverage Map (Leaflet Visualization)
            </span>
            
            {/* Map wrapper container ref */}
            <div className="flex-grow rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 relative z-10">
              <div ref={mapContainerRef} className="w-full h-full z-10" />
            </div>

            {/* Quick Map Overlay legend indicators */}
            <div className="absolute bottom-6 right-6 z-30 glass border border-slate-200 dark:border-gray-800/60 px-3.5 py-2.5 rounded-2xl flex flex-col gap-1.5 text-[9px] font-mono shadow-2xl">
              <span className="font-bold text-[10px] text-[var(--text-1)] border-b border-slate-200 dark:border-gray-800/60 pb-1 mb-1">LEGEND DISPATCH</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff2d6b]" />
                <span className="text-gray-400">Critical Alert (&gt;10 Pending)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fd7e14]" />
                <span className="text-gray-400">Standard Pending (&gt;0 Pending)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00ffa3]" />
                <span className="text-gray-400">Flawless Resolution (100% Solved)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar List and Details Container (Colspan 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[520px]">
          
          <div className="glass rounded-3xl border border-slate-200 dark:border-gray-800/60 p-5 flex flex-col h-full">
            <span className="font-display font-semibold text-xs text-gray-400 uppercase tracking-widest block mb-3">
              🔍 Local Bodies Master List ({filteredRecords.length})
            </span>

            {/* In-app Search Field */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ULB or city..."
                className="pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-gray-700/60 focus:border-[var(--cyan)] outline-none text-xs text-[var(--text-1)] w-full transition-all"
              />
            </div>

            {/* Quick Filter Pill Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                { id: "all", label: "All Districts" },
                { id: "critical", label: "⚠️ Critical", count: criticalList.length },
                { id: "flawless", label: "✓ Flawless", count: flawlessList.length },
                { id: "high-volume", label: "📊 Heavy-Load", count: highVolumeList.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    filterType === tab.id 
                      ? "bg-[var(--cyan)]/15 text-[var(--cyan)] border-[var(--cyan)]/40" 
                      : "bg-transparent text-gray-400 border border-slate-200 dark:border-gray-800/60 hover:text-[var(--text-1)]"
                  }`}
                >
                  {tab.label} {tab.count !== undefined && `(${tab.count})`}
                </button>
              ))}
            </div>

            {/* Scrollable list content */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-2 max-h-[350px] pr-1 scrollbar-styled">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-500 italic">No Telangana districts match search criteria.</div>
              ) : (
                filteredRecords.map(rec => {
                  const isSelect = selectedUlb?.ulb === rec.ulb;
                  return (
                    <div
                      key={rec.ulb}
                      onClick={() => handleSelectUlbItem(rec)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                        isSelect 
                          ? "border-[var(--cyan)] bg-[var(--cyan)]/[0.03]" 
                          : "border-slate-200 dark:border-gray-800/60 bg-transparent hover:border-slate-300 dark:hover:border-gray-750 hover:bg-slate-50 dark:hover:bg-gray-800/10"
                      }`}
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="font-display font-bold text-xs text-[var(--text-1)] truncate flex items-center gap-1.5">
                          {rec.ulb} 
                          {rec.pending > 10 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>Rec: <strong>{rec.received}</strong></span>
                          <span>Pend: <strong className={rec.pending > 0 ? "text-rose-400" : "text-emerald-400"}>{rec.pending}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 font-mono">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          rec.completionRate === 100 ? "text-emerald-400 bg-emerald-500/10" 
                          : rec.completionRate < 95 ? "text-rose-400 bg-rose-500/10"
                          : "text-amber-400 bg-amber-500/10"
                        }`}>
                          {rec.completionRate}%
                        </span>
                        <span className="text-[8px] text-gray-500 uppercase tracking-widest">Rate</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Floating Detailed Analysis on Selected ULB */}
      {selectedUlb && (
        <div className="glass rounded-3xl p-6 border border-[var(--cyan)]/30 shadow-[0_0_30px_rgba(0,229,255,0.08)] mb-8 animate-fadeIn text-left">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[var(--cyan)]/10 text-[var(--cyan)]">
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-black text-lg text-[var(--text-1)]">
                  {selectedUlb.ulb} District Analysis Profile
                </h3>
                <p className="text-xs text-gray-500">Geo Positioning: {selectedUlb.lat.toFixed(4)}° N, {selectedUlb.lng.toFixed(4)}° E</p>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedUlb(null)}
              className="text-xs font-semibold px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-[var(--text-1)] transition-colors cursor-pointer"
            >
              ✕ Close Diagnostics
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Volume Burden Rank</span>
              <span className="font-display font-bold text-sm text-[var(--text-1)] mt-1">
                {selectedUlb.received > 10000 ? "🔴 Severe (Metropolitan Class)" : selectedUlb.received > 1000 ? "🟡 High Load (City Class)" : "🟢 Light (Local Body)"}
              </span>
              <p className="text-[9px] text-gray-500 leading-normal mt-1">This ranks the total incoming capacity load on staff members.</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Historical Redressal Performance</span>
              <span className="font-display font-bold text-sm text-[var(--text-1)] mt-1">
                {selectedUlb.completionRate === 100 ? "🌟 Flawless (100% Solved)" : selectedUlb.completionRate >= 99 ? "🚀 Elite (>=99% Solved)" : selectedUlb.completionRate >= 95 ? "👍 Compliant (>=95% Solved)" : "⚠️ Action Required (<95% Solved)"}
              </span>
              <p className="text-[9px] text-gray-500 leading-normal mt-1">Completion rate categorizations for municipal oversight metrics.</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Staff Resource Index (Est)</span>
              <span className="font-display font-bold text-sm text-[var(--text-1)] mt-1">
                {selectedUlb.pending > 10 ? "⚠️ Highly Understaffed" : "✓ Adequately Staffed"}
              </span>
              <p className="text-[9px] text-gray-500 leading-normal mt-1">Estimated workforce requirements based on current pending backlogs.</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex flex-col gap-0.5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">State Burden Share</span>
              <span className="font-display font-bold text-sm text-[var(--text-1)] mt-1">
                {((selectedUlb.received / totalReceived) * 100).toFixed(2)}% of State Load
              </span>
              <p className="text-[9px] text-gray-500 leading-normal mt-1">This represents the percentage of all state grievances lodged within this local body.</p>
            </div>

          </div>
        </div>
      )}

      {/* Visual Analytics Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* Chart 1: Top Critical Action Areas (Highest Pending) */}
        <div className="glass rounded-3xl p-6 border border-slate-200 dark:border-gray-800/60 flex flex-col justify-between">
          <div>
            <span className="font-display font-semibold text-xs tracking-wider text-gray-500 uppercase block mb-1">
              Bar Chart Diagnostics
            </span>
            <h3 className="font-display font-bold text-base text-[var(--text-1)] mb-4">
              🚨 Top Critical Action Areas (Most Pending Claims)
            </h3>
          </div>
          
          <div className="h-64 w-full cursor-default select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPendingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: currentTheme === "dark" ? "#060a15" : "#ffffff", 
                    borderColor: currentTheme === "dark" ? "#1e293b" : "#cbd5e1", 
                    color: currentTheme === "dark" ? "#ffffff" : "#0f172a",
                    borderRadius: "12px", 
                    fontSize: "11px" 
                  }}
                  labelStyle={{ 
                    color: currentTheme === "dark" ? "#00e5ff" : "#4f46e5", 
                    fontWeight: "bold" 
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="Pending" fill="#ff2d6b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-500 leading-normal mt-3">
             <strong>Warangal State Segment</strong> has the highest absolute outstanding records ({sortedByPending[0]?.pending} open complaints), marking it as the primary urgent action point.
          </p>
        </div>

        {/* Chart 2: Extreme Load Handlers (Highest Received Grievances) */}
        <div className="glass rounded-3xl p-6 border border-slate-200 dark:border-gray-800/60 flex flex-col justify-between">
          <div>
            <span className="font-display font-semibold text-xs tracking-wider text-gray-500 uppercase block mb-1">
              Load Analysis
            </span>
            <h3 className="font-display font-bold text-base text-[var(--text-1)] mb-4">
              📦 Elite Volume Workhorse local bodies
            </h3>
          </div>

          <div className="h-64 w-full cursor-default select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topReceivedChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: currentTheme === "dark" ? "#060a15" : "#ffffff", 
                    borderColor: currentTheme === "dark" ? "#1e293b" : "#cbd5e1", 
                    color: currentTheme === "dark" ? "#ffffff" : "#0f172a",
                    borderRadius: "12px", 
                    fontSize: "11px" 
                  }}
                  labelStyle={{ 
                    color: currentTheme === "dark" ? "#00ffa3" : "#16a34a", 
                    fontWeight: "bold" 
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="Received" fill="#00e5ff" radius={[4, 4, 0, 0]} />
                <Bar key="Completed" dataKey="Completed" fill="#00ffa3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-500 leading-normal mt-3">
            <strong>Boduppal ({telanganaULBData.find(u => u.ulb === "Boduppal")?.received.toLocaleString()})</strong> and <strong>Nizamabad ({telanganaULBData.find(u => u.ulb === "Nizamabad")?.received.toLocaleString()})</strong> process astonishingly high volumes with nearly perfect resolution efficiency.
          </p>
        </div>

      </div>

      <style>{`
        @keyframes map-ping-anim {
          0% {
            transform: scale(0.6);
            opacity: 1;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        .telangana-marker-icon {
          background: none !important;
          border: none !important;
        }
        .scrollbar-styled::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-styled::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-styled::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }
        .scrollbar-styled::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
