import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, XCircle, MinusCircle, FlaskConical } from "lucide-react";
import { HudPanel, GlowBar, Chip, MetricCard } from "@/components/hud/hud";

interface EvalCaseResult {
  id: string;
  label: string;
  expected_sif: string;
  predicted_sif: string;
  sif_correct: boolean;
  expected_iogp_primary?: string;
  predicted_iogp_primary: string;
  iogp_correct: boolean | null;
  expected_barrier?: string;
  predicted_barrier: string;
  barrier_correct: boolean | null;
}

interface EvalReport {
  total: number;
  sif_accuracy: number;
  sif_true_positive: number;
  sif_false_positive: number;
  sif_true_negative: number;
  sif_false_negative: number;
  sif_precision: number;
  sif_recall: number;
  sif_f1: number;
  iogp_scored: number;
  iogp_accuracy: number;
  barrier_scored: number;
  barrier_accuracy: number;
  cases: EvalCaseResult[];
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function EvalTab() {
  const report = useQuery(api.safety.runEvaluation) as EvalReport | undefined;

  return (
    <div className="space-y-5">
      <HudPanel title="ENGINE EVALUATION — HAND-LABELED BENCHMARK" code="EVAL-01" accent="#16A34A">
        <p className="font-head text-xs leading-relaxed text-[#475569]">
          A domain-expert-labeled benchmark, scored against the live deterministic rule engine on every load — no
          network call, no API key required. This is a model-card, not a marketing claim: misses are shown, not
          hidden, including one deliberately-kept case that demonstrates a real limitation of substring matching (see
          the case list below).
        </p>
      </HudPanel>

      {!report && (
        <div className="flex items-center justify-center gap-3 py-14">
          <FlaskConical className="size-6 animate-pulse text-[#16A34A]/50" />
          <p className="font-data text-[10px] tracking-[0.25em] text-[#64748B]">RUNNING BENCHMARK…</p>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="SIF ACCURACY" value={pct(report.sif_accuracy)} sub={`${report.total} labeled cases`} accent="#16A34A" />
            <MetricCard label="SIF RECALL" value={pct(report.sif_recall)} sub="missed SIF-potential costs more than a false alarm" accent="#DC2626" />
            <MetricCard label="SIF PRECISION" value={pct(report.sif_precision)} sub={`F1 ${report.sif_f1.toFixed(2)}`} accent="#2563EB" />
            <MetricCard
              label="IOGP / BARRIER MATCH"
              value={`${pct(report.iogp_accuracy)} / ${pct(report.barrier_accuracy)}`}
              sub={`${report.iogp_scored} unambiguous cases scored`}
              accent="#D97706"
            />
          </div>

          <HudPanel title="SIF CONFUSION MATRIX" code="EVAL-02" accent="#2563EB">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-[#16A34A]/20 bg-[#16A34A]/5 p-3 text-center">
                <p className="font-data text-[9px] tracking-[0.2em] text-[#16A34A]">TRUE POSITIVE</p>
                <p className="font-display mt-1 text-xl font-bold text-[#16A34A]">{report.sif_true_positive}</p>
              </div>
              <div className="rounded-lg border border-[#DC2626]/20 bg-[#DC2626]/5 p-3 text-center">
                <p className="font-data text-[9px] tracking-[0.2em] text-[#DC2626]">FALSE NEGATIVE</p>
                <p className="font-display mt-1 text-xl font-bold text-[#DC2626]">{report.sif_false_negative}</p>
              </div>
              <div className="rounded-lg border border-[#D97706]/20 bg-[#D97706]/5 p-3 text-center">
                <p className="font-data text-[9px] tracking-[0.2em] text-[#D97706]">FALSE POSITIVE</p>
                <p className="font-display mt-1 text-xl font-bold text-[#D97706]">{report.sif_false_positive}</p>
              </div>
              <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-3 text-center">
                <p className="font-data text-[9px] tracking-[0.2em] text-[#2563EB]">TRUE NEGATIVE</p>
                <p className="font-display mt-1 text-xl font-bold text-[#2563EB]">{report.sif_true_negative}</p>
              </div>
            </div>
            <p className="font-data mt-3 text-[9px] leading-relaxed tracking-wide text-[#64748B]">
              A false negative (a real SIF precursor labeled NON-SIF) is the failure mode this system is most careful
              about — it is why recall is tracked separately from raw accuracy.
            </p>
          </HudPanel>

          <HudPanel title="CASE-BY-CASE RESULTS" code="EVAL-03" accent="#D97706" action={<Chip text={`${report.cases.filter((c) => c.sif_correct).length}/${report.total} SIF CORRECT`} color="#16A34A" />}>
            <div className="hud-scroll max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {report.cases.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 ${c.sif_correct ? "border-[#2563EB]/12 bg-slate-50" : "border-[#DC2626]/30 bg-[#DC2626]/5"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {c.sif_correct ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-[#16A34A]" />
                    ) : (
                      <XCircle className="size-3.5 shrink-0 text-[#DC2626]" />
                    )}
                    <span className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">{c.id}</span>
                    <p className="font-head text-xs font-semibold text-foreground/90">{c.label}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-5">
                    <Chip text={`SIF expected ${c.expected_sif}`} color="#475569" />
                    <Chip text={`got ${c.predicted_sif}`} color={c.sif_correct ? "#16A34A" : "#DC2626"} solid={!c.sif_correct} />
                    {c.expected_iogp_primary && (
                      <>
                        {c.iogp_correct ? (
                          <CheckCircle2 className="size-3 text-[#16A34A]" />
                        ) : (
                          <MinusCircle className="size-3 text-[#D97706]" />
                        )}
                        <span className="font-data text-[9px] tracking-wider text-[#64748B]">
                          IOGP: {c.predicted_iogp_primary}
                        </span>
                      </>
                    )}
                    {c.expected_barrier && (
                      <>
                        {c.barrier_correct ? (
                          <CheckCircle2 className="size-3 text-[#16A34A]" />
                        ) : (
                          <MinusCircle className="size-3 text-[#D97706]" />
                        )}
                        <span className="font-data text-[9px] tracking-wider text-[#64748B]">
                          Barrier: {c.predicted_barrier}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </HudPanel>

          <HudPanel title="ACCURACY BREAKDOWN" code="EVAL-04" accent="#16A34A">
            <div className="space-y-3">
              {[
                { label: "SIF LABEL ACCURACY", pct: report.sif_accuracy, color: "#16A34A" },
                { label: "SIF RECALL", pct: report.sif_recall, color: "#DC2626" },
                { label: "SIF PRECISION", pct: report.sif_precision, color: "#2563EB" },
                { label: "IOGP PRIMARY RULE MATCH (unambiguous cases only)", pct: report.iogp_accuracy, color: "#D97706" },
                { label: "FAILING BARRIER MATCH (unambiguous cases only)", pct: report.barrier_accuracy, color: "#475569" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-data text-[10px] tracking-[0.15em] text-[#475569]">{row.label}</span>
                    <span className="font-data text-[10px]" style={{ color: row.color }}>
                      {pct(row.pct)}
                    </span>
                  </div>
                  <GlowBar pct={row.pct * 100} color={row.color} height={6} />
                </div>
              ))}
            </div>
          </HudPanel>
        </>
      )}
    </div>
  );
}
