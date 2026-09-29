import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronDown, Wrench, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HudPanel, GlowBar, Chip, RISK_COLORS } from "@/components/hud/hud";

export default function BarrierEngineTab() {
  const stats = useQuery(api.safety.getStats);
  const [open, setOpen] = useState<string | null>(null);

  const barriers = stats?.barrierDensity ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Precursor density leaderboard */}
        <HudPanel title="FAILING BARRIER — PRECURSOR DENSITY LEADERBOARD" code="BARRIER-01" accent="#DC2626">
          {barriers.length > 0 ? (
            <div className="space-y-4">
              {barriers.map((b) => {
                const color = b.density >= 70 ? "#DC2626" : b.density >= 45 ? "#D97706" : "#2563EB";
                return (
                  <div key={b.barrier}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-head truncate text-sm font-semibold text-foreground/90">{b.barrier}</span>
                      <span className="font-data text-[10px]" style={{ color }}>
                        {b.density}% · {b.count}×
                      </span>
                    </div>
                    <GlowBar pct={b.density} color={color} height={8} />
                    <p className="font-data mt-1 text-[9px] tracking-wider text-[#64748B]">{b.oisd}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-data py-8 text-center text-[10px] tracking-[0.25em] text-[#64748B]">
              NO BARRIER FAILURES LOGGED — RUN TRIAGE TO POPULATE
            </p>
          )}
        </HudPanel>

        {/* Root cause category summary */}
        <HudPanel title="ROOT CAUSE CATEGORY MATRIX" code="RCA-02" accent="#D97706">
          <div className="grid grid-cols-2 gap-3">
            {(["System / Process", "Asset Integrity", "Human Factor", "Environmental"] as const).map((cat) => {
              const count = (stats?.recentCritical ?? []).filter((r) => r.rootCauseCategory === cat).length;
              const colors: Record<string, string> = {
                "System / Process": "#2563EB",
                "Asset Integrity": "#D97706",
                "Human Factor": "#DC2626",
                Environmental: "#16A34A",
              };
              return (
                <div key={cat} className="rounded-lg border bg-slate-50 p-3.5" style={{ borderColor: `${colors[cat]}30` }}>
                  <p className="font-data text-[9px] tracking-[0.18em]" style={{ color: colors[cat] }}>
                    {cat.toUpperCase()}
                  </p>
                  <p className="font-display mt-1.5 text-2xl font-bold text-foreground">{count}</p>
                  <p className="font-data text-[9px] text-[#64748B]">recent critical/high</p>
                </div>
              );
            })}
          </div>
          <p className="font-data mt-4 border-t border-[#2563EB]/10 pt-3 text-[9px] leading-relaxed tracking-[0.12em] text-[#64748B]">
            CATEGORY MIX DRIVES LONG-TERM FIX SELECTION — SYSTEM/PROCESS FAILURES DEMAND DIGITIZED BARRIER
            VERIFICATION, ASSET INTEGRITY DEMANDS RBI/CML RE-BASELINING.
          </p>
        </HudPanel>
      </div>

      {/* Bow-tie cards */}
      <HudPanel title="BOW-TIE BARRIER CARDS — EXPAND FOR ROOT CAUSE & OISD REFERENCES" code="BOWTIE-03" accent="#2563EB">
        {barriers.length > 0 ? (
          <div className="hud-scroll max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
            {barriers.map((b) => {
              const openCard = open === b.barrier;
              const color = b.density >= 70 ? "#DC2626" : b.density >= 45 ? "#D97706" : "#2563EB";
              return (
                <div key={b.barrier} className={`rounded-lg border bg-slate-50 ${openCard ? (color === "#DC2626" ? "glass-crimson" : "glass-cyan") : "border-[#2563EB]/10"}`}>
                  <button onClick={() => setOpen(openCard ? null : b.barrier)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-head truncate text-sm font-semibold text-foreground/90">{b.barrier}</p>
                      <p className="font-data text-[9px] tracking-wider text-[#64748B]">
                        {b.count} FAILURES · OISD: {b.oisd}
                      </p>
                    </div>
                    <div className="w-28">
                      <GlowBar pct={b.density} color={color} height={6} />
                    </div>
                    <span className="font-data text-[10px]" style={{ color }}>
                      {b.density}%
                    </span>
                    <ChevronDown className={`size-4 shrink-0 text-[#64748B] transition ${openCard ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openCard && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="border-t border-[#2563EB]/10 px-4 py-3">
                          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                            <div className="rounded border border-[#DC2626]/25 bg-[#DC2626]/5 p-3">
                              <p className="font-data text-[9px] tracking-[0.2em] text-[#DC2626]">THREAT (LEFT SIDE)</p>
                              <p className="font-head mt-1 text-sm text-[#1E293B]">{threatOf(b.barrier)}</p>
                            </div>
                            <div className="hidden items-center justify-center md:flex">
                              <p className="font-display rotate-0 text-[9px] tracking-[0.3em] text-[#2563EB]">BOW-TIE</p>
                            </div>
                            <div className="rounded border border-[#D97706]/25 bg-[#D97706]/5 p-3">
                              <p className="font-data text-[9px] tracking-[0.2em] text-[#D97706]">CONSEQUENCE (RIGHT SIDE)</p>
                              <p className="font-head mt-1 text-sm text-[#1E293B]">{consequenceOf(b.barrier)}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Chip text={`OISD: ${b.oisd}`} color="#D97706" />
                            <Chip text={`PRECURSOR DENSITY ${b.density}%`} color={color} solid={b.density >= 70} />
                            <Chip text={`${b.count} FAILURE EVENTS`} color="#475569" />
                          </div>
                          <p className="font-data mt-3 text-[9px] leading-relaxed tracking-[0.1em] text-[#64748B]">
                            ROOT CAUSE TEMPLATE: SYSTEMIC SKIPS DEMAND DIGITIZED VERIFICATION · INTEGRITY DEGRADATION
                            DEMANDS RBI REFRESH · HUMAN-FACTOR DEFEATS DEMAND BBS COACHING + STOP-WORK AUTHORITY.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <Wrench className="size-7 text-[#2563EB]/40" />
            <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">BOW-TIE LIBRARY POPULATES FROM LIVE TRIAGE EVENTS</p>
            <div className="flex gap-2">
              <Chip text="12 BARRIER TYPES" color="#2563EB" />
              <Chip text="OISD CROSS-REF" color="#D97706" />
              <Chip text="ROOT-CAUSE ENGINE" color={RISK_COLORS.CRITICAL} />
            </div>
          </div>
        )}
      </HudPanel>

      {/* Recent critical narratives */}
      <HudPanel title="CRITICAL EVENT RECONSTRUCTION" code="CRIT-04" accent="#DC2626">
        {stats && stats.recentCritical.length > 0 ? (
          <div className="hud-scroll max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
            {stats.recentCritical.map((r) => (
              <div key={r._id} className="rounded-lg border border-[#DC2626]/15 bg-slate-50 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldAlert className="size-3.5 text-[#DC2626]" />
                  <span className="font-data text-[10px] tracking-wider text-[#DC2626]">{r.riskLevel}</span>
                  <span className="font-data text-[9px] text-[#64748B]">
                    {r.asset.toUpperCase()} · {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="font-head mt-2 text-sm text-foreground/85">{r.barrierName} — {r.rootCauseCategory}</p>
                <p className="font-head mt-1.5 text-xs leading-relaxed text-[#475569]">{r.rootCause}</p>
                <p className="font-data mt-2 text-[9px] tracking-wider text-[#64748B]">REF: {r.referenceIncident}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-data py-6 text-center text-[10px] tracking-[0.25em] text-[#64748B]">
            NO CRITICAL EVENTS IN CURRENT WINDOW
          </p>
        )}
      </HudPanel>
    </div>
  );
}

/* Barrier bow-tie metadata lookup (mirrors engine catalog) */
const BARRIER_META: Record<string, { threat: string; consequence: string }> = {
  "Primary Well Barrier Envelope": {
    threat: "Lost hydrostatic overbalance during tripping / swabbing",
    consequence: "Uncontrolled well release (blowout) & ignition",
  },
  "Secondary Well Barrier Envelope": {
    threat: "Kick not detected / late shut-in",
    consequence: "Surface release at wellhead, formation damage",
  },
  "Process Containment (Piping / Flanges / Hoses)": {
    threat: "Corrosion, gasket failure, hammer union blow-off",
    consequence: "Hydrocarbon release, flash fire, VCE",
  },
  "Pressure Relief & Depressurization": {
    threat: "PSV gagged / set pressure above MAWP",
    consequence: "Vessel overpressure rupture",
  },
  "ESD & Fire & Gas Detection": {
    threat: "Gas cloud undetected, ESD not initiated",
    consequence: "Ignition of release, escalation to adjacent units",
  },
  "Electrical Energy Isolation (LOTO)": {
    threat: "Stored / live energy not isolated before work",
    consequence: "Electric shock, arc flash, fatality",
  },
  "Hot Work Control Barrier": {
    threat: "Ignition source near hydrocarbon atmosphere",
    consequence: "Flash fire / explosion in work zone",
  },
  "Confined Space Rescue & Atmosphere Control": {
    threat: "Toxic / oxygen-deficient atmosphere in vessel",
    consequence: "Asphyxiation, H2S poisoning, fatal entry",
  },
  "Line-of-Fire & Dropped Object Controls": {
    threat: "Personnel within swing radius / under load",
    consequence: "Struck-by, crush injury, fatality",
  },
  "Fall Prevention / Arrest System": {
    threat: "Work at unprotected edge without anchorage",
    consequence: "Fatal fall from height",
  },
  "Journey Management & Vehicle Safety": {
    threat: "Speeding, fatigue, night convoy risk",
    consequence: "Road traffic fatality",
  },
  "Marine Transfer Barrier (Kakinada Offshore)": {
    threat: "Deck transfer in sea state beyond limits",
    consequence: "Man overboard, vessel collision",
  },
};

function threatOf(name: string) {
  return BARRIER_META[name]?.threat ?? "—";
}
function consequenceOf(name: string) {
  return BARRIER_META[name]?.consequence ?? "—";
}
