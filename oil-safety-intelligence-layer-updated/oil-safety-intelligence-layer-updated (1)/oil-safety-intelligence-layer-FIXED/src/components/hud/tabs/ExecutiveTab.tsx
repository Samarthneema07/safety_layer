import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertTriangle, ShieldCheck, Activity, Timer, Radar, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HudPanel, MetricCard, GlowBar, Chip, RISK_COLORS, LANG_COLORS, type TabId } from "@/components/hud/hud";

export default function ExecutiveTab({ onNavigate }: { onNavigate: (t: TabId) => void; activeAsset?: string }) {
  const stats = useQuery(api.safety.getStats);
  const reports = useQuery(api.safety.listReports, { limit: 8 });
  const seedDemo = useAction(api.safety.seedDemoFeed);
  const [seeding, setSeeding] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo({});
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          label="REPORTS INGESTED"
          value={stats ? stats.totalReports : "—"}
          sub={stats ? `${stats.avgLatencyMs}ms avg triage` : "awaiting telemetry"}
          accent="#2563EB"
        />
        <MetricCard
          label="SIF PRECURSOR DENSITY"
          value={stats ? `${stats.sifDensity}%` : "—"}
          sub={stats ? `${stats.sifCount} SIF-potential flagged` : ""}
          accent="#DC2626"
          pulse={(stats?.sifDensity ?? 0) >= 50}
        />
        <MetricCard
          label="CRITICAL RISK ASSET"
          value={stats?.criticalAssets[0]?.score ? stats.criticalAssets[0].score : "—"}
          sub={stats?.criticalAssets[0]?.asset ?? "no data"}
          accent="#D97706"
        />
        <MetricCard
          label="DOMINANT FAILING BARRIER"
          value={<span className="text-base">{stats ? stats.dominantBarrier : "—"}</span>}
          sub={stats && stats.dominantBarrierCount > 0 ? `${stats.dominantBarrierCount} failures logged` : ""}
          accent="#DC2626"
        />
        <MetricCard
          label="TOP IOGP RULE"
          value={<span className="text-base">{stats ? stats.topIogpRule : "—"}</span>}
          sub={stats && stats.topIogpCount > 0 ? `${stats.topIogpCount} primary mappings` : ""}
          accent="#16A34A"
        />
      </div>

      {stats && stats.totalReports === 0 && (
        <div className="glass glass-amber flex flex-col items-center gap-3 rounded-xl p-8 text-center">
          <AlertTriangle className="size-8 text-[#D97706]" />
          <p className="font-display text-sm font-bold tracking-widest text-[#D97706]">NO TELEMETRY INGESTED</p>
          <p className="font-head max-w-md text-sm text-[#475569]">
            The engine is online but the report pipeline is empty. Ingest a representative multilingual demo set to
            activate the analytics layer.
          </p>
          <button
            onClick={runSeed}
            disabled={seeding}
            className="glow-pulse mt-2 rounded-md bg-[#2563EB] px-6 py-2.5 font-head text-sm font-bold tracking-wider text-[#FFFFFF] transition hover:bg-[#2563EB]/85 disabled:opacity-50"
          >
            {seeding ? "INGESTING…" : "INGEST DEMO FEED"}
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Risk distribution */}
        <HudPanel title="RISK LEVEL DISTRIBUTION" code="RISK-DIST-01">
          <div className="space-y-3">
            {stats ? (
              Object.entries(stats.riskDistribution).map(([level, count]) => {
                const pct = stats.totalReports ? (count / stats.totalReports) * 100 : 0;
                return (
                  <div key={level}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-data text-[10px] tracking-[0.2em]" style={{ color: RISK_COLORS[level] }}>
                        {level}
                      </span>
                      <span className="font-data text-[10px] text-[#475569]">
                        {count} · {Math.round(pct)}%
                      </span>
                    </div>
                    <GlowBar pct={pct} color={RISK_COLORS[level]} />
                  </div>
                );
              })
            ) : (
              <p className="font-data text-[10px] text-[#64748B]">AWAITING DATA…</p>
            )}
          </div>
          <div className="mt-5 border-t border-[#2563EB]/10 pt-4">
            <p className="font-data mb-3 text-[9px] tracking-[0.25em] text-[#64748B]">SOURCE LANGUAGE MIX</p>
            <div className="flex flex-wrap gap-2">
              {stats && Object.keys(stats.languageDistribution).length > 0 ? (
                Object.entries(stats.languageDistribution).map(([lang, n]) => (
                  <Chip key={lang} text={`${lang.toUpperCase()} · ${n}`} color={LANG_COLORS[lang] ?? "#2563EB"} />
                ))
              ) : (
                <span className="font-data text-[10px] text-[#64748B]">NO NARRATIVES PARSED</span>
              )}
            </div>
          </div>
        </HudPanel>

        {/* Critical assets scoreboard */}
        <HudPanel title="ASSET CRITICALITY SCOREBOARD" code="ASSET-SCORE-02">
          <div className="space-y-3.5">
            {stats && stats.criticalAssets.some((a) => a.total > 0) ? (
              stats.criticalAssets.map((a) => (
                <div key={a.asset}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-head truncate text-sm font-semibold text-foreground/90">{a.asset}</span>
                    <span className="font-data text-[10px]" style={{ color: a.score >= 60 ? "#DC2626" : a.score >= 35 ? "#D97706" : "#16A34A" }}>
                      {a.score} · {a.sifCount}/{a.total} SIF
                    </span>
                  </div>
                  <GlowBar pct={a.score} color={a.score >= 60 ? "#DC2626" : a.score >= 35 ? "#D97706" : "#16A34A"} height={6} />
                </div>
              ))
            ) : (
              <p className="font-data text-[10px] text-[#64748B]">AWAITING ASSET TELEMETRY…</p>
            )}
          </div>
        </HudPanel>

        {/* IOGP rule distribution */}
        <HudPanel title="IOGP LSR MAPPING FREQUENCY" code="IOGP-FREQ-03">
          <div className="space-y-3.5">
            {stats && stats.ruleDistribution.length > 0 ? (
              stats.ruleDistribution.slice(0, 7).map((r) => {
                const max = stats.ruleDistribution[0].count || 1;
                return (
                  <div key={r.rule}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-head truncate text-sm text-foreground/90">{r.rule}</span>
                      <span className="font-data text-[10px]" style={{ color: r.color }}>
                        {r.count}
                      </span>
                    </div>
                    <GlowBar pct={(r.count / max) * 100} color={r.color} height={6} />
                  </div>
                );
              })
            ) : (
              <p className="font-data text-[10px] text-[#64748B]">NO RULE MAPPINGS YET…</p>
            )}
          </div>
        </HudPanel>
      </div>

      {/* Live triage feed */}
      <HudPanel
        title="LIVE TRIAGE FEED — LATEST ASSESSMENTS"
        code="FEED-04"
        action={
          <button
            onClick={() => onNavigate("assess")}
            className="font-data flex items-center gap-1.5 rounded border border-[#2563EB]/30 px-2 py-1 text-[9px] tracking-[0.15em] text-[#2563EB] transition hover:bg-[#2563EB]/10"
          >
            <Activity className="size-3" /> OPEN PORTAL
          </button>
        }
      >
        {reports && reports.length > 0 ? (
          <div className="hud-scroll max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
            {reports.map((r) => {
              const color = RISK_COLORS[r.riskLevel] ?? "#2563EB";
              const open = expanded === r._id;
              return (
                <div key={r._id} className="rounded-lg border border-[#2563EB]/10 bg-slate-50">
                  <button
                    onClick={() => setExpanded(open ? null : r._id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span
                      className={`size-2 shrink-0 rounded-full ${r.riskLevel === "CRITICAL" ? "crit-pulse" : ""}`}
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-head truncate text-sm text-foreground/90">{r.originalText}</p>
                      <p className="font-data mt-0.5 text-[9px] tracking-wider text-[#64748B]">
                        {r.asset.toUpperCase()} · {r.originalLanguage.toUpperCase()} · {new Date(r.createdAt).toLocaleTimeString()} · {r.triageLatencyMs}MS
                      </p>
                    </div>
                    <Chip text={r.sifLabel} color={color} solid={r.sifLabel === "SIF-POTENTIAL"} />
                    <ChevronDown className={`size-4 shrink-0 text-[#64748B] transition ${open ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[#2563EB]/10"
                      >
                        <div className="space-y-3 px-3 py-3">
                          <div>
                            <p className="font-data mb-1 text-[9px] tracking-[0.2em] text-[#2563EB]">TRANSLATED NARRATIVE</p>
                            <p className="font-head text-sm text-[#475569]">{r.translatedNarrative}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="font-data mb-1 text-[9px] tracking-[0.2em] text-[#D97706]">FAILING BARRIER</p>
                              <p className="font-head text-sm text-foreground/85">{r.barrierName}</p>
                              <p className="font-data mt-0.5 text-[9px] text-[#64748B]">{r.oisdReference}</p>
                            </div>
                            <div>
                              <p className="font-data mb-1 text-[9px] tracking-[0.2em] text-[#DC2626]">IOGP MAPPING</p>
                              <p className="font-head text-sm text-foreground/85">{r.iogpPrimary}</p>
                              <p className="font-data mt-0.5 text-[9px] text-[#64748B]">{r.iogpSecondary.join(" · ")}</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-data mb-1 text-[9px] tracking-[0.2em] text-[#DC2626]">ROOT CAUSE</p>
                            <p className="font-head text-sm text-[#475569]">{r.rootCause}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-3.5 text-[#16A34A]" />
                            <p className="font-head text-xs text-[#16A34A]">{r.immediateAction}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-6 text-center">
            <Radar className="hud-radar mx-auto size-6 text-[#2563EB]" />
            <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">
              SCANNING FOR INCOMING REPORTS — PIPELINE IDLE
            </p>
            <Timer className="mx-auto size-6 text-[#64748B]" />
          </div>
        )}
      </HudPanel>
    </div>
  );
}
