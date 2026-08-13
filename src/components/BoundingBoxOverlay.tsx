import React, { useState } from "react";
import { Eye, EyeOff, Tag } from "lucide-react";
import { BoundingBox } from "../services/visionProvider";

interface Props {
  imageSrc: string;
  boxes: BoundingBox[];
}

export default function BoundingBoxOverlay({ imageSrc, boxes }: Props) {
  const [showOverlays, setShowOverlays] = useState(true);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-slate-900 group">
      {/* Base Image */}
      <img
        src={imageSrc}
        alt="Grievance Evidence Analysis"
        className="w-full h-auto max-h-96 object-cover rounded-2xl"
      />

      {/* Bounding Box Highlights */}
      {showOverlays &&
        boxes.map((box, idx) => {
          const [ymin, xmin, ymax, xmax] = box.box;
          const color = box.color || "#ef4444";

          return (
            <div
              key={idx}
              className="absolute border-2 rounded-lg pointer-events-none transition-all duration-300 animate-pulse"
              style={{
                top: `${ymin}%`,
                left: `${xmin}%`,
                width: `${xmax - xmin}%`,
                height: `${ymax - ymin}%`,
                borderColor: color,
                backgroundColor: `${color}15`
              }}
            >
              {/* Box Label Tag */}
              <span
                className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-md flex items-center gap-1 shrink-0"
                style={{ backgroundColor: color }}
              >
                <Tag className="w-2.5 h-2.5" />
                {box.label}
              </span>
            </div>
          );
        })}

      {/* Overlay Toggle Switch */}
      {boxes.length > 0 && (
        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-slate-200 text-xs font-mono font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          {showOverlays ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-rose-400" /> Hide AI Annotations
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-cyan-400" /> Show AI Annotations ({boxes.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}
