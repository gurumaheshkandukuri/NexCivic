import React from "react";
import { 
  Building, 
  Sparkles, 
  Users, 
  Zap, 
  ShieldAlert, 
  CheckCircle, 
  ChevronRight,
  TrendingDown,
  Star,
  Award,
  Globe,
  ArrowUpRight,
  Heart,
  Landmark
} from "lucide-react";
import { motion } from "motion/react";

export default function AboutSection() {
  return (
    <div className="py-16 bg-gradient-to-b from-transparent via-slate-500/5 to-slate-500/10 dark:via-slate-950/40 dark:to-slate-950/60 relative overflow-hidden">
      
      {/* Visual background lights */}
      <div className="bg-orb-purple bottom-48 -left-48 opacity-20" />
      <div className="bg-orb-cyan top-48 -right-48 opacity-15" />

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Features / paradigm Headline block */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-xs uppercase tracking-widest font-mono font-bold text-[var(--cyan)] bg-[var(--cyan)]/10 px-3 py-1.5 rounded-full border border-[var(--cyan)]/25 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            Product Paradigm
          </span>
          <h2 className="font-display font-black text-3xl md:text-5xl tracking-tight text-[var(--text-1)] mt-4">
            Smarter Civic Governance.
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-2)] mt-3 leading-relaxed font-sans">
            Traditional municipal workflows lead to administrative delays, duplicate entries, and frustrated citizens. NexCivic orchestrates total transparency and lightning-fast resolutions.
          </p>
        </motion.div>

        {/* 4 Core Value Cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {[
            {
              title: "Community First",
              desc: "Enable citizens to upvote existing issues, raising prioritization factors dynamically without manual administration delay.",
              icon: Users,
              color: "text-cyan-400 bg-cyan-400/10 border-cyan-450/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            },
            {
              title: "AI-Powered Triage",
              desc: "Deploy server-side Gemini intelligence to instantly tag categories, extract locations, and flag duplicates with semantic vector match.",
              icon: Zap,
              color: "text-emerald-400 bg-emerald-400/10 border-emerald-450/10 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            },
            {
              title: "Full Transparency",
              desc: "Track incident progression live in detailed status pipelines. Review before/after image proofs uploaded directly by responders.",
              icon: Sparkles,
              color: "text-violet-400 bg-violet-400/10 border-violet-450/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
            },
            {
              title: "Response Mapping",
              desc: "Streamlined dashboard routing routes alerts to optimal ward engineers, calculating estimated resource and manpower requisitions.",
              icon: Building,
              color: "text-rose-400 bg-rose-450/10 border-rose-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.155)]"
            }
          ].map((feat, i) => {
            const IconComponent = feat.icon;
            return (
              <motion.div 
                key={feat.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glow-gradient-card p-6 text-left flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${feat.color.split(" ")[1]} ${feat.color.split(" ")[0]} border`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-black text-sm text-[var(--text-1)] leading-tight">{feat.title}</h3>
                  <p className="text-[11px] text-[var(--text-2)] mt-3 leading-relaxed font-sans">
                    {feat.desc}
                  </p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent mt-6 rounded-full" />
              </motion.div>
            );
          })}
        </div>

        {/* Traditional vs NexCivic Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-24">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-8 border border-red-500/15 bg-red-500/[0.01] text-left relative"
          >
            <div className="flex items-center gap-2 mb-6 text-red-500">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span className="font-display font-black text-sm uppercase tracking-wider">Traditional City Grievances</span>
            </div>
            
            <div className="flex flex-col gap-4 text-xs font-semibold">
              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-red-500/[0.03] border border-red-500/5 hover:border-red-500/10 transition-all">
                <span className="text-red-500 font-bold mt-0.5 text-sm">✕</span>
                <p className="text-[var(--text-2)] leading-relaxed font-sans">
                  Citizens wait weeks filing manual paper requests without any direct communication line, response estimate, or visible tracker.
                </p>
              </div>

              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-red-500/[0.03] border border-red-500/5 hover:border-red-500/10 transition-all">
                <span className="text-red-500 font-bold mt-0.5 text-sm">✕</span>
                <p className="text-[var(--text-2)] leading-relaxed font-sans">
                  Inefficient duplicate reports clog municipality servers completely. Dozens of people report the exact same road hole independently.
                </p>
              </div>

              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-red-500/[0.03] border border-red-500/5 hover:border-red-500/10 transition-all">
                <span className="text-red-500 font-bold mt-0.5 text-sm">✕</span>
                <p className="text-[var(--text-2)] leading-relaxed font-sans">
                  Authorities manually dispatch ward supervisors to locate coordinates, delaying critical material and manpower mobilization.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-8 border border-cyan-500/15 bg-cyan-500/[0.01] text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold font-mono text-[9px] uppercase tracking-wider rounded-bl-xl shadow-lg">
              NexCivic Standard
            </div>

            <div className="flex items-center gap-2 mb-6 text-cyan-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-display font-black text-sm uppercase tracking-wider">NexCivic Platform Solutions</span>
            </div>

            <div className="flex flex-col gap-4 text-xs font-semibold">
              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/5 hover:border-cyan-500/10 transition-all">
                <span className="text-cyan-400 font-bold mt-0.5 text-sm">✓</span>
                <p className="text-[var(--text-1)] leading-relaxed font-sans">
                  Real-time status pipelines (Open → Acknowledged → Resolved) with instant push alerts and custom citizen-oriented XP points.
                </p>
              </div>

              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/5 hover:border-cyan-500/10 transition-all">
                <span className="text-cyan-400 font-bold mt-0.5 text-sm">✓</span>
                <p className="text-[var(--text-1)] leading-relaxed font-sans">
                  Fully automated, server-side semantic duplicate detection clusters related neighborhood data, boosting priorities dynamically.
                </p>
              </div>

              <div className="flex gap-2.5 items-start p-3.5 rounded-xl bg-cyan-500/[0.03] border border-cyan-500/5 hover:border-cyan-500/10 transition-all">
                <span className="text-cyan-400 font-bold mt-0.5 text-sm">✓</span>
                <p className="text-[var(--text-1)] leading-relaxed font-sans">
                  Interactive coordinates telemetry maps with pulsating thermal density layers for immediate regional workforce dispatching.
                </p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Community Showcase and Citizen Leaderboards */}
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24 items-center"
        >
          
          <div className="lg:col-span-5 text-left flex flex-col gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--cyan)]/10 text-[var(--cyan)] font-bold text-[10px] uppercase font-mono w-max">
              <Award className="w-3.5 h-3.5" />
              <span>Civic Cohesion metrics</span>
            </div>
            <h2 className="font-display font-black text-2xl md:text-4xl text-[var(--text-1)]">
              Community Showcase
            </h2>
            <p className="text-xs text-[var(--text-2)] leading-relaxed font-sans">
              Dynamic citizen action fuels municipal response. Our high-fidelity verification engine rewards helpful public reporting with municipal contribution XP.
            </p>

            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-500/5 dark:bg-[rgba(255,255,255,0.015)] border border-slate-200 dark:border-gray-800/80">
                <span className="block text-[10px] uppercase font-mono text-slate-500 dark:text-gray-500 font-bold">Total Confirmed Upvotes</span>
                <span className="block text-2xl font-display font-black text-cyan-400 mt-1">4.2K+ Votes</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-500/5 dark:bg-[rgba(255,255,255,0.015)] border border-slate-200 dark:border-gray-800/80">
                <span className="block text-[10px] uppercase font-mono text-slate-400 dark:text-gray-500 font-bold">Avg Response Time</span>
                <span className="block text-2xl font-display font-black text-emerald-400 mt-1">&lt; 18.5 Hrs</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="glass rounded-3xl p-6 border border-slate-250 dark:border-[rgba(255,255,255,0.06)] shadow-2xl relative text-left">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700/20 pb-3 mb-4">
                <span className="font-display font-bold text-xs uppercase tracking-wider text-[var(--text-2)] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" /> Active Citizen Honor Roll / XP Standings
                </span>
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">XP Reset 15d</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { name: "Suresh Pillai", zone: "Mumbai West Central", points: 2850, reports: 14, rank: 1 },
                  { name: "Anvitha Rao", zone: "Hyderabad Gachibowli", points: 2420, reports: 11, rank: 2 },
                  { name: "Tariq Mahmood", zone: "Delhi NCR Civil Lines", points: 2100, reports: 9, rank: 3 },
                  { name: "Preeti Sharma", zone: "Bangalore Whitefield", points: 1950, reports: 10, rank: 4 }
                ].map((cit) => (
                  <div key={cit.name} className="p-3 rounded-2xl bg-gray-500/5 hover:bg-[var(--cyan)]/5 border border-transparent hover:border-[var(--cyan)]/10 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/10 border border-cyan-500/20 flex items-center justify-center font-mono font-extrabold text-xs text-cyan-400">
                        #{cit.rank}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-[var(--text-1)]">{cit.name}</span>
                        <span className="block text-[10px] text-slate-500 dark:text-gray-500">{cit.zone}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-mono font-extrabold text-cyan-400">{cit.points} XP</span>
                      <span className="block text-[9px] text-[var(--text-2)]">{cit.reports} verified alerts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </motion.div>

        {/* Testimonials Layout Section */}
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="mb-24 relative z-10"
        >
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-widest font-mono font-bold text-[var(--cyan)] bg-[var(--cyan)]/10 px-3 py-1.5 rounded-full border border-[var(--cyan)]/25">
              Verified Outcomes
            </span>
            <h2 className="font-display font-black text-2xl md:text-4xl text-[var(--text-1)] mt-4">
              Praise from the Grid.
            </h2>
            <p className="text-xs text-[var(--text-2)] mt-1.5 max-w-xl mx-auto font-sans">
              How developers, citizen networks, and municipal authorities utilize the NexCivic platform to restore urban equilibrium.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                text: "The integration of server-side Gemini semantic sorting was a complete game-changer for our ward desk. We merged 420 repeating pothole tickets into 15 canonical repair paths instantly.",
                author: "Ward Engineer Rao",
                location: "Hyderabad GHMC Area",
                stars: 5
              },
              {
                text: "I uploaded a photo of water pipeline leakage in our sector with precise coordinate geolocations. To my astonishment, GHMC acknowledged it within 4 hours, and it was sealed by midnight!",
                author: "Ananya Deshpande",
                location: "Gachibowli sector-4",
                stars: 5
              },
              {
                text: "Being able to see real-time thermal concentrations of reports on our ward map completely changes how we plan desilting and transit lighting. Excellent civic software product engineering.",
                author: "Municipal Director Vyas",
                location: "Bangalore Urban Planning",
                stars: 5
              }
            ].map((test, index) => (
              <motion.div 
                key={test.author}
                whileHover={{ y: -5 }}
                className="glow-gradient-card p-6 flex flex-col justify-between text-left h-full"
              >
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(test.stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-2)] leading-relaxed italic font-sans">
                    "{test.text}"
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-250 dark:border-gray-700/10">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                    {test.author.charAt(0)}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[var(--text-1)]">{test.author}</span>
                    <span className="block text-[10px] text-gray-500">{test.location}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>



      </div>
    </div>
  );
}
