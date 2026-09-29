import { describe, expect, it } from "vitest";
import { assessReport } from "../src/convex/engine/assess";
import { assessNarrativeQuality } from "../src/convex/engine/quality";
import { translateNarrative } from "../src/convex/engine/language";
import { evaluateEngine, EVAL_SET } from "../src/convex/engine/eval";
import { replayIncident, listReplayScenarios, REPLAY_SCENARIOS } from "../src/convex/engine/replay";

describe("engine/assess — deterministic rule engine (no LLM)", () => {
  it("classifies a clear LOTO / electrical-isolation violation as SIF-POTENTIAL", () => {
    const result = assessReport({
      narrative:
        "Fitter opened 415V electrical panel without LOTO isolation to replace contactor. No zero energy verification, residual hydrocarbon transfer line not depressurized.",
      asset: "Duliajan",
    });
    expect(result.sif_classification.label).toBe("SIF-POTENTIAL");
    expect(result.sif_classification.confidence).toBeGreaterThan(0);
    expect(["CRITICAL", "HIGH"]).toContain(result.sif_classification.risk_level);
  });

  it("discloses RULE_BASED mode honestly when no LLM result is passed", () => {
    const result = assessReport({ narrative: "Housekeeping walkdown completed, no issues noted on the shift.", asset: "Digboi" });
    expect(result.report_metadata.analysis_mode).toBe("RULE_BASED");
    expect(result.report_metadata.ai_disclosure.toLowerCase()).not.toContain("sentence-transformers");
  });

  it("is deterministic — same input always produces the same classification", () => {
    const input = {
      narrative: "Crane slew started while rigger stood inside swing radius guiding suspended load. Tagline not used.",
      asset: "Moran",
    };
    const a = assessReport(input);
    const b = assessReport(input);
    expect(a.sif_classification.label).toBe(b.sif_classification.label);
    expect(a.sif_classification.risk_level).toBe(b.sif_classification.risk_level);
    expect(a.iogp_rule_mapping.primary).toBe(b.iogp_rule_mapping.primary);
  });

  it("blends an LLM cross-check when provided, and prefers the more cautious label on disagreement", () => {
    const withLlm = assessReport(
      { narrative: "Routine valve inspection completed per checklist, all readings nominal.", asset: "Baghjan" },
      {
        used: true,
        model: "test-model",
        sif_opinion: { label: "SIF-POTENTIAL", confidence: 0.7, reasoning: "Test-forced escalation." },
      }
    );
    expect(withLlm.sif_classification.label).toBe("SIF-POTENTIAL");
    expect(withLlm.report_metadata.analysis_mode).toBe("LLM_AUGMENTED");
    expect(withLlm.sif_classification.reasoning).toContain("test-model");
  });
});

describe("engine/language — glossary translation", () => {
  it("matches a multi-word Hindi phrase as a unit instead of letting a shorter substring corrupt it", () => {
    // "बिना परमिट" ("without permit") must be matched whole — a naive
    // declaration-order glossary walk previously let a shorter entry
    // partially consume it first, leaving mixed-script garbage behind.
    const result = translateNarrative("टंकी के अंदर प्रवेश बिना परमिट के किया गया।");
    expect(result.translated_narrative).toContain("without permit");
  });

  it("reports low confidence (not a misleadingly flat floor) when most of the narrative stays untranslated", () => {
    const heavilyUntranslated = translateNarrative("অজানা শব্দ অজানা শব্দ অজানা শব্দ কোন গ্লসারি নেই");
    expect(heavilyUntranslated.translation_confidence).toBeLessThan(0.4);
  });

  it("returns English input unchanged with full confidence", () => {
    const result = translateNarrative("Routine inspection completed, no issues found.");
    expect(result.translated).toBe(false);
    expect(result.translation_confidence).toBe(1);
  });
});

describe("engine/quality — narrative garbage guard", () => {
  it("rejects empty input", () => {
    expect(assessNarrativeQuality("").garbage).toBe(true);
  });

  it("rejects keyboard-mashing / low word-diversity spam", () => {
    expect(assessNarrativeQuality("asdf asdf asdf asdf asdf asdf asdf asdf").garbage).toBe(true);
  });

  it("rejects long repeated-character runs", () => {
    expect(assessNarrativeQuality("everything fine aaaaaaaaaaaaaaaaaaaa nothing to report here").garbage).toBe(true);
  });

  it("rejects mostly-symbol input", () => {
    expect(assessNarrativeQuality("!!!! ???? #### $$$$ %%%% ^^^^ &&&& ****").garbage).toBe(true);
  });

  it("accepts a real, detailed safety narrative", () => {
    const result = assessNarrativeQuality(
      "During the night shift, the crew bypassed the gas detector interlock on the compressor skid to keep production running after a false alarm."
    );
    expect(result.garbage).toBe(false);
  });
});

describe("engine/eval — benchmark accuracy (regression guard)", () => {
  it("scores at least 80% SIF accuracy on the hand-labeled benchmark", () => {
    const report = evaluateEngine();
    // Printed so `npm test` output itself is a citable accuracy figure —
    // not just an assertion that passes silently.
    console.log(
      `[SIF] accuracy=${report.sif_accuracy} precision=${report.sif_precision} recall=${report.sif_recall} f1=${report.sif_f1} ` +
        `(tp=${report.sif_true_positive} fp=${report.sif_false_positive} tn=${report.sif_true_negative} fn=${report.sif_false_negative})`
    );
    console.log(`[IOGP rule] accuracy=${report.iogp_accuracy} over ${report.iogp_scored} scored cases`);
    console.log(`[Barrier] accuracy=${report.barrier_accuracy} over ${report.barrier_scored} scored cases`);
    for (const c of report.cases.filter((c) => !c.sif_correct || c.iogp_correct === false || c.barrier_correct === false)) {
      console.log(`  MISS ${c.id} "${c.label}": expected sif=${c.expected_sif} iogp=${c.expected_iogp_primary ?? "—"} barrier=${c.expected_barrier ?? "—"}` +
        ` | got sif=${c.predicted_sif} iogp=${c.predicted_iogp_primary} barrier=${c.predicted_barrier}`);
    }
    expect(report.total).toBe(EVAL_SET.length);
    expect(report.sif_accuracy).toBeGreaterThanOrEqual(0.8);
  });

  it("keeps SIF recall high — a missed SIF-potential is worse than a false alarm in a safety system", () => {
    const report = evaluateEngine();
    expect(report.sif_recall).toBeGreaterThanOrEqual(0.8);
  });
});

describe("engine/replay — historical disaster precursor replay", () => {
  it("flags every archived disaster's own precursor chain as SIF-POTENTIAL", () => {
    for (const scenario of REPLAY_SCENARIOS) {
      const result = replayIncident(scenario.kbId);
      expect(result).not.toBeNull();
      expect(result!.assessment.sif_classification.label).toBe("SIF-POTENTIAL");
      expect(["CRITICAL", "HIGH"]).toContain(result!.assessment.sif_classification.risk_level);
    }
  });

  it("lists the same scenarios exposed to the dashboard", () => {
    const listed = listReplayScenarios();
    expect(listed.length).toBe(REPLAY_SCENARIOS.length);
    for (const s of listed) {
      expect(s.title.length).toBeGreaterThan(0);
    }
  });
});
