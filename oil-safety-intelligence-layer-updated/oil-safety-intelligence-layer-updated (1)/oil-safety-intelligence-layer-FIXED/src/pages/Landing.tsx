import { motion } from "framer-motion";
import { ArrowRight, Radar, ShieldAlert, Zap, Globe, Database, Cpu } from "lucide-react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import logo from "@/assets/logo.svg";

const IOGP_RULES_PREVIEW = [
  "Energy Isolation / LOTO",
  "Hot Work",
  "Confined Space Entry",
  "Line of Fire",
  "Working at Height",
  "Safe Driving",
  "Safe Mechanical Lifting",
  "Bypassing Safety Controls",
  "Asset Integrity",
  "Well Control",
];

const CAPABILITIES = [
  {
    icon: Globe,
    title: "ZERO-SHOT SEMANTIC TRANSLATION",
    color: "#2563EB",
    desc: "Assamese, Hindi and Bengali field narratives translated to standardized English via MiniLM-L6 embeddings — triaged without batching lag.",
  },
  {
    icon: ShieldAlert,
    title: "HIDDEN SIF PRECURSOR DETECTION",
    color: "#DC2626",
    desc: "Low-severity reports are scanned for energy-exposure precursors that historically escalate to serious injuries and fatalities.",
  },
  {
    icon: Zap,
    title: "FAILING BARRIER ROOT CAUSE",
    color: "#D97706",
    desc: "Bow-tie barrier analysis with systemic root-cause classification and OISD standard cross-references for every flagged failure.",
  },
  {
    icon: Database,
    title: "PERMANENT INDIAN HSSE CORPUS",
    color: "#16A34A",
    desc: "Baghjan, Digboi, Uran and legacy OIL incidents form the pattern-matching knowledge base for precursor density analytics.",
  },
];

const TICKER = [
  "BAGHJAN-5 BLOWOUT · PRECURSOR DENSITY 0.91",
  "IOGP LSR EDITION 2020 · 9 RULES + 3 FOCUS AREAS LOADED",
  "OISD-GDN-161 WELL BARRIER COMPLIANCE VERIFIED",
  "MINILM-L6-v2 384-D EMBEDDING SPACE ONLINE",
  "REAL-TIME TRIAGE · ZERO BATCH LAG",
  "KAKINADA OFFSHORE MARINE TRANSFER LIMITS ACTIVE",
];

