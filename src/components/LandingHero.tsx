import { useState, useEffect } from "react";
import InteractivePlexus from "./InteractivePlexus";
import {
  ArrowRight,
  MapPin,
  Users,
  Wrench,
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Plus,
  Trash2,
  Droplet,
  Lightbulb,
  Workflow,
  ShieldCheck,
  Compass,
  ChevronRight,
  Sparkles,
  Waves
} from "lucide-react";
import { ROLES } from "../constants/roles";
import { Issue, UserProfile } from "../types";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { useLiveIssues } from "../hooks/useLiveIssues";

interface LandingHeroProps {
  users: UserProfile[];
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  theme?: "light" | "dark";
}

export default function LandingHero({ users, setActiveTab, user, theme = "dark" }: LandingHeroProps) {
  const { issues } = useLiveIssues({ scope: "all" });
  const [selectedCity, setSelectedCity] = useState("Mumbai");

  // Typewriter effect state hooks
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [line3, setLine3] = useState("");
  const [activeLine, setActiveLine] = useState<1 | 2 | 3>(1);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const text1 = "Report Issues.";
    const text2 = "Fix Cities.";
    const text3 = "Build Community.";

    let idx1 = 0;
    let idx2 = 0;
    let idx3 = 0;

    const interval = setInterval(() => {
      if (idx1 < text1.length) {
        setLine1(text1.slice(0, idx1 + 1));
        idx1++;
        setActiveLine(1);
      } else if (idx2 < text2.length) {
        setLine2(text2.slice(0, idx2 + 1));
        idx2++;
        setActiveLine(2);
      } else if (idx3 < text3.length) {
        setLine3(text3.slice(0, idx3 + 1));
        idx3++;
        setActiveLine(3);
      } else {
        clearInterval(interval);
        // Blinking caret once completed
        const blinkInterval = setInterval(() => {
          setShowCursor((prev) => !prev);
        }, 500);
        return () => clearInterval(blinkInterval);
      }
    }, 55);

    return () => clearInterval(interval);
  }, []);

  // Regional stats for targeting cities
  const cityStats: { [key: string]: { reported: number; resolved: number; score: number; challenges: string } } = {
    Mumbai: { reported: 1420, resolved: 1210, score: 85, challenges: "Water logging, Heavy potholes, Waste management" },
    Delhi: { reported: 1850, resolved: 1480, score: 80, challenges: "Smog & AQI reporting, Infrastructure damage, Power grid" },
    Bangalore: { reported: 980, resolved: 780, score: 79, challenges: "Traffic light synchronization, Potholes, Water leakages" },
    Hyderabad: { reported: 750, resolved: 650, score: 86, challenges: "Drainage backups, Public safety lighting, Street litter" },
    Pune: { reported: 620, resolved: 530, score: 85, challenges: "Trash overflows, Road repairs, Traffic speed control" },
    Chennai: { reported: 890, resolved: 710, score: 79, challenges: "Monsoon drain desilting, Coastal garbage heaps" },
    Kolkata: { reported: 1100, resolved: 880, score: 80, challenges: "Traditional sewer blockages, Old streetcars hazards" }
  };

  const barChartData = Object.keys(cityStats).map((city) => ({
    name: city,
    "Reported Volume": cityStats[city].reported,
    "Resolved Volume": cityStats[city].resolved,
  }));

  // Compute live real-time stats with base mock data
  const totalIssuesCount = issues.length + 127;
  const resolvedIssuesCount = issues.filter(i => i.status === "Resolved").length + 89;
  const activeCitizensCount = users.filter(u => u.role === ROLES.CITIZEN).length + 153;
  const resolutionRate = Math.round((resolvedIssuesCount / totalIssuesCount) * 100);

  // Top 5 Hot/Trending Issues (by upvotes/confirmCount)
  const hotIssues = [...issues]
    .sort((a, b) => b.confirmCount - a.confirmCount)
    .slice(0, 5);

  return (
    <div className="relative py-12 md:py-24 overflow-hidden bg-mesh-gradient">

      {/* 3D Interactive Plexus Constellation Vector Grid */}
      <InteractivePlexus theme={theme} />

      {/* Decorative Glowing Floating Background Orbs */}
      <div className="bg-orb-purple top-24 -left-48 opacity-30" />
      <div className="bg-orb-cyan bottom-12 -right-36 opacity-25" />

      {/* SCAN LINE ANIMATION */}
      <div className="scan-line" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

        {/* Left Side Content & Trust Metrics */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">

          {/* Pulsing Startup Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--cyan)]/10 border border-[var(--cyan)]/25 w-max shadow-[0_0_15px_rgba(99,102,241,0.1)]"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] tracking-widest font-mono font-bold text-[var(--cyan)] uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> State-of-the-Art Civic Intelligence
            </span>
          </motion.div>

          {/* Epic display titles with animations */}
          <div className="min-h-[135px] sm:min-h-[160px] md:min-h-[205px] lg:min-h-[245px] flex flex-col justify-end">
            <motion.h1
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05, duration: 0.4 }}
              className="font-display font-black text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight text-[var(--text-1)] text-glow-cyan"
            >
              <span className="block relative">
                {/* 100% Stable invisible placeholder to anchor layout */}
                <span className="invisible select-none pointer-events-none">Report Issues.</span>
                <span className="absolute left-0 top-0 whitespace-nowrap">
                  <span>{line1}</span>
                  {activeLine === 1 && showCursor && (
                    <span className="inline-block w-0 overflow-visible text-cyan-400 font-mono font-light ml-0.5 animate-pulse select-none pointer-events-none">|</span>
                  )}
                </span>
              </span>
              <span className="block relative mt-1.5 md:mt-2.5">
                {/* 100% Stable invisible placeholder to anchor layout */}
                <span className="invisible select-none pointer-events-none">Fix Cities.</span>
                <span className="absolute left-0 top-0 whitespace-nowrap">
                  <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
                    {line2}
                  </span>
                  {activeLine === 2 && showCursor && (
                    <span className="inline-block w-0 overflow-visible text-indigo-400 font-mono font-light ml-0.5 animate-pulse select-none pointer-events-none">|</span>
                  )}
                </span>
              </span>
              <span className="block relative mt-1.5 md:mt-2.5">
                {/* 100% Stable invisible placeholder to anchor layout */}
                <span className="invisible select-none pointer-events-none">Build Community.</span>
                <span className="absolute left-0 top-0 whitespace-nowrap">
                  <span>{line3}</span>
                  {activeLine === 3 && showCursor && (
                    <span className="inline-block w-0 overflow-visible text-violet-400 font-mono font-light ml-0.5 animate-pulse select-none pointer-events-none">|</span>
                  )}
                </span>
              </span>
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-[var(--text-2)] max-w-xl leading-relaxed font-sans"
          >
            Empower citizens and municipal departments with semantic duplicate detection, automated Gemini triage, and dynamic real-time reporting logic. Shape your metropolitan infrastructure with surgical detail.
          </motion.p>

          {/* Two Prominent call-to-actions */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 mt-2"
          >
            {user ? (
              user.role === ROLES.CITIZEN ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("report")}
                  className="px-6 py-4 clay-btn rounded-2xl flex items-center gap-2 cursor-pointer text-sm font-display tracking-wide"
                >
                  Report an Issue <Plus className="w-4 h-4 text-white stroke-[3] animate-bounce" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className="px-6 py-4 clay-btn rounded-2xl flex items-center gap-2 cursor-pointer text-sm font-display tracking-wide"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4 text-white stroke-[3] animate-bounce" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("auth")}
                className="px-6 py-4 clay-btn rounded-2xl flex items-center gap-2 cursor-pointer text-sm font-display tracking-wide"
              >
                Get Started Free <ArrowRight className="w-4 h-4 text-white stroke-[3] animate-bounce" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className="px-6 py-4 clay-btn-secondary rounded-2xl flex items-center gap-2 font-bold text-sm"
            >
              Explore Live Map <MapPin className="w-4 h-4 text-[var(--cyan)]" />
            </button>
          </motion.div>

          {/* Real-time counters row pulled with high fidelity */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-200 dark:border-gray-800/25">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-display font-black text-cyan-400">
                {totalIssuesCount}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-2)] mt-1">
                Issues Reported
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-display font-black text-green-400">
                {resolvedIssuesCount}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-2)] mt-1">
                Resolved Live
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-display font-black text-indigo-400">
                {activeCitizensCount}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-2)] mt-1">
                Active Citizens
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-display font-black text-amber-400">
                {resolutionRate}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-2)] mt-1">
                Resolution Rate
              </span>
            </div>
          </div>

        </div>

        {/* Right Side - Visual Area & Regional Stats Interactive Matrix */}
        <div className="lg:col-span-5 relative flex flex-col gap-6">

          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--cyan)]/10 to-[var(--blue)]/10 rounded-full filter blur-3xl opacity-30 -z-10 animate-pulse" />

          {/* Smart command panel container */}
          <div className="glass rounded-3xl p-6 relative border border-slate-200/50 dark:border-white/10 flex flex-col gap-5 overflow-hidden shadow-2xl bg-white/30 dark:bg-[#0b0f19]/35">

            <div className="absolute top-0 right-0 p-2 text-[9px] font-mono text-cyan-400 bg-cyan-400/10 rounded-bl-xl font-bold">
              NODE ACTIVE
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-800/20 pb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-2)]">
                Regional Intelligence Monitor
              </span>
            </div>

            {/* Metro selector */}
            <div className="flex flex-wrap gap-1">
              {Object.keys(cityStats).map((city) => (
                <button
                  type="button"
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${selectedCity === city
                      ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border-transparent"
                      : "bg-transparent border-slate-250 dark:border-gray-800/80 text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-slate-500/5"
                    }`}
                >
                  {city.toUpperCase()}
                </button>
              ))}
            </div>

            {/* City metrics detailed display */}
            <div className="bg-slate-50 dark:bg-[rgba(255,255,255,0.015)] p-4 rounded-2xl border border-slate-200 dark:border-gray-800 grid grid-cols-3 gap-3">
              <div className="text-center">
                <span className="block text-[10px] uppercase font-medium text-slate-500 dark:text-gray-400">Reported</span>
                <span className="text-lg font-mono font-black text-[var(--text-1)] mt-0.5 block">
                  {cityStats[selectedCity].reported}
                </span>
              </div>
              <div className="text-center border-x border-slate-200 dark:border-gray-800/80">
                <span className="block text-[10px] uppercase font-medium text-slate-500 dark:text-gray-400">Resolved</span>
                <span className="text-lg font-mono font-black text-green-400 mt-0.5 block">
                  {cityStats[selectedCity].resolved}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] uppercase font-medium text-slate-500 dark:text-gray-400">Rating</span>
                <span className="text-lg font-mono font-black text-cyan-400 mt-0.5 block">
                  {cityStats[selectedCity].score}/100
                </span>
              </div>
            </div>

            <div className="text-xs text-left">
              <span className="text-[10px] uppercase tracking-wider font-bold text-orange-400 block mb-1">
                ⚠️ Top Challenges Reported Indigeneously:
              </span>
              <p className="text-[11px] text-[var(--text-2)] italic font-medium leading-relaxed bg-[rgba(255,107,53,0.03)] px-3 py-2 rounded-lg border border-[rgba(255,107,53,0.08)]">
                "{cityStats[selectedCity].challenges}"
              </p>
            </div>

            {/* Internal active hotspot previews */}
            <div className="text-left mt-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase text-cyan-400 font-bold mb-2">
                <Flame className="w-3 h-3 text-cyan-400" />
                <span>Active Mumbai Hotspots / Trending</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {hotIssues.map((issue) => (
                  <div
                    key={issue.complaintId}
                    onClick={() => setActiveTab("map")}
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-500/5 hover:bg-[var(--cyan)]/5 border border-transparent hover:border-[var(--cyan)]/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[11px] font-semibold text-[var(--text-1)] max-w-[180px] truncate">
                        {issue.title}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-[rgba(255,45,107,0.1)] text-rose-400 px-1.5 py-0.5 rounded-md">
                      ⚠️ {issue.communitySupportCount} votes
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Regional Analytics Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-16 pt-16 border-t border-slate-200 dark:border-gray-800/20 relative z-10">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--cyan)]/10 text-[var(--cyan)] font-bold text-[10px] uppercase font-mono mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Metropolitan Hotspot Telemetry</span>
            </div>
            <h2 className="font-display font-black text-2xl md:text-4xl text-[var(--text-1)]">
              Regional Analytics
            </h2>
            <p className="text-xs text-[var(--text-2)] mt-1 max-w-xl text-left font-sans">
              Comparing reported issue volume and resolved cases count across target metros to identify critical infrastructure backlog hotspots.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 dark:bg-[rgba(255,255,255,0.02)] border border-slate-200 dark:border-gray-700/25 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-500 block" />
              <span className="text-[var(--text-2)]">Reported Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 block" />
              <span className="text-[var(--text-2)]">Resolved Volume</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-slate-200/50 dark:border-white/10 shadow-2xl bg-slate-100/10 dark:bg-slate-950/20">
          <div className="h-80 w-full animate-fadeIn">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} opacity={0.12} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: theme === 'dark' ? '#334155' : '#cbd5e1', opacity: 0.3 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: theme === 'dark' ? '#334155' : '#cbd5e1', opacity: 0.3 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "rgba(11, 15, 25, 0.95)" : "rgba(255, 255, 255, 0.95)",
                    borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                    borderRadius: "16px",
                    color: theme === "dark" ? "#f8fafc" : "#0f172a",
                    fontSize: "11px",
                    boxShadow: theme === "dark" ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(0, 0, 0, 0.15)"
                  }}
                />
                <Bar
                  dataKey="Reported Volume"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
                <Bar
                  dataKey="Resolved Volume"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Categories Grid - World-Class UI/UX Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-16 pt-16 border-t border-slate-200 dark:border-gray-800/20 relative z-10">
        <div className="text-left mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--cyan)]/10 text-[var(--cyan)] font-bold text-[10px] uppercase font-mono mb-2">
            <Workflow className="w-3.5 h-3.5" />
            <span>Civic Domains Grid</span>
          </div>
          <h2 className="font-display font-black text-2xl md:text-4xl text-[var(--text-1)]">
            Exploration Hub by Category
          </h2>
          <p className="text-xs text-[var(--text-2)] mt-1 font-sans">
            Directly investigate urban development backlogs inside targeted operational layers of metropolitan municipal engineering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { tag: "Pothole", label: "Street Integrity", desc: "Track road craters, asphalt damage, potholes, and physical transit failures.", icon: Wrench, color: "text-cyan-400 bg-cyan-450/10 border-cyan-500/10" },
            { tag: "Garbage Overflow", label: "Urban Sanitation", desc: "Monitor litter accumulation, local Dumpster breaches, and illegal dumps.", icon: Trash2, color: "text-emerald-400 bg-emerald-450/10 border-emerald-500/10" },
            { tag: "Water Leakage", label: "Fluid Utilities", desc: "Map pipeline busts, storm drain leakages, and clean municipal water loss.", icon: Droplet, color: "text-sky-450 bg-sky-500/10 border-sky-500/10" },
            { tag: "Street Light", label: "Luminous Grid", desc: "Track commercial lighting blackout zones, broken panels, and dark lanes.", icon: Lightbulb, color: "text-amber-400 bg-amber-450/10 border-amber-500/10" },
            { tag: "Drainage", label: "Sewer Flow Management", desc: "Highlight city storm-drain blocks, water blockages, and wet flooding.", icon: Waves, color: "text-indigo-400 bg-indigo-450/10 border-indigo-500/10" },
            { tag: "Infrastructure", label: "Metropolitan Accents", desc: "Report crumbling structural safety rails, broken park tools, and hazard poles.", icon: Compass, color: "text-rose-400 bg-rose-450/10 border-rose-500/10" }
          ].map((cat, idx) => {
            const IconComp = cat.icon;
            return (
              <motion.div
                key={cat.tag}
                whileHover={{ y: -6, scale: 1.015 }}
                onClick={() => setActiveTab("map")}
                className="glow-gradient-card cursor-pointer p-6 flex flex-col justify-between text-left group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 border ${cat.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-black text-lg text-[var(--text-1)] group-hover:text-cyan-400 transition-colors leading-tight">{cat.label}</h3>
                  <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-slate-400 dark:text-gray-500 block mt-1">{cat.tag}</span>
                  <p className="text-xs text-[var(--text-2)] mt-3 leading-relaxed font-sans">{cat.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 mt-6 group-hover:translate-x-1.5 transition-transform duration-300">
                  <span>Enter Spatial Layer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        .scan-line {
          position: absolute; 
          left: 0; 
          right: 0; 
          height: 1.5px;
          background: linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent);
          animation: scan 6s linear infinite;
          box-shadow: 0 0 15px rgba(0,229,255,0.3);
          pointer-events: none;
          z-index: 2;
        }

        @keyframes scan {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
}
