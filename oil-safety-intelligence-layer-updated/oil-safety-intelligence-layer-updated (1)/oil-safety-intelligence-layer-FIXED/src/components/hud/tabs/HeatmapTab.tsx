import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MapPin, Radar } from "lucide-react";
import { motion } from "framer-motion";
import { HudPanel, GlowBar, Chip, ASSET_COORDS, RISK_COLORS } from "@/components/hud/hud";

function riskColor(score: number) {
  return score >= 60 ? "#DC2626" : score >= 35 ? "#D97706" : score > 0 ? "#16A34A" : "#94A3B8";
}

export default function HeatmapTab() {
  const stats = useQuery(api.safety.getStats);

  const assetScores: Record<string, { score: number; sifCount: number; total: number }> = {};
  for (const a of stats?.criticalAssets ?? []) {
    assetScores[a.asset] = { score: a.score, sifCount: a.sifCount, total: a.total };
  }

  const hotspots = [...(stats?.criticalAssets ?? [])].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-5">
      <HudPanel title="LOCATION RISK HEATMAP — OIL ASSET GRID" code="HEATMAP-01">
        {stats && stats.totalReports > 0 ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#2563EB]/15 bg-[#F1F5F9] sm:aspect-[2.4/1]">
            {/* backdrop grid */}
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {/* radar sweep */}
            <div className="hud-radar absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]">
              <div
                className="size-full"
                style={{ background: "conic-gradient(from 0deg, rgba(37,99,235,0.9), transparent 22%)" }}
              />
            </div>

            {/* asset nodes */}
            {Object.entries(ASSET_COORDS).map(([asset, c], i) => {
              const s = assetScores[asset] ?? { score: 0, sifCount: 0, total: 0 };
              const color = riskColor(s.score);
              const size = 18 + Math.min(26, s.score / 3);
              return (
                <motion.div
                  key={asset}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="group absolute"
                  style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className={`relative -translate-x-1/2 -translate-y-1/2 rounded-full ${s.score >= 60 ? "crit-pulse" : "glow-pulse"}`}
                    style={{
                      width: size,
                      height: size,
                      background: `${color}30`,
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 18px ${color}88`,
                    }}
                  />
                  <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-[#2563EB]/25 bg-slate-800 px-2.5 py-1.5 opacity-0 transition group-hover:opacity-100">
                    <p className="font-data text-[10px] font-semibold" style={{ color }}>
                      {asset.toUpperCase()}
                    </p>
                    <p className="font-data text-[9px] text-[#475569]">
                      RISK {s.score} · {s.sifCount}/{s.total} SIF
                    </p>
                  </div>
                  <span
                    className="font-data absolute top-3 left-4 text-[8px] tracking-[0.15em] whitespace-nowrap"
                    style={{ color: `${color}cc` }}
                  >
                    {asset.toUpperCase()}
                  </span>
                </motion.div>
              );
            })}

            {/* corner telemetry */}
            <div className="font-data absolute top-3 left-3 text-[8px] tracking-[0.2em] text-[#64748B]">
              GEO-GRID // NE-INDIA CLUSTER + ECOAST OFFSHORE
            </div>
            <div className="font-data absolute right-3 bottom-3 text-[8px] tracking-[0.2em] text-[#64748B]">
              NODE INTENSITY = COMPOSITE RISK SCORE
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-14">
            <Radar className="hud-radar size-7 text-[#2563EB]" />
            <p className="font-data text-[10px] tracking-[0.3em] text-[#64748B]">NO GEOSPATIAL TELEMETRY — INGEST REPORTS TO POPULATE GRID</p>
          </div>
        )}
      </HudPanel>

      <div className="grid gap-5 lg:grid-cols-3">
        {hotspots.map((a, rank) => {
          const color = riskColor(a.score);
          return (
            <HudPanel key={a.asset} title={`HOTSPOT #${rank + 1} — ${a.asset.toUpperCase()}`} code={`HS-0${rank + 1}`} accent={color}>
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <p className="font-display text-4xl font-black" style={{ color, textShadow: `0 0 18px ${color}77` }}>
                    {a.score}
                  </p>
                  <Chip text={a.score >= 60 ? "CRITICAL THREAT" : a.score >= 35 ? "ELEVATED" : "NOMINAL"} color={color} solid={a.score >= 60} />
                </div>
                <GlowBar pct={a.score} color={color} height={7} />
                <div className="font-data grid grid-cols-2 gap-2 text-[10px] text-[#475569]">
                  <div className="rounded border border-[#2563EB]/12 bg-slate-50 p-2">
                    <p className="text-[8px] tracking-[0.2em] text-[#64748B]">REPORTS</p>
                    <p className="mt-0.5 text-foreground">{a.total}</p>
                  </div>
                  <div className="rounded border border-[#DC2626]/15 bg-slate-50 p-2">
                    <p className="text-[8px] tracking-[0.2em] text-[#64748B]">SIF-POTENTIAL</p>
                    <p className="mt-0.5" style={{ color: RISK_COLORS.CRITICAL }}>{a.sifCount}</p>
                  </div>
                </div>
              </div>
            </HudPanel>
          );
        })}
      </div>

      {!stats?.criticalAssets.some((a) => a.total > 0) && (
        <div className="glass flex items-center justify-center gap-3 rounded-xl p-8">
          <MapPin className="size-5 text-[#D97706]" />
          <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">
            HOTSPOT CARDS ACTIVATE AFTER FIRST INGEST — RUN THE DEMO FEED OR SUBMIT A REPORT
          </p>
        </div>
      )}
    </div>
  );
}
