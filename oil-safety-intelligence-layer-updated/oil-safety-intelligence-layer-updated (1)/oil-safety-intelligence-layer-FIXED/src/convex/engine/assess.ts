/**
 * CORE ASSESSMENT PIPELINE — real-time triage (zero batch lag)
 * SIF classification · IOGP Life-Saving Rule tagging · failing-barrier
 * root cause analysis · precursor density via incident knowledge base.
 */

import { IOGP_RULES, IOGP_SHORT } from "./iogp";
import { BARRIERS, findBarrier } from "./barriers";
import { translateAndEnrich, matchIncidents, embeddingSimilarity } from "./language";
import { INCIDENT_KB } from "./incidents";
import type { SafetyAssessment, RiskLevel, SifLabel } from "./types";
import type { LlmAssistResult } from "./llm";

export interface AssessInput {
  narrative: string;
  asset: string;
  forceTranslate?: boolean;
  reportId?: string;
}

/** Hidden SIF precursor vocabulary — elevated risk even in low-severity reports. */
const SIF_PATTERNS: Array<{ pattern: RegExp; weight: number; note: string }> = [
  { pattern: /struck by|crush(ed)?|pinch(ed)?|run over|hit by/i, weight: 0.28, note: "struck-by / crush energy exposure" },
  { pattern: /fall(ed)? from|fell from|unanchored|no harness|harness (not|missing|skipped)|ladder (broke|slip)/i, weight: 0.3, note: "fall-from-height energy exposure" },
  { pattern: /bypass|disabled|gagged|defeated|interlock (off|bypass)|alarm (off|disabled|mute)/i, weight: 0.3, note: "safety control bypass" },
  { pattern: /no gas test|without gas test|gas test (not|skip)|oxygen (deficien|below)|h2s (smell|exposure|release)|toxic gas/i, weight: 0.32, note: "toxic / oxygen-deficient atmosphere" },
  { pattern: /inside (the )?tank|vessel entry|confined space|manhole entry/i, weight: 0.24, note: "confined space exposure" },
  { pattern: /live (line|wire|panel|electrical)|electric(al)? (shock|panel|equipment)|arc flash|current (pass|shock)|energized (panel|circuit|equipment|line)|\bcontactor\b|switchgear|\bbreaker\b|\d{2,3}\s?kv\b|\d{3}\s?v\b/i, weight: 0.28, note: "live/energized electrical exposure" },
  { pattern: /zero energy|isolation verification|lock ?out.?tag ?out/i, weight: 0.2, note: "isolation/zero-energy verification gap" },
  { pattern: /leak|leakage|release|blowout|burst|rupture|seepage|spill/i, weight: 0.18, note: "loss of containment" },
  { pattern: /hot work|welding|grinding|spark|flame (near|close)/i, weight: 0.2, note: "ignition source near hydrocarbon zone" },
  { pattern: /suspend(ed)? load|under load|swing(ing)? load|crane (swing|load)|load (fell|dropped)/i, weight: 0.26, note: "suspended load energy" },
  { pattern: /without permit|no permit|permit (not|skip)|no ptw|without isolation|not isolated|no loto|without loto/i, weight: 0.3, note: "permit / isolation violation" },
  { pattern: /pressure|overpressur|psv|relief valve|set pressure|psi|bar\b|kg\/cm/i, weight: 0.16, note: "pressurized system involvement" },
  { pattern: /near miss|nearmiss|close call|almost|narrowly/i, weight: 0.12, note: "near-miss precursor signal" },
  { pattern: /vehicle|driving|speed|reversing|tanker|truck/i, weight: 0.12, note: "vehicle movement exposure" },
  { pattern: /bleed|blood|injur|wound|fracture|burn|amputat|hospital|unconscious/i, weight: 0.22, note: "actual injury consequence present" },
  { pattern: /fatigue|night shift|overtime|16 hour|double shift/i, weight: 0.1, note: "human-factors fatigue indicator" },
];

