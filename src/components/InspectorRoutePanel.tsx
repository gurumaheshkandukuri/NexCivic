import React, { useState, useEffect, useMemo } from "react";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Route, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Sparkles,
  Zap
} from "lucide-react";
import { Issue } from "../types";
import { optimizeInspectionRoute, RouteOptimizationResult } from "../services/routeOptimizer";
import { STATUS } from "../constants/status";

interface Props {
  assignedIssues: Partial<Issue>[];
  inspectorLocation?: { latitude: number; longitude: number };
}

export default function InspectorRoutePanel({ assignedIssues, inspectorLocation }: Props) {
  const [routeResult, setRouteResult] = useState<RouteOptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);

  const startLocation = inspectorLocation || { latitude: 17.385, longitude: 78.4867 }; // Default HQ location

  useEffect(() => {
    let isMounted = true;

    async function computeRoute() {
      setLoading(true);
      try {
        const result = await optimizeInspectionRoute(startLocation, assignedIssues);
        if (isMounted) {
          setRouteResult(result);
        }
      } catch (err) {
        console.warn("[InspectorRoutePanel] Route calculation warning:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    computeRoute();

    return () => {
      isMounted = false;
    };
  }, [assignedIssues, startLocation.latitude, startLocation.longitude]);

  // Completion Progress %
  const progressPct = useMemo(() => {
    if (assignedIssues.length === 0) return 100;
    const completed = assignedIssues.filter(
      (i) => i.status === STATUS.RESOLVED || i.status === STATUS.INSPECTION_COMPLETED
    ).length;
    return Math.round((completed / assignedIssues.length) * 100);
  }, [assignedIssues]);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-[#0b0f19]/90 border border-white/10 text-cyan-400 font-mono text-xs my-6 flex items-center justify-center gap-3 animate-pulse">
        <Route className="w-5 h-5 animate-spin" />
        <span>Calculating optimal spatial inspection route...</span>
      </div>
    );
  }

  if (!routeResult || routeResult.orderedStops.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-[#0b0f19]/80 border border-white/10 text-slate-400 text-xs my-6 flex items-center justify-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <span>No pending assigned field inspections in route queue.</span>
      </div>
    );
  }

  return (
    <div className="my-6 p-6 rounded-3xl bg-[#0b0f19]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-slate-100">
                Optimized Field Inspection Route
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                TSP Route
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Provider: {routeResult.providerName}
            </p>
          </div>
        </div>

        {/* Route Stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-300">
            <Route className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{routeResult.totalDistanceKm} km</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{routeResult.totalEstimatedTimeMins} mins</span>
          </div>
        </div>
      </div>

      {/* Route Completion Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-slate-400">Route Completion Progress</span>
          <span className="font-bold text-cyan-400">{progressPct}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stop Sequence List */}
      <div className="space-y-3">
        <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          Ordered Inspection Waypoints ({routeResult.orderedStops.length} Stops)
        </div>

        <div className="space-y-2">
          {routeResult.orderedStops.map((stop) => {
            const isCompleted =
              stop.issue.status === STATUS.RESOLVED ||
              stop.issue.status === STATUS.INSPECTION_COMPLETED;

            return (
              <div
                key={stop.stopOrder}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? "bg-slate-900/40 border-slate-800/60 opacity-75"
                    : "bg-slate-900/80 border-slate-800 hover:border-cyan-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    }`}
                  >
                    #{stop.stopOrder}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-xs text-slate-100">
                        {stop.issue.title || "Untitled Grievance"}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {stop.issue.category || "General"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        {stop.issue.district || "District"}, {stop.issue.landmark || "Area"}
                      </span>
                      <span>+ {stop.distanceFromPreviousKm} km</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {stop.issue.status || "Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
