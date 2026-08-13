import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  Tag, 
  Flame, 
  Zap, 
  RefreshCw, 
  ThumbsUp, 
  SlidersHorizontal 
} from "lucide-react";
import { analyzeComplaintImage } from "../services/imageAnalysisEngine";
import { assessImageQuality, ImageQualityResult } from "../utils/imageQuality";
import { VisionAnalysisResult } from "../services/visionProvider";
import BoundingBoxOverlay from "./BoundingBoxOverlay";

interface Props {
  imageFile: File | string;
  imagePreviewUrl: string;
  onAcceptSuggestions?: (suggestions: { category: string; priority: string; severity: string }) => void;
}

export default function ImageAnalysisPanel({ imageFile, imagePreviewUrl, onAcceptSuggestions }: Props) {
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [quality, setQuality] = useState<ImageQualityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function runAnalysis() {
      setLoading(true);
      setError(null);
      try {
        const [visionRes, qualityRes] = await Promise.all([
          analyzeComplaintImage(imageFile),
          typeof imageFile !== "string" 
            ? assessImageQuality(imageFile)
            : Promise.resolve({
                overallScore: 92,
                rating: "EXCELLENT" as const,
                metrics: { lightingScore: 90, sharpnessScore: 90, resolutionScore: 95, occlusionScore: 90 },
                suggestions: ["High quality image preview."]
              })
        ]);

        if (isMounted) {
          setAnalysis(visionRes);
          setQuality(qualityRes);
        }
      } catch (err) {
        console.warn("[ImageAnalysisPanel] Vision analysis error:", err);
        if (isMounted) {
          setError("AI Vision analysis unavailable. You can continue manual complaint submission.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [imageFile]);

  const handleAccept = () => {
    if (!analysis) return;
    setIsAccepted(true);
    if (onAcceptSuggestions) {
      onAcceptSuggestions({
        category: analysis.category,
        priority: analysis.severity === "CRITICAL" ? "Critical" : analysis.severity === "HIGH" ? "High" : "Medium",
        severity: analysis.severity
      });
    }
  };

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center gap-3 text-cyan-400 font-mono text-xs my-4 animate-pulse">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        <span>Analyzing complaint image features with AI Vision...</span>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3 my-4">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
        <div>
          <div className="font-bold">AI Analysis Notification</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">
            {error || "Vision analysis unavailable — continue manual submission normally."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-5 p-5 rounded-3xl bg-[#0b0f19]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-4">
      {/* Bounding Box Visualizer Overlay */}
      <BoundingBoxOverlay imageSrc={imagePreviewUrl} boxes={analysis.boundingBoxes} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span className="font-display font-bold text-sm text-slate-100">
            AI Vision Intelligence Synthesis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            {analysis.confidence}% Confidence
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              analysis.severity === "CRITICAL" || analysis.severity === "HIGH"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {analysis.severity} SEVERITY
          </span>
        </div>
      </div>

      {/* Detected Category & Reasoning */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">Detected Category:</span>
          <span className="font-bold text-cyan-400 font-mono text-sm">{analysis.category}</span>
        </div>

        <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 leading-relaxed font-sans">
          "{analysis.reasoning}"
        </p>
      </div>

      {/* Detections & Hazards Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Objects */}
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
            <Tag className="w-3 h-3 text-cyan-400" /> Detected Objects
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.detectedObjects.map((obj, i) => (
              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {obj}
              </span>
            ))}
          </div>
        </div>

        {/* Hazards */}
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" /> Associated Hazards
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.hazards.map((haz, i) => (
              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {haz}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Quality Meter */}
      {quality && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] font-mono text-slate-300 font-semibold">
                Evidence Photo Quality ({quality.rating})
              </div>
              <div className="text-[10px] text-slate-400">
                {quality.suggestions[0]}
              </div>
            </div>
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400">
            {quality.overallScore}/100
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex items-center gap-3">
        {analysis.confidence >= 90 && !isAccepted ? (
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 touch-target cursor-pointer transition-all active:scale-95"
          >
            <ThumbsUp className="w-4 h-4" /> Accept AI Auto-Fill Suggestions
          </button>
        ) : isAccepted ? (
          <div className="flex-1 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> AI Form Suggestions Applied
          </div>
        ) : null}
      </div>
    </div>
  );
}