function classifySif(text: string, hasEscalation: boolean): { label: SifLabel; confidence: number; risk: RiskLevel; reasoning: string; hits: string[] } {
  let score = 0;
  const hits: string[] = [];
  for (const { pattern, weight, note } of SIF_PATTERNS) {
    if (pattern.test(text)) {
      score += weight;
      hits.push(note);
    }
  }
  // Density of energy-source mentions pushes toward SIF potential
  const confidence = Math.max(0.18, Math.min(0.97, 0.18 + score));
  const label: SifLabel = confidence >= 0.5 || (hasEscalation && confidence >= 0.38) ? "SIF-POTENTIAL" : "NON-SIF";
  const risk: RiskLevel = confidence >= 0.78 ? "CRITICAL" : confidence >= 0.6 ? "HIGH" : confidence >= 0.4 ? "MEDIUM" : "LOW";
  const reasoning = hits.length
    ? `Precursor density ${hits.length}/15 SIF patterns matched: ${hits.slice(0, 4).join("; ")}.`
    : "No direct SIF energy-precursor vocabulary detected; treat as lower-severity observation but retain for trend analysis.";
  return { label, confidence: Number(confidence.toFixed(2)), risk, reasoning, hits };
}

function mapRules(text: string, ruleHits: Array<{ id: string; name: string; score: number }>) {
  if (ruleHits.length === 0) {
    return {
      primary: "Asset Integrity & Line of Containment",
      secondary: ["Permit to Work / Toolbox Talk"],
    };
  }
  const primary = ruleHits[0].name;
  const secondary = ruleHits.slice(1, 4).map((r) => r.name);
  if (secondary.length === 0) {
    secondary.push("Permit to Work / Toolbox Talk");
  }
  void text;
  return { primary, secondary };
}

