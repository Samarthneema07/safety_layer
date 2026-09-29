import type { ReactNode } from "react";
import { motion } from "framer-motion";

/* ===================== SHARED HUD PRIMITIVES & DATA ===================== */

export type TabId = "exec" | "assess" | "heatmap" | "barrier" | "dataset" | "gap" | "eval" | "replay";

export const OIL_ASSETS = [
  "Duliajan",
  "Digboi",
  "Baghjan",
  "Moran",
  "Kakinada Offshore",
  "Downstream E&P (Numaligarh/Jorhat)",
] as const;

export const ASSET_COORDS: Record<string, { x: number; y: number }> = {
  Duliajan: { x: 27, y: 52 },
  Digboi: { x: 33, y: 58 },
  Baghjan: { x: 38, y: 63 },
  Moran: { x: 22, y: 47 },
  "Kakinada Offshore": { x: 76, y: 84 },
  "Downstream E&P (Numaligarh/Jorhat)": { x: 16, y: 42 },
};

export const RISK_COLORS: Record<string, string> = {
  CRITICAL: "#DC2626",
  HIGH: "#D97706",
  MEDIUM: "#2563EB",
  LOW: "#16A34A",
};

export const LANG_COLORS: Record<string, string> = {
  Assamese: "#16A34A",
  Hindi: "#D97706",
  Bengali: "#2563EB",
  English: "#475569",
};

/** Mandatory incident classification options for the Assess Report form. */
export const INCIDENT_TYPES = [
  "Near Miss",
  "Unsafe Condition",
  "Unsafe Act",
  "Equipment Failure",
  "Process Safety Event",
  "Spill / Leak",
  "Fire / Explosion",
  "Injury / Illness",
  "Other",
] as const;

/** Minimum narrative length (chars) and word count required before a report can be submitted. */
export const NARRATIVE_MIN_CHARS = 30;
export const NARRATIVE_MIN_WORDS = 6;

export interface DemoPreset {
  label: string;
  asset: string;
  language: string;
  text: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    label: "BAGHJAN WORKOVER GAS LEAK",
    asset: "Baghjan",
    language: "Assamese",
    text: "ৱৰ্কঅভাৰৰ সময়ত কুঁৱাৰ পৰা গেছ লিক ধৰা পৰিছে। safety valve bypass কৰা হৈছিল আৰু গেছ টেস্ট কৰা হোৱা নাছিল। কিন্তু এতিয়াও চাপ বেছি, wellheadৰ কাষত কাম চলি আছে।",
  },
  {
    label: "CONFINED SPACE ENTRY NO PERMIT",
    asset: "Digboi",
    language: "Hindi",
    text: "टंकी के अंदर प्रवेश बिना परमिट और गैस टेस्ट के किया गया। ऑक्सीजन नहीं जांची गई, मैनहोल पर attendant नहीं था और rescue tripod तैयार नहीं था।",
  },
  {
    label: "PIPELINE HOT WORK NEAR FLANGE LEAK",
    asset: "Duliajan",
    language: "Bengali",
    text: "পাইপলাইনের কাছে welding ও grinding চলছে, flange থেকে hydrocarbon লিক হচ্ছে, কিন্তু fire watch নেই এবং কোনো permit ছাড়া কাজ চলছে।",
  },
  {
    label: "LOTO SKIPPED ON LIVE PANEL",
    asset: "Duliajan",
    language: "English",
    text: "Fitter opened 415V electrical panel without LOTO isolation to replace contactor. Only single point isolation was applied on a parallel feed, no zero energy verification, residual hydrocarbon transfer line not depressurized.",
  },
  {
    label: "KAKINADA CREW TRANSFER SEA STATE",
    asset: "Kakinada Offshore",
    language: "English",
    text: "Crew transfer to wellhead platform continued despite sea state above transfer limit matrix. Lifejacket not fastened, gangway heave margin zero, comms failure between coxswain and deck supervisor during man overboard near miss.",
  },
  {
    label: "CRANE RIGGER INSIDE SWING RADIUS",
    asset: "Moran",
    language: "English",
    text: "Crane slew started while rigger stood inside swing radius guiding suspended load. Tagline not used, wind speed above lift plan limit, exclusion zone barricade removed. Rigger suffered crush injury to leg.",
  },
  {
    label: "TOOLBOX TALK LATE / HELMET (LOW SEV)",
    asset: "Moran",
    language: "Assamese",
    text: "টুলবক্স মিটিং দেৰিৰে হৈছিল, helmet কিছুমান মানুহে পৰিধান কৰা নাছিল। চাইটত housekeeping ভাল নাছিল।",
  },
  {
    label: "H2S RELEASE DURING PIGGING",
    asset: "Digboi",
    language: "English",
    text: "H2S release during pigging operation at oil collecting station. Fixed gas detector not calibrated, personal monitor not carried by crew, wind direction changed toward muster point. Six operators exposed, ESD actuated late.",
  },
];

export function riskColor(risk: string): string {
  return RISK_COLORS[risk] ?? "#2563EB";
}

export function fmtClock(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function fmtIst(d: Date) {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())}`;
}

export function HudPanel({
  title,
  code,
  accent = "#2563EB",
  children,
  className = "",
  action,
}: {
  title: string;
  code?: string;
  accent?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`glass hud-corner relative rounded-xl ${className}`}>
      <div className="flex items-center justify-between border-b border-[#2563EB]/10 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
          <h3 className="font-display text-[11px] font-bold tracking-[0.2em] text-foreground/90">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {action}
          {code && <span className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">{code}</span>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  accent,
  pulse,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass hud-sweep relative overflow-hidden rounded-xl p-4 ${pulse ? "crit-pulse" : ""}`}
      style={{ borderColor: `${accent}40` }}
    >
      <p className="font-data text-[9px] tracking-[0.25em] text-[#64748B]">{label}</p>
      <p className="font-display mt-2 truncate text-2xl font-bold" style={{ color: accent, textShadow: `0 0 14px ${accent}66` }}>
        {value}
      </p>
      {sub && <p className="font-data mt-1 truncate text-[10px] text-[#475569]/70">{sub}</p>}
    </motion.div>
  );
}

export function GlowBar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-[#2563EB]/8" style={{ height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}55, ${color})`, boxShadow: `0 0 12px ${color}` }}
      />
    </div>
  );
}

export function Chip({ text, color = "#2563EB", solid = false }: { text: string; color?: string; solid?: boolean }) {
  return (
    <span
      className="font-data inline-flex items-center rounded border px-2 py-0.5 text-[9px] tracking-wider whitespace-nowrap"
      style={{
        borderColor: `${color}55`,
        background: solid ? color : `${color}0d`,
        color: solid ? "#FFFFFF" : color,
        boxShadow: solid ? `0 0 14px ${color}66` : "none",
      }}
    >
      {text}
    </span>
  );
}
