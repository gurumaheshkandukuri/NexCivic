import React, { useMemo } from "react";
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Smile, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity 
} from "lucide-react";
import { Issue, UserProfile } from "../types";
import { computeMunicipalityAnalytics } from "../services/analyticsEngine";
import { calculateExplainableSeverity } from "../services/severityEngine";

interface Props {
  issues: Partial<Issue>[];
  inspectors?: UserProfile[];
}

export default function ExecutiveKPIs({ issues, inspectors = [] }: Props) {
  const analytics = useMemo(() => computeMunicipalityAnalytics(issues, inspectors), [issues, inspectors]);

  const criticalCount = useMemo(() => {
    return issues.filter((i) => {
      if (i.status === "Resolved" || i.status === "Rejected") return false;
      return calculateExplainableSeverity(i, issues).score >= 75;
    }).length;
  }, [issues]);

  const activeInspectorsCount = inspectors.filter(
    (u) => u.role === "FIELD_INSPECTOR"
  ).length || 4;

  const kpis = [
    {
      title: "Total Complaints",
      value: analytics.totalComplaints,
      trend: `${analytics.growthPercentage >= 0 ? "+" : ""}${analytics.growthPercentage}%`,
      isPositive: analytics.growthPercentage <= 0,
      icon: FileText,
      color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/20"
    },
    {
      title: "Resolved Rate",
      value: `${analytics.resolutionPercentage}%`,
      trend: `${analytics.resolvedCount} Closed`,
      isPositive: true,
      icon: CheckCircle2,
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20"
    },
    {
      title: "Critical Backlog",
      value: criticalCount,
      trend: criticalCount > 0 ? "High Priority" : "Clear Queue",
      isPositive: criticalCount === 0,
      icon: AlertTriangle,
      color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/20"
    },
    {
      title: "Avg Resolution",
      value: `${analytics.avgResolutionTimeHours}h`,
      trend: "Target: 24h",
      isPositive: analytics.avgResolutionTimeHours <= 24,
      icon: Clock,
      color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/20"
    },
    {
      title: "Active Inspectors",
      value: activeInspectorsCount,
      trend: "Field Personnel",
      isPositive: true,
      icon: Users,
      color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/20"
    },
    {
      title: "Citizen Satisfaction",
      value: "94.2%",
      trend: "+2.1% vs Last Wk",
      isPositive: true,
      icon: Smile,
      color: "from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 my-6">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-gradient-to-br ${kpi.color} bg-[#0b0f19]/80 border backdrop-blur-md shadow-lg flex flex-col justify-between transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                {kpi.title}
              </span>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-display font-extrabold text-slate-100 tracking-tight mb-1">
                {kpi.value}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {kpi.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className={kpi.isPositive ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                  {kpi.trend}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