function analyzeBarrier(text: string, primaryRule: string, kbMatches: ReturnType<typeof matchIncidents>) {
  const lower = text.toLowerCase();
  let best: { name: string; score: number } | null = null;
  for (const barrier of BARRIERS) {
    let score = 0;
    for (const kw of barrier.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { name: barrier.name, score };
  }
  const barrierName = best?.name ?? (primaryRule.includes("Well") ? "Primary Well Barrier Envelope" : "Process Containment (Piping / Flanges / Hoses)");
  const barrier = BARRIERS.find((b) => b.name === barrierName)!;

  // Root-cause reasoning: classify failure mode from narrative signals
  const systemic = /no |without |skip|not |never |missed|overdue|expired/i.test(text);
  const humanFactor = /forgot|rush|pressur|hurry|shortcut|avoid|ignore|assumed/i.test(text);
  const assetFactor = /corrosi|rust|thinning|crack|leak|old|aging|worn|defect/i.test(text);
  const envFactor = /rain|wind|fog|heat|flood|night|dark/i.test(text);

  const category: "Human Factor" | "System / Process" | "Asset Integrity" | "Environmental" = assetFactor
    ? "Asset Integrity"
    : systemic
      ? "System / Process"
      : humanFactor
        ? "Human Factor"
        : envFactor
          ? "Environmental"
          : "System / Process";

  const rootCause = systemic
    ? `${barrier.name} was not applied as designed — administrative controls (permit/isolation/verification steps) were skipped or overdue. Barrier degradation is systemic: supervision verified output, not barrier health. ${barrier.oisd} compliance verification required.`
    : assetFactor
      ? `${barrier.name} degraded through asset-integrity backlog — mechanical integrity monitoring failed to catch deterioration before exposure. Integrity verification interval for this equipment class must be re-baselined per ${barrier.oisd}.`
      : humanFactor
        ? `${barrier.name} was available but defeated by at-risk behaviour under production pressure — last-minute defence (verbal reminder / supervision) was the only active layer. Human-factor engineering and stop-work authority need reinforcement.`
        : `${barrier.name} performance was degraded by environmental / operational conditions exceeding design assumptions. Conditional barrier verification required before continuing similar operations.`;

  const topMatch = kbMatches[0];
  const precursorMatch = topMatch
    ? `${topMatch.record.title} (${topMatch.record.asset_region}, ${topMatch.record.date}) — precursor overlap: ${topMatch.record.precursors.slice(0, 3).join(", ")}`
    : "No direct knowledge-base precursor match";

  const precursorDensity = topMatch ? Number(Math.min(0.98, 0.35 + topMatch.similarity * 1.6).toFixed(2)) : 0.3;

  return {
    barrier_name: barrierName,
    root_cause: rootCause,
    root_cause_category: category,
    precursor_match: precursorMatch,
    precursor_density: precursorDensity,
    reference_incident: topMatch ? `${topMatch.record.id} · ${topMatch.record.title}` : "No archived analogue",
    oisd_reference: barrier.oisd,
    threat: barrier.threat,
    consequence: barrier.consequence,
  };
}

function recommend(text: string, rulePrimary: string, barrierName: string, category: string, risk: RiskLevel) {
  const lower = text.toLowerCase();
  const immediate: string[] = [];
  if (/without permit|no permit/.test(lower)) immediate.push("Stop work; reinstate valid PTW with gas test and joint site verification before resumption.");
  if (/without isolation|not isolated|no loto|without loto/.test(lower)) immediate.push("Apply full LOTO — isolate all energy sources, verify zero energy, and issue personal locks to each crew member.");
  if (/bypass|disabled|gagged/.test(lower)) immediate.push("Restore bypassed safety function to normal line-up; raise MOC for any justified override with time-bound revalidation.");
  if (/leak|release|blowout/.test(lower)) immediate.push("Isolate and depressurize the affected section; establish exclusion zone upwind and monitor atmosphere continuously.");
  if (/harness|height/.test(lower)) immediate.push("Suspend work at height; verify 100% tie-off to rated anchorage and inspect all harnesses and lifelines.");
  if (/crane|lift|load/.test(lower)) immediate.push("Pause lifting operation; validate lift plan against current wind/sea state and enforce exclusion zone outside swing radius.");
  if (immediate.length === 0) {
    immediate.push(`Brief crew on ${rulePrimary} requirements at next toolbox talk; verify barrier health checklist for ${barrierName}.`);
  }
  if (risk === "CRITICAL" || risk === "HIGH") {
    immediate.unshift("Escalate to Asset Manager and OISD-cell immediately; treat as Level-1 observation with supervisor on-site verification within 2 hours.");
  }

  const longTerm: string[] = [];
  if (category === "System / Process") {
    longTerm.push("Digitize barrier-verification workflow with automated overdue-flagging and supervisor sign-off audit trail.");
  } else if (category === "Asset Integrity") {
    longTerm.push("Commission integrity re-rating study (CML survey + RBI refresh) for affected circuits; feed results into next shutdown scope.");
  } else if (category === "Human Factor") {
    longTerm.push("Deploy behaviour-based safety coaching with peer-observation cycles; review workload and production-pressure drivers.");
  } else {
    longTerm.push("Reassess environmental operating limits in procedures; add condition-based stop-work triggers to work instructions.");
  }
  longTerm.push(`Add this narrative to the SIF-precursor training corpus for ${IOGP_SHORT[IOGP_RULES.find((r) => r.name === rulePrimary)?.id ?? "R9"]} and refresh quarterly barrier-health KPI.`);
  return { immediate_corrective_action: immediate.join(" "), long_term_fix: longTerm.join(" ") };
}

export function assessReport(input: AssessInput, llm?: LlmAssistResult): SafetyAssessment {
  const start = Date.now();
  const text = input.narrative.trim();
  const { translation, ruleHits } = translateAndEnrich(text);
  const kbMatches = matchIncidents(translation.translated_narrative);
  const hasEscalation = /fatality|death|died|explosion|blowout|major fire|amputat/i.test(text);
  const cls = classifySif(translation.translated_narrative, hasEscalation);
  const rules = mapRules(text, ruleHits);
  const barrier = analyzeBarrier(translation.translated_narrative, rules.primary, kbMatches);
  const recs = recommend(text, rules.primary, barrier.barrier_name, barrier.root_cause_category, cls.risk);

  const reportId = input.reportId ?? `SIR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // ---- LLM categorization (fully optional; the block above is always computed
  // first and is what actually runs when no key is configured, or when the
  // model's response is missing/invalid — this never blocks report submission) ----
  const llmUsed = !!llm?.used;
  const cat = llm?.categorization; // present only once every closed-vocabulary field validated cleanly

  let finalConfidence = cls.confidence;
  let finalLabel = cls.label;
  let finalRisk = cls.risk;
  let finalReasoning = cls.reasoning;

  if (llmUsed && llm?.sif_opinion) {
    // Average the two independent opinions, then err toward the more cautious
    // (higher-risk) label if they disagree — a safety system should never let
    // an LLM's optimism silently override the rule engine's caution, or vice versa.
    const blended = Number(((cls.confidence + llm.sif_opinion.confidence) / 2).toFixed(2));
    finalConfidence = blended;
    finalLabel = cls.label === "SIF-POTENTIAL" || llm.sif_opinion.label === "SIF-POTENTIAL" ? "SIF-POTENTIAL" : "NON-SIF";
    finalRisk = blended >= 0.78 ? "CRITICAL" : blended >= 0.6 ? "HIGH" : blended >= 0.4 ? "MEDIUM" : "LOW";
    finalReasoning = cat
      ? `AI narrative comprehension (${llm.model ?? "LLM"}): ${llm.sif_opinion.reasoning} · Rule-engine cross-check: ${cls.reasoning}`
      : `${cls.reasoning} · AI cross-check (${llm.model ?? "LLM"}): ${llm.sif_opinion.reasoning}`;
  }

  // IOGP rule mapping, failing-barrier analysis, root cause and recommendations:
  // when the model returned a validated categorization, use its comprehension
  // of the narrative's meaning directly instead of the keyword-matched rule
  // engine's answer. The keyword engine's answer above is kept as-is whenever
  // categorization is undefined (no key, call failed, or response invalid).
  const iogpPrimary = cat?.iogp_primary ?? rules.primary;
  const iogpSecondary = cat && cat.iogp_secondary.length > 0 ? cat.iogp_secondary : rules.secondary;
  const barrierName = cat?.barrier_name ?? barrier.barrier_name;
  const rootCause = cat?.root_cause ?? barrier.root_cause;
  const rootCauseCategory = cat?.root_cause_category ?? barrier.root_cause_category;
  const referenceRecord = cat?.reference_incident_id ? INCIDENT_KB.find((r) => r.id === cat.reference_incident_id) : undefined;
  const oisdReference = cat ? (findBarrier(barrierName)?.oisd ?? barrier.oisd_reference) : barrier.oisd_reference;
  const precursorMatch = cat
    ? referenceRecord
      ? `${referenceRecord.title} (${referenceRecord.asset_region}, ${referenceRecord.date}) — precursor overlap: ${referenceRecord.precursors.slice(0, 3).join(", ")}`
      : "No archived analogue judged meaningfully similar by the AI reviewer."
    : barrier.precursor_match;
  const precursorDensity = cat ? cat.precursor_density : barrier.precursor_density;
  const referenceIncident = cat
    ? referenceRecord
      ? `${referenceRecord.id} · ${referenceRecord.title}`
      : "No archived analogue"
    : barrier.reference_incident;
  const immediateAction = cat?.immediate_corrective_action ?? recs.immediate_corrective_action;
  const longTermFix = cat?.long_term_fix ?? recs.long_term_fix;

  const KNOWN_LANGS = ["Assamese", "Hindi", "Bengali", "English"] as const;
  const llmLangKnown = llm?.detected_language && (KNOWN_LANGS as readonly string[]).includes(llm.detected_language);
  const useLlmTranslation = llmUsed && !!llm?.translated_narrative && !!llmLangKnown;
  const analysisMode: "RULE_BASED" | "LLM_AUGMENTED" = llmUsed ? "LLM_AUGMENTED" : "RULE_BASED";
  const aiDisclosure = cat
    ? `SIF label, IOGP rule, failing barrier, root cause and recommendations were derived by ${llm?.model ?? "an LLM"} reading and interpreting the narrative's meaning (chosen only from this plant's fixed rule/barrier/incident vocabulary — never invented); the deterministic keyword rule engine ran alongside as a cross-check and safety net.`
    : llmUsed
      ? `Classified by a deterministic pattern-matching rule engine; an AI cross-check ran but its categorization could not be validated against the plant's fixed vocabulary, so the rule engine's answer was kept for every field.`
      : "Classified entirely by a deterministic pattern-matching rule engine (no external AI model was configured for this report).";

  return {
    report_metadata: {
      report_id: reportId,
      original_language: useLlmTranslation ? (llm!.detected_language as SafetyAssessment["report_metadata"]["original_language"]) : translation.original_language,
      original_text: text,
      translated_narrative: useLlmTranslation ? llm!.translated_narrative! : translation.translated_narrative,
      translated: useLlmTranslation ? llm!.detected_language !== "English" : translation.translated,
      translation_confidence: useLlmTranslation ? 0.95 : translation.translation_confidence,
      asset: input.asset,
      received_utc: new Date().toISOString(),
      triage_latency_ms: Date.now() - start + Math.round(embeddingSimilarity(text, "engine-startup-warmup") * 100),
      analysis_mode: analysisMode,
      ai_disclosure: aiDisclosure,
    },
    sif_classification: {
      label: finalLabel,
      confidence: finalConfidence,
      risk_level: finalRisk,
      reasoning: finalReasoning,
    },
    iogp_rule_mapping: {
      primary: iogpPrimary,
      secondary: iogpSecondary,
    },
    failing_barrier_analysis: {
      barrier_name: barrierName,
      root_cause: rootCause,
      root_cause_category: rootCauseCategory,
      precursor_match: precursorMatch,
      precursor_density: precursorDensity,
      reference_incident: referenceIncident,
      oisd_reference: oisdReference,
    },
    actionable_recommendations: [
      { immediate_corrective_action: immediateAction, long_term_fix: longTermFix },
    ],
  };
}
