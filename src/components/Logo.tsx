import { SVGProps } from "react";

interface LogoProps {
  onlyIcon?: boolean;
  themeType?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function Logo({
  onlyIcon = false,
  themeType = "dark",
  size = "md",
  className = ""
}: LogoProps) {
  // Configurable dimensions
  const dims = {
    sm: { width: onlyIcon ? 32 : 112, height: 32 },
    md: { width: onlyIcon ? 44 : 160, height: 50 },
    lg: { width: onlyIcon ? 64 : 224, height: 70 },
    xl: { width: onlyIcon ? 120 : 384, height: 120 },
  }[size];

  const textColor = themeType === "dark" ? "#FFFFFF" : "#0F172A";
  const taglineColor = themeType === "dark" ? "#94A3B8" : "#64748B";

  const darkColor = themeType === "dark" ? "#0F172A" : "#FFFFFF"; // Inner node hole background / base alignment
  const slateBorder = themeType === "dark" ? "#1E293B" : "#CBD5E1"; 
  const silhouetteColor = themeType === "dark" ? "#0F172A" : "#64748B"; 
  const bgBacklight = themeType === "dark" ? "#1E293B" : "#E2E8F0";

  return (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox={onlyIcon ? "0 0 100 100" : "0 0 320 100"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Glowing gradients for the nodes and paths matching the uploaded image */}
        <linearGradient id="cyanGrad" x1="18" y1="14" x2="30" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#00A2D3" />
        </linearGradient>

        <linearGradient id="thickNPath" x1="22" y1="18" x2="74" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="40%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        <radialGradient id={`slateNodeGlow-${themeType}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={themeType === "dark" ? "#1E3A8A" : "#3B82F6"} />
          <stop offset="70%" stopColor={themeType === "dark" ? "#0F172A" : "#E2E8F0"} />
          <stop offset="100%" stopColor={themeType === "dark" ? "#020617" : "#CBD5E1"} />
        </radialGradient>

        <linearGradient id="verticalBar" x1="22" y1="18" x2="22" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#0D9488" />
          <stop offset="100%" stopColor={themeType === "dark" ? "#111827" : "#64748B"} />
        </linearGradient>

        <linearGradient id="verticalBarRight" x1="74" y1="18" x2="74" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="60%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Shadow Drop filter for professional depth */}
        <filter id="vectorDrop" x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00E5FF" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Main Logo Icon Wrapper */}
      <g filter="url(#vectorDrop)">
        {/* Subtle glowing backlight */}
        <circle cx="50" cy="50" r="38" fill={bgBacklight} fillOpacity="0.12" />

        {/* 1. Thin Network Connection Mesh underlaying the "N" structure */}
        <path d="M22 18 L74 18" stroke="#0D9488" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M22 82 L74 82" stroke={slateBorder} strokeWidth="1.5" strokeOpacity="0.6" />
        
        {/* Diagonal mesh spidering paths */}
        <path d="M22 18 L58 42" stroke="#0D9488" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M58 42 L74 82" stroke="#1E3A8A" strokeWidth="6" strokeLinecap="round" />
        
        <path d="M22 82 L38 54" stroke="#1E3A8A" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M38 54 L58 42" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />

        {/* Additional supporting network lines */}
        <path d="M10 48 L22 18" stroke="#0D9488" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M10 48 L22 82" stroke="#0D9488" strokeWidth="1" strokeOpacity="0.3" />
        <path d="M10 48 L38 54" stroke="#0D9488" strokeWidth="1" strokeOpacity="0.4" />

        <path d="M88 50 L74 18" stroke={slateBorder} strokeWidth="1" strokeOpacity="0.4" />
        <path d="M88 50 L74 82" stroke={slateBorder} strokeWidth="1" strokeOpacity="0.3" />
        <path d="M88 50 L58 42" stroke={slateBorder} strokeWidth="1" strokeOpacity="0.4" />

        <path d="M38 54 L74 82" stroke="#1E3A8A" strokeWidth="1" strokeOpacity="0.3" />
        <path d="M58 42 L22 18" stroke="#0D9488" strokeWidth="1.5" strokeOpacity="0.5" />
        
        {/* Thick outline vertical paths forming outer poles of "N" */}
        <path d="M22 18 L22 82" stroke="url(#verticalBar)" strokeWidth="6" strokeLinecap="round" />
        <path d="M74 18 L74 82" stroke="url(#verticalBarRight)" strokeWidth="6" strokeLinecap="round" />

        {/* 2. Secondary Mesh Nodes (anchors/joints) */}
        <circle cx="10" cy="48" r="4.5" fill="#0D9488" />
        <circle cx="10" cy="48" r="1.5" fill="#00E5FF" />
        
        <circle cx="88" cy="50" r="4.5" fill="#1E3A8A" />
        <circle cx="88" cy="50" r="1.5" fill="#3B82F6" />

        <circle cx="58" cy="18" r="3.5" fill="#0D9488" />
        <circle cx="38" cy="54" r="8" fill="#1E3A8A" />
        <circle cx="58" cy="42" r="7.5" fill="#0F766E" />

        {/* 3. Four Massive Hero Corner Nodes */}
        {/* Bottom Left Node */}
        <circle cx="22" cy="82" r="10.5" fill={`url(#slateNodeGlow-${themeType})`} stroke={darkColor} strokeWidth="1.5" />

        {/* Top Right Node */}
        <circle cx="74" cy="18" r="10" fill={`url(#slateNodeGlow-${themeType})`} stroke="#1E3A8A" strokeWidth="1.5" />

        {/* Bottom Right Node (White Inner Center Circular hole ring) */}
        <circle cx="74" cy="82" r="9.5" fill={darkColor} stroke={slateBorder} strokeWidth="5.5" />
        <circle cx="74" cy="82" r="2.5" fill={themeType === "dark" ? "#FFFFFF" : "#1E3A8A"} />

        {/* Top Left Node (Glowing Cyan Center with circular eye) */}
        <circle cx="22" cy="18" r="9.5" fill="url(#cyanGrad)" />
        <circle cx="22" cy="18" r="3.5" fill="#FFFFFF" />

        {/* 4. Beautiful Skyline Silhouette Seamlessly Integrated below the base */}
        <line x1="8" y1="92" x2="92" y2="92" stroke={silhouetteColor} strokeWidth="2" strokeLinecap="round" />
        {/* Skyscraper shapes */}
        <path d="M33 92 V86 H37 V92" fill="#0D9488" fillOpacity="0.8" />
        <path d="M38 92 V82 H41 V92" fill="#0D9488" />
        <path d="M42 92 V88 H45 V92" fill="#0D9488" fillOpacity="0.7" />
        <path d="M50 92 V76 H54 V92" fill={silhouetteColor} />
        <path d="M54 92 V84 H57 V92" fill={silhouetteColor} />
        <path d="M58 92 V80 H62 V92" fill="#0D9488" />
        <path d="M63 92 V87 H66 V92" fill="#0D9488" fillOpacity="0.8" />
      </g>

      {/* Render text title & tagline only if onlyIcon is false */}
      {!onlyIcon && (
        <g>
          {/* Main "NexCivic" Wordmark */}
          <text
            x="105"
            y="51"
            fill={textColor}
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="900"
            fontSize="30"
            letterSpacing="-1px"
            id="logo_title_text"
          >
            Nex<tspan fill="#00E5FF" id="logo_title_span">Civic</tspan>
          </text>

          {/* Subtitle / Tagline */}
          <text
            x="105"
            y="67"
            fill={taglineColor}
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="500"
            fontSize="7"
            letterSpacing="0.2px"
            id="logo_subtitle_text"
          >
            Solving Civic Issues, Building Smarter Communities
          </text>
        </g>
      )}
    </svg>
  );
}
