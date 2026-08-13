import React, { useState, useMemo } from "react";
import { 
  Globe, 
  Layers, 
  MapPin, 
  Flame, 
  ShieldCheck, 
  Clock, 
  Activity, 
  Users, 
  BarChart3, 
  Filter 
} from "lucide-react";
import { Issue, UserProfile } from "../types";
import { getGISLayerData, generateWeightedHeatmapPoints, GISLayerType } from "../services/gisEngine";
import { filterGISComplaints, GISFilters } from "../utils/gisFilter";
import { generateHeatmapClusters } from "../services/heatmapEngine";

interface Props {
  issues: Partial<Issue>[];
  inspectors?: UserProfile[];
}

export default function ExecutiveGISDashboard({ issues, inspectors = [] }: Props) {
  const [activeLayer, setActiveLayer] = useState<GISLayerType>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");

  const filters: GISFilters = useMemo(() => ({
    district: selectedDistrict
  }), [selectedDistrict]);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    const layerFiltered = getGISLayerData(issues, activeLayer);
    return filterGISComplaints(layerFiltered, filters);
  }, [issues, activeLayer, filters]);

  // Spatial Clusters / Hotspots
  const clusters = useMemo(() => generateHeatmapClusters(filteredIssues, 2.0), [filteredIssues]);
  const criticalHotspotsCount = clusters.filter((c) => c.riskLevel === "CRITICAL").length;

  // Weighted Heatmap Points
  const heatmapPoints = useMemo(() => generateWeightedHeatmapPoints(filteredIssues), [filteredIssues]);

  // District Comparison Data
  const districtStats = useMemo(() => {
    const map: Record<string, { count: number; critical: number }> = {};
    issues.forEach((i) => {
      const dist = i.district || "Unassigned";
      if (!map[dist]) map[dist] = { count: 0, critical: 0 };
      map[dist].count++;
      if (i.priority === "Critical") map[dist].critical++;
    });
    return Object.entries(map).map(([district, data]) => ({ district, ...data }));
  }, [issues]);

  const activeInspectorsCount = inspectors.filter(
    (u) => u.role === "FIELD_INSPECTOR"
  ).length || 4;

  const coveragePct = Math.min(Math.round((filteredIssues.length / Math.max(issues.length, 1)) * 100), 100);

  return (
    <div className="my-6 p-6 rounded-3xl bg-[#0b0f19]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-slate-100">
                Executive Smart City GIS Dashboard
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                Spatial GIS Layer Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Point-In-Polygon boundary resolution & weighted spatial density analytics
            </p>
          </div>
        </div>

        {/* District Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400 shrink-0" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Districts (Global GIS)</option>
            <option value="Hyderabad">Hyderabad Zone</option>
            <option value="Visakhapatnam">Visakhapatnam Zone</option>
            <option value="Vizianagaram">Vizianagaram Zone</option>
          </select>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Mapped Complaints</div>
            <div className="text-xl font-display font-bold text-slate-100">{filteredIssues.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Critical Hotspots</div>
            <div className="text-xl font-display font-bold text-slate-100">{criticalHotspotsCount} Clusters</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">GIS Coverage</div>
            <div className="text-xl font-display font-bold text-slate-100">{coveragePct}%</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Inspector Force</div>
            <div className="text-xl font-display font-bold text-slate-100">{activeInspectorsCount} Officers</div>
          </div>
        </div>
      </div>

      {/* Layer Selector Pills */}
      <div>
        <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" /> Interactive GIS Map Layers
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "All Layers" },
            { id: "ROAD_DAMAGE", label: "Road Damage" },
            { id: "GARBAGE", label: "Sanitation & Garbage" },
            { id: "DRAINAGE", label: "Drainage Overflow" },
            { id: "WATER_SUPPLY", label: "Water Supply" },
            { id: "STREET_LIGHTS", label: "Street Lights & Power" },
            { id: "CRITICAL_ISSUES", label: "Critical Hotspots" },
            { id: "PENDING", label: "Pending Queue" },
            { id: "RESOLVED", label: "Resolved Work" }
          ].map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id as GISLayerType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
                activeLayer === layer.id
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 font-bold"
                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* District Comparison & Hotspot Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spatial Clusters */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono font-bold text-slate-300 mb-3 flex items-center justify-between">
            <span>Spatial Heatmap Clusters</span>
            <span className="text-cyan-400">{clusters.length} Clusters Found</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {clusters.slice(0, 4).map((c, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Cluster #{c.priorityRank} — {c.dominantCategory}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {c.complaintCount} reports • Avg Severity: {c.averageSeverity}/100
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  c.riskLevel === "CRITICAL" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                }`}>
                  {c.riskLevel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* District Comparison */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono font-bold text-slate-300 mb-3 flex items-center justify-between">
            <span>District Spatial Volume</span>
            <span className="text-cyan-400">Jurisdiction Comparison</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {districtStats.map((d, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                <span className="font-bold text-slate-200">{d.district}</span>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">{d.count} total</span>
                  <span className="text-rose-400 font-semibold">{d.critical} critical</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
