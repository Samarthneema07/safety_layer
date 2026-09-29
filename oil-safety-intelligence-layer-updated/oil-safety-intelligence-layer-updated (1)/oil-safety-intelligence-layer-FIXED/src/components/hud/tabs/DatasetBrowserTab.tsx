import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Search, Database, Skull, Users } from "lucide-react";
import { HudPanel, GlowBar, Chip } from "@/components/hud/hud";

interface KbHit {
  id: string;
  title: string;
  asset_region: string;
  date: string;
  type: string;
  severity: string;
  fatalities: number;
  injuries: number;
  iogp_rule: string;
  failing_barrier: string;
  precursors: string[];
  root_cause: string;
  description: string;
  operator_company?: string;
  corrective_action?: string;
  regulatory_ref?: string;
  similarity: number;
}

const SEVERITY_COLOR: Record<string, string> = {
  Catastrophic: "#DC2626",
  Major: "#D97706",
  Serious: "#D97706",
  Moderate: "#2563EB",
};

export default function DatasetBrowserTab() {
  const kbSeeded = useQuery(api.safety.listKbIncidents);
  const searchAction = useAction(api.safety.searchKb);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<KbHit[] | null>(null);
  const [busy, setBusy] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      setHits((await searchAction({ text: query })) as KbHit[]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <HudPanel title="SEMANTIC SEARCH — INDIAN O&G INCIDENT KNOWLEDGE BASE" code="KB-SEARCH-01" accent="#16A34A">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Query the corpus — e.g. 'well control kick during workover', 'H2S pigging detector calibration'…"
            className="font-head flex-1 rounded-lg border border-[#16A34A]/25 bg-white px-4 py-2.5 text-sm text-[#1E293B] outline-none placeholder:text-[#64748B] focus:border-[#16A34A]/60 focus:shadow-[0_0_18px_rgba(22,163,74,0.12)]"
          />
          <button
            onClick={runSearch}
            disabled={busy || !query.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 font-head text-sm font-bold tracking-wider text-[#FFFFFF] transition hover:bg-[#16A34A]/85 disabled:opacity-40"
          >
            <Search className="size-4" /> {busy ? "EMBEDDING…" : "MATCH PRECURSORS"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip text="BAGHJAN 2020" color="#DC2626" />
          <Chip text="DIGBOI 2019" color="#D97706" />
          <Chip text="ONGC URAN 2015" color="#DC2626" />
          <Chip text="LEGACY OIL EVENTS" color="#16A34A" />
          <span className="font-data ml-auto text-[9px] tracking-[0.2em] text-[#64748B]">
            {hits ? `TOP ${hits.length} SIMILARITY MATCHES` : "COSINE SIMILARITY · 384-D SPACE"}
          </span>
        </div>
      </HudPanel>

      {/* Search results */}
      {hits && (
        <HudPanel title="PRECURSOR MATCH RESULTS" code="KB-HITS-02" accent="#DC2626">
          <div className="space-y-3">
            {hits.map((h) => {
              const color = SEVERITY_COLOR[h.severity] ?? "#2563EB";
              return (
                <div key={h.id} className="rounded-lg border border-[#2563EB]/12 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-data rounded border border-[#2563EB]/25 px-1.5 py-0.5 text-[9px] text-[#2563EB]">{h.id}</span>
                      <p className="font-head text-sm font-bold text-foreground">{h.title}</p>
                    </div>
                    <Chip text={`${(h.similarity * 100).toFixed(1)}% SIMILARITY`} color={h.similarity > 0.15 ? "#16A34A" : "#64748B"} solid={h.similarity > 0.15} />
                  </div>
                  <p className="font-data mt-1.5 text-[9px] tracking-wider text-[#64748B]">
                    {h.asset_region.toUpperCase()} · {h.date} · {h.type.toUpperCase()} ·{" "}
                    <span style={{ color }}>
                      {h.severity.toUpperCase()}
                    </span>
                  </p>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <div className="rounded border border-[#DC2626]/15 bg-slate-50 p-2.5">
                      <p className="font-data flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-[#DC2626]">
                        <Skull className="size-3" /> FATALITIES / INJURIES
                      </p>
                      <p className="font-data mt-1 text-sm text-foreground">
                        {h.fatalities} / {h.injuries > 999 ? `${(h.injuries / 1000).toFixed(1)}k (displaced)` : h.injuries}
                      </p>
                    </div>
                    <div className="rounded border border-[#D97706]/15 bg-slate-50 p-2.5">
                      <p className="font-data flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-[#D97706]">
                        <Users className="size-3" /> IOGP / BARRIER
                      </p>
                      <p className="font-head mt-1 truncate text-xs text-[#1E293B]">
                        {h.iogp_rule} · {h.failing_barrier}
                      </p>
                    </div>
                  </div>
                  <p className="font-head mt-2.5 text-xs leading-relaxed text-[#475569]">{h.description}</p>
                  <p className="font-head mt-1.5 text-xs leading-relaxed text-[#D97706]/90">
                    <span className="font-data text-[9px] tracking-[0.2em] text-[#D97706]">ROOT CAUSE: </span>
                    {h.root_cause}
                  </p>
                  {h.corrective_action && (
                    <p className="font-head mt-1.5 text-xs leading-relaxed text-[#16A34A]/90">
                      <span className="font-data text-[9px] tracking-[0.2em] text-[#16A34A]">CORRECTIVE ACTION: </span>
                      {h.corrective_action}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {h.operator_company && <Chip text={h.operator_company.toUpperCase()} color="#2563EB" />}
                    {h.precursors.map((p) => (
                      <Chip key={p} text={p.toUpperCase()} color="#DC2626" />
                    ))}
                  </div>
                  <div className="mt-3">
                    <GlowBar pct={Math.min(100, h.similarity * 400)} color="#16A34A" height={4} />
                  </div>
                </div>
              );
            })}
          </div>
        </HudPanel>
      )}

      {/* Permanent corpus listing */}
      <HudPanel
        title="PERMANENT CORPUS — ARCHIVED INDIAN HSSE DATASET"
        code="KB-CORPUS-03"
        accent="#2563EB"
        action={<Chip text={`${kbSeeded?.length ?? 0} RECORDS`} color="#16A34A" />}
      >
        <div className="hud-scroll grid max-h-[560px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
          {(kbSeeded ?? []).map((k) => {
            const color = SEVERITY_COLOR[k.severity] ?? "#2563EB";
            return (
              <div key={k._id} className="rounded-lg border border-[#2563EB]/12 bg-slate-50 p-4 transition hover:border-[#2563EB]/35">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-head text-sm font-bold text-foreground">{k.title}</p>
                  <span className="font-data shrink-0 text-[9px]" style={{ color }}>
                    {k.severity.toUpperCase()}
                  </span>
                </div>
                <p className="font-data mt-1 text-[9px] tracking-wider text-[#64748B]">
                  {k.kbId} · {k.assetRegion.toUpperCase()} · {k.date} · {k.type.toUpperCase()}
                  {k.operatorCompany ? ` · ${k.operatorCompany.toUpperCase()}` : ""}
                </p>
                <p className="font-head mt-2 line-clamp-2 text-xs text-[#475569]">{k.description}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Chip text={k.iogpRule} color="#2563EB" />
                  <Chip text={`${k.fatalities} FAT`} color={k.fatalities > 0 ? "#DC2626" : "#94A3B8"} />
                  <Chip text={`OISD-REF ${k.failingBarrier.split(" ")[0].toUpperCase()}`} color="#D97706" />
                  {k.sector && <Chip text={k.sector.toUpperCase()} color="#475569" />}
                </div>
              </div>
            );
          })}
        </div>
        {(!kbSeeded || kbSeeded.length === 0) && (
          <div className="flex items-center justify-center gap-3 py-10">
            <Database className="size-6 text-[#2563EB]/40" />
            <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">SYNCHRONIZING PERMANENT CORPUS…</p>
          </div>
        )}
      </HudPanel>
    </div>
  );
}