export default function Landing() {
  const status = useQuery(api.safety.getEngineStatus);

  return (
    <div className="hud hud-grid-bg hud-scanline hud-vignette relative min-h-screen overflow-hidden text-[#1E293B]">
      {/* Floating holo-orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-[480px] rounded-full bg-[#2563EB]/6 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 size-[520px] rounded-full bg-[#2563EB]/5 blur-[140px]" />

      {/* HUD ticker strip */}
      <div className="relative z-10 overflow-hidden border-b border-[#2563EB]/15 bg-slate-50/90 py-1.5">
        <div className="hud-ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="mx-8 font-data text-[10px] tracking-[0.22em] text-[#2563EB]/55 whitespace-nowrap">
              {t} <span className="text-[#2563EB]/25">//</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="glow-pulse flex size-11 items-center justify-center rounded-lg border border-[#2563EB]/40 bg-white">
            <img src={logo} alt="OIL" className="size-7" />
          </div>
          <div>
            <p className="font-display text-sm font-bold tracking-widest text-[#2563EB] text-glow-cyan">OIL</p>
            <p className="font-data text-[9px] tracking-[0.3em] text-[#64748B]">SAFETY INTELLIGENCE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/auth?returnTo=%2Fdashboard"
            className="hidden rounded-md border border-[#2563EB]/25 px-4 py-2 font-head text-sm font-semibold tracking-wider text-[#1E293B] transition hover:border-[#2563EB]/60 hover:bg-[#2563EB]/5 sm:block"
          >
            SUPERVISOR SIGN-IN
          </Link>
          <Link
            to="/auth?returnTo=%2Fdashboard"
            className="glow-pulse flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 font-head text-sm font-bold tracking-wider text-[#FFFFFF] transition hover:bg-[#2563EB]/85"
          >
            LAUNCH HUD <ArrowRight className="size-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-20 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#16A34A]/30 bg-[#16A34A]/5 px-4 py-1.5">
            <span className="hud-blink size-2 rounded-full bg-[#16A34A]" />
            <span className="font-data text-[10px] tracking-[0.25em] text-[#16A34A]">
              {status ? `ENGINE ${status.status} · ${status.triage_mode}` : "INITIALIZING ENGINE…"}
            </span>
          </div>
          <h1 className="font-display max-w-4xl text-4xl leading-tight font-black tracking-wide text-foreground sm:text-6xl">
            AI SAFETY INTELLIGENCE <span className="text-glow-cyan text-[#2563EB]">LAYER</span>
          </h1>
          <p className="font-head mt-6 max-w-2xl text-lg font-medium text-[#475569] sm:text-xl">
            Command-center triage for Oil India Limited — real-time SIF classification, IOGP Life-Saving Rule
            tagging and failing-barrier root cause analysis across Duliajan, Digboi, Baghjan, Moran and Kakinada
            Offshore.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/auth?returnTo=%2Fdashboard"
              className="group flex items-center gap-3 rounded-lg bg-[#2563EB] px-7 py-3.5 font-head text-base font-bold tracking-wider text-[#FFFFFF] transition hover:bg-[#2563EB]/85"
            >
              ENTER COMMAND CENTER
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="font-data flex items-center gap-2 text-[11px] tracking-widest text-[#64748B]">
              <Cpu className="size-4 text-[#2563EB]" />
              {status ? status.engine_summary : "MODEL LOADING"}
            </div>
          </div>
        </motion.div>

        {/* Hero holo-panel */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="glass hud-corner hud-sweep relative mt-14 rounded-xl p-6 sm:p-8"
        >
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">REPORTS INGESTED</p>
              <p className="font-display mt-2 text-3xl font-bold text-foreground">{status ? "LIVE" : "—"}</p>
              <p className="font-data mt-1 text-xs text-[#16A34A]">REAL-TIME TRIAGE ACTIVE</p>
            </div>
            <div>
              <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">SIF PRECURSOR ENGINE</p>
              <p className="font-display mt-2 text-3xl font-bold text-[#DC2626] text-glow-crimson">15-PATTERN</p>
              <p className="font-data mt-1 text-xs text-[#475569]">ENERGY-EXPOSURE DETECTION MATRIX</p>
            </div>
            <div>
              <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">KNOWLEDGE BASE</p>
              <p className="font-display mt-2 text-3xl font-bold text-[#D97706] text-glow-amber">
                {status ? `${status.knowledge_base.incidents}` : "—"} <span className="text-lg">CASES</span>
              </p>
              <p className="font-data mt-1 text-xs text-[#475569]">INDIAN O&amp;G INCIDENT CORPUS</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {IOGP_RULES_PREVIEW.map((r) => (
              <span
                key={r}
                className="font-data rounded border border-[#2563EB]/20 bg-[#2563EB]/5 px-2.5 py-1 text-[10px] tracking-wider text-[#2563EB]/80"
              >
                {r.toUpperCase()}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Capabilities */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 flex items-center gap-3">
          <Radar className="size-5 text-[#2563EB]" />
          <h2 className="font-display text-xl font-bold tracking-widest text-foreground">HOLOGRAPHIC ANALYTICS MODULES</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {CAPABILITIES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass hud-corner group rounded-xl p-6 transition hover:-translate-y-1"
            >
              <div
                className="mb-4 flex size-12 items-center justify-center rounded-lg border"
                style={{ borderColor: `${c.color}55`, background: `${c.color}0d`, boxShadow: `0 0 16px ${c.color}22` }}
              >
                <c.icon className="size-6" style={{ color: c.color }} />
              </div>
              <h3 className="font-display text-sm font-bold tracking-widest" style={{ color: c.color }}>
                {c.title}
              </h3>
              <p className="font-head mt-3 text-[15px] leading-relaxed text-[#475569]">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="glass glass-cyan hud-sweep relative overflow-hidden rounded-xl p-10 text-center">
          <h2 className="font-display text-2xl font-black tracking-widest text-foreground sm:text-3xl">
            ONE LAYER. EVERY ASSET. <span className="text-glow-cyan text-[#2563EB]">ZERO BATCH LAG.</span>
          </h2>
          <p className="font-head mx-auto mt-4 max-w-xl text-[#475569]">
            Sign in to the Supervisor Live Upload &amp; Assess Portal — multilingual narratives in, structured JSON
            risk analytics out.
          </p>
          <Link
            to="/auth?returnTo=%2Fdashboard"
            className="glow-pulse mt-8 inline-flex items-center gap-3 rounded-lg bg-[#2563EB] px-8 py-3.5 font-head text-base font-bold tracking-wider text-[#FFFFFF] transition hover:bg-[#2563EB]/85"
          >
            INITIALIZE HUD DASHBOARD <ArrowRight className="size-5" />
          </Link>
        </div>
        <p className="font-data mt-8 text-center text-[10px] tracking-[0.3em] text-[#64748B]">
          OIL SAFETY INTELLIGENCE LAYER // OIL INDIA LIMITED // IOGP LSR EDITION 2020 // OISD CROSS-REFERENCED
        </p>
      </section>
    </div>
  );
}
