import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { History, Skull, Clock, AlertTriangle } from "lucide-react";
import { HudPanel, Chip, riskColor } from "@/components/hud/hud";

interface ScenarioSummary {
  kbId: string;
  title: string;
  asset: string;
  days_before_disaster: number;
  date: string;
  severity: string;
  fatalities: number;
}

interface ReplayResult {
  scenario: { kbId: string; precursor_narrative: string; asset: string; days_before_disaster: number };
  incident: {
    id: string;
    title: string;
    asset_region: string;
    date: string;
    severity: string;
    fatalities: number;
    injuries: number;
    description: string;
    root_cause: string;
  };
  assessment: {
    sif_classification: { label: string; confidence: number; risk_level: string; reasoning: string };
    iogp_rule_mapping: { primary: string; secondary: string[] };
    failing_barrier_analysis: { barrier_name: string; root_cause: string; oisd_reference: string };
    report_metadata: { ai_disclosure: string; analysis_mode: string };
  };
}

export default function ReplayTab() {
  const scenarios = useQuery(api.safety.listReplayScenarios) as ScenarioSummary[] | undefined;
  const runReplay = useAction(api.safety.runReplay);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (kbId: string) => {
    setSelected(kbId);
    setBusy(true);
    setResult(null);
    try {
      setResult((await runReplay({ kbId })) as ReplayResult);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <HudPanel title="HISTORICAL INCIDENT REPLAY — WOULD THIS HAVE BEEN FLAGGED?" code="REPLAY-01" accent="#DC2626">
        <p className="font-head text-xs leading-relaxed text-[#475569]">
          Every archived disaster below has its own precursor chain on file in the permanent knowledge base. This
          replays that precursor pattern — phrased as a field report logged before the escalation, using only facts
          the archive already documents — through the same live triage pipeline used for real submissions. If the
          engine flags it CRITICAL or HIGH today, that is direct evidence this kind of tool could have surfaced the
          warning before the event, not just filed the postmortem after.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(scenarios ?? []).map((s) => (
            <button
              key={s.kbId}
              onClick={() => run(s.kbId)}
              disabled={busy}
              className={`rounded-lg border p-3.5 text-left transition disabled:opacity-50 ${
                selected === s.kbId ? "border-[#DC2626]/50 bg-[#DC2626]/10" : "border-[#2563EB]/12 bg-slate-50 hover:border-[#2563EB]/35"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">{s.kbId}</span>
                <Chip text={s.severity.toUpperCase()} color={s.severity === "Catastrophic" ? "#DC2626" : "#D97706"} />
              </div>
              <p className="font-head mt-2 text-sm font-bold text-foreground">{s.title}</p>
              <p className="font-data mt-1 text-[9px] tracking-wider text-[#64748B]">
                {s.asset.toUpperCase()} · {s.date}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 font-data text-[9px] tracking-wider text-[#D97706]">
                <Clock className="size-3" /> PRECURSOR PATTERN PRESENT {s.days_before_disaster} DAY{s.days_before_disaster === 1 ? "" : "S"} BEFORE
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 font-data text-[9px] tracking-wider text-[#DC2626]">
                <Skull className="size-3" /> {s.fatalities} FATALITIES (ACTUAL OUTCOME)
              </div>
            </button>
          ))}
        </div>
      </HudPanel>

      {busy && (
        <div className="flex items-center justify-center gap-3 py-14">
          <History className="size-6 animate-pulse text-[#DC2626]/60" />
          <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">REPLAYING PRECURSOR CHAIN THROUGH LIVE ENGINE…</p>
        </div>
      )}

      {result && !busy && (
        <>
          <HudPanel
            title={`FIELD REPORT AS IT COULD HAVE BEEN LOGGED — ${result.scenario.days_before_disaster} DAY${result.scenario.days_before_disaster === 1 ? "" : "S"} BEFORE`}
            code="REPLAY-02"
            accent="#D97706"
          >
            <p className="font-head text-sm leading-relaxed text-[#1E293B] italic">"{result.scenario.precursor_narrative}"</p>
          </HudPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <HudPanel title="ENGINE VERDICT — IF THIS HAD BEEN SUBMITTED THEN" code="REPLAY-03" accent={riskColor(result.assessment.sif_classification.risk_level)}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-6 shrink-0" style={{ color: riskColor(result.assessment.sif_classification.risk_level) }} />
                <div>
                  <p className="font-display text-lg font-bold" style={{ color: riskColor(result.assessment.sif_classification.risk_level) }}>
                    {result.assessment.sif_classification.label} · {result.assessment.sif_classification.risk_level}
                  </p>
                  <p className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">
                    CONFIDENCE {(result.assessment.sif_classification.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <p className="font-head mt-3 text-xs leading-relaxed text-[#475569]">{result.assessment.sif_classification.reasoning}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip text={result.assessment.iogp_rule_mapping.primary} color="#2563EB" />
                <Chip text={result.assessment.failing_barrier_analysis.barrier_name} color="#D97706" />
                <Chip text={result.assessment.report_metadata.analysis_mode} color="#16A34A" />
              </div>
              <p className="font-data mt-3 text-[9px] leading-relaxed text-[#64748B]">{result.assessment.report_metadata.ai_disclosure}</p>
            </HudPanel>

            <HudPanel title="WHAT ACTUALLY HAPPENED" code="REPLAY-04" accent="#DC2626">
              <p className="font-head text-sm font-bold text-foreground">{result.incident.title}</p>
              <p className="font-data mt-1 text-[9px] tracking-wider text-[#64748B]">
                {result.incident.asset_region.toUpperCase()} · {result.incident.date} · {result.incident.severity.toUpperCase()}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded border border-[#DC2626]/15 bg-slate-50 p-2.5 text-center">
                  <p className="font-data text-[9px] tracking-[0.2em] text-[#DC2626]">FATALITIES</p>
                  <p className="font-display mt-1 text-xl font-bold text-[#DC2626]">{result.incident.fatalities}</p>
                </div>
                <div className="rounded border border-[#D97706]/15 bg-slate-50 p-2.5 text-center">
                  <p className="font-data text-[9px] tracking-[0.2em] text-[#D97706]">INJURIES / DISPLACED</p>
                  <p className="font-display mt-1 text-xl font-bold text-[#D97706]">{result.incident.injuries}</p>
                </div>
              </div>
              <p className="font-head mt-3 text-xs leading-relaxed text-[#475569]">{result.incident.description}</p>
              <p className="font-head mt-2 text-xs leading-relaxed text-[#D97706]/90">
                <span className="font-data text-[9px] tracking-[0.2em] text-[#D97706]">ARCHIVED ROOT CAUSE: </span>
                {result.incident.root_cause}
              </p>
            </HudPanel>
          </div>
        </>
      )}
    </div>
  );
}
