import React, { useMemo } from "react";
import { 
  Sparkles, 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Award, 
  Activity, 
  ChevronRight,
  Info
} from "lucide-react";
import { Issue, UserProfile } from "../types";
import { generateExecutiveSummary } from "../services/executiveSummaryEngine";
import { calculateMunicipalityHealth } from "../services/healthScoreEngine";
import { predictCivicTrends } from "../services/predictiveEngine";
import { analyzeInspectorWorkload } from "../services/workloadOptimizer";

interface Props {
  issues: Partial<Issue>[];
  inspectors?: UserProfile[];
}

export default function AIRecommendationPanel({ issues, inspectors = [] }: Props) {
  const summaryText = useMemo(() => generateExecutiveSummary(issues, inspectors), [issues, inspectors]);
  const health = useMemo(() => calculateMunicipalityHealth(issues), [issues]);
  const predictive = useMemo(() => predictCivicTrends(issues), [issues]);
  const workload = useMemo(() => analyzeInspectorWorkload(issues, inspectors), [issues, inspectors]);

  // Derive explainable AI recommendations
  const recommendations = useMemo(() => {
    const recs: Array<{
      title: string;
      reason: string;
      confidence: number;
      impact: "HIGH" | "MEDIUM" | "LOW";
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    }> = [];

    if (workload.redistributionAdvised) {
      recs.push({
        title: "Workload Rebalancing Advised",
        reason: workload.globalSummary,
        confidence: 94,
        impact: "HIGH",
        priority: "HIGH"
      });
    }

    predictive.insights.forEach((insight) => {
      recs.push({
        title: insight.title,
        reason: insight.prediction,
        confidence: insight.confidencePercentage,
        impact: insight.impactLevel,
        priority: insight.impactLevel === "HIGH" ? "HIGH" : "MEDIUM"
      });
    });

    if (recs.length === 0) {
      recs.push({
        title: "Optimal Operations Maintained",
        reason: "All municipal metrics are within expected thresholds. Continue routine monitoring.",
        confidence: 95,
        impact: "LOW",
        priority: "LOW"
      });
    }

    return recs;
  }, [workload, predictive]);

  return (
    <div className="my-6 rounded-3xl bg-[#0b0f19]/90 border border-white/10 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg text-slate-100">
                Civic Intelligence & Decision Support
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Explainable real-time operational synthesis & predictive forecasting
            </p>
          </div>
        </div>

        {/* Health Grade Badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Municipality Health</div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg text-slate-100">
                Grade {health.letterGrade}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                ({health.healthScore}/100)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Natural Language Executive Summary Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-900/50 border border-cyan-500/20 mb-6">
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Executive Synthesis Narrative</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          "{summaryText}"
        </p>
      </div>

      {/* AI Recommendations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          <span>Explainable Decision Recommendations</span>
          <span>Confidence & Impact</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        rec.priority === "CRITICAL" || rec.priority === "HIGH"
                          ? "bg-rose-400 shadow-sm shadow-rose-400"
                          : "bg-cyan-400"
                      }`}
                    />
                    <h4 className="font-display font-bold text-sm text-slate-200">
                      {rec.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {rec.confidence}% Confidence
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {rec.reason}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-slate-400">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Impact: <strong className="text-slate-200">{rec.impact}</strong>
                </span>
                <span className="text-slate-400">
                  Priority: <strong className="text-cyan-400">{rec.priority}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
