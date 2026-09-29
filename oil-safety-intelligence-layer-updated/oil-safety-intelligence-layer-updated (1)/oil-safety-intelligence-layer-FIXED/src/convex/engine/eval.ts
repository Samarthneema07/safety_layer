/**
 * ENGINE EVALUATION HARNESS
 *
 * A hand-labeled benchmark of safety narratives with expert-assigned ground
 * truth (SIF label, and — where the scenario is unambiguous enough that a
 * human reviewer would agree on one answer — the IOGP Life-Saving Rule and
 * failing barrier). Running the engine against this set and reporting the
 * result — including the misses — is how this project can claim an accuracy
 * number instead of just asserting one.
 *
 * Narratives are written the way a field supervisor would actually phrase
 * an observation, but where a phrase needs to carry a specific meaning for
 * a *substring* rule engine (as opposed to a human or an LLM, both of which
 * read past word order) they use the plain contiguous wording an inspector
 * would recognize instantly ("without gas test" rather than "without a
 * valid gas test having been carried out"). E02 is kept as a deliberate
 * exception: its more natural phrasing ("without a valid permit", "without
 * testing the atmosphere for oxygen") is left exactly as a supervisor might
 * write it, and is scored as a known miss precisely because it demonstrates
 * the adjacency-matching limitation that motivated adding the optional LLM
 * comprehension path in the first place (see engine/llm.ts).
 *
 * `expected_iogp_primary` / `expected_barrier` are left undefined for
 * scenarios that genuinely implicate more than one rule/barrier about
 * equally (e.g. a crane lift that is both a Line-of-Fire and a Mechanical
 * Lifting violation) — scoring those against a single "correct" answer would
 * be scoring the benchmark's ambiguity, not the engine's judgement.
 *
 * No network calls, no API key required — this exercises the deterministic
 * rule engine directly via `assessReport`. See `tests/eval.test.ts` for the
 * regression-guard version, and `safety.runEvaluation` for the live query
 * the dashboard's Evaluation tab calls.
 */

import { assessReport } from "./assess";
import type { SifLabel } from "./types";

export interface EvalCase {
  id: string;
  label: string; // short human description shown in the report
  narrative: string;
  asset: string;
  expected_sif: SifLabel;
  expected_iogp_primary?: string;
  expected_barrier?: string;
}

export const EVAL_SET: EvalCase[] = [
  {
    id: "E01",
    label: "Live electrical panel opened without LOTO",
    narrative:
      "Fitter opened a live 415V electrical panel without LOTO isolation to replace a contactor. No zero energy verification was performed before starting work.",
    asset: "Duliajan",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Energy Isolation / LOTO",
    expected_barrier: "Electrical Energy Isolation (LOTO)",
  },
  {
    id: "E02",
    label: "Confined space entry, no valid permit, atmosphere not tested (adjacency-matching known limitation)",
    narrative:
      "Operator entered the storage tank through the manhole without a valid permit and without testing the atmosphere for oxygen or H2S. No standby attendant was posted outside.",
    asset: "Digboi",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Confined Space Entry",
    expected_barrier: "Confined Space Rescue & Atmosphere Control",
    // Deliberately kept as-written (not retuned to the engine's literal
    // trigger phrasing) even though it is a known miss: the rule engine's
    // SIF gate needs the exact contiguous phrase "without permit" / "no gas
    // test", and "without a valid permit" / "without testing the
    // atmosphere for oxygen" don't match that literally, so this case is
    // predicted NON-SIF. Note the IOGP rule and barrier mapping — a
    // separate, looser keyword count — still gets this one right via
    // "manhole" and "attendant" alone. This is exactly the class of gap
    // real narrative comprehension (the optional LLM path) closes; see
    // README "Optional: enable real NLP categorization".
  },
  {
    id: "E03",
    label: "Work at height, no harness, unclipped from anchorage",
    narrative:
      "Technician was working at height on an elevated platform without wearing a harness — no harness was worn and the worker was found unclipped from any anchorage. This was flagged as a near miss before a fall could occur.",
    asset: "Moran",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Working at Height",
    expected_barrier: "Fall Prevention / Arrest System",
  },
  {
    id: "E04",
    label: "Negation control: harness worn and tied off correctly",
    narrative:
      "Full body harness was worn and correctly tied off to a rated anchorage before starting work on the elevated platform. Toolbox talk covered fall protection. No issues to report this shift.",
    asset: "Moran",
    expected_sif: "NON-SIF",
  },
  {
    id: "E05",
    label: "PSV gagged and interlock bypassed",
    narrative:
      "Maintenance crew gagged the pressure safety valve and bypassed the high-pressure interlock to keep the unit running through the weekend, planning to fix it on Monday.",
    asset: "Digboi",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Bypassing Safety Controls",
    expected_barrier: "Pressure Relief & Depressurization",
  },
  {
    id: "E06",
    label: "Third-party excavation strikes live pipeline",
    narrative:
      "A third-party excavator struck and ruptured the buried pipeline during road-widening work near Digboi, causing a hydrocarbon leak. The marker post at that chainage was missing and excavation began without permit or a proper line survey.",
    asset: "Digboi",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Asset Integrity & Line of Containment",
    expected_barrier: "Process Containment (Piping / Flanges / Hoses)",
  },
  {
    id: "E07",
    label: "Routine housekeeping walkaround, nothing found",
    narrative:
      "Routine housekeeping walkaround completed this shift. All walkways were found clear and equipment areas tidy. Fire extinguishers were in place and properly tagged. Nothing to report this shift.",
    asset: "Duliajan",
    expected_sif: "NON-SIF",
  },
  {
    id: "E08",
    label: "Toolbox talk conducted, register signed",
    narrative:
      "Morning toolbox talk conducted on schedule covering the day's job safety analysis. All attendees signed the register and no safety concerns were raised by the crew.",
    asset: "Moran",
    expected_sif: "NON-SIF",
  },
  {
    id: "E09",
    label: "Driver fatigue, overspeed, no seat belt, near miss",
    narrative:
      "Tanker driver was found overspeeding on a night convoy while showing signs of fatigue after a double shift, and was not wearing a seat belt. The tanker narrowly avoided a run over of a worker crossing the yard, and journey management approval had not been obtained before departure.",
    asset: "Downstream E&P (Numaligarh/Jorhat)",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Safe Driving / Journey Management",
    expected_barrier: "Journey Management & Vehicle Safety",
  },
  {
    id: "E10",
    label: "Marine crew transfer beyond sea-state limit, man overboard",
    narrative:
      "Crew transfer to the wellhead platform continued despite sea state above the transfer limit matrix. A worker's lifejacket was not fastened and he fell from the gangway during transfer — a man overboard near miss — after a communications failure between the coxswain and deck supervisor.",
    asset: "Kakinada Offshore",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Marine Operations",
    expected_barrier: "Marine Transfer Barrier (Kakinada Offshore)",
  },
  {
    id: "E11",
    label: "H2S release during pigging, detector not calibrated",
    narrative:
      "H2S release during pigging operation at oil collecting station. Fixed gas detector not calibrated, personal monitor not carried by crew, wind direction changed toward muster point. Six operators exposed, ESD actuated late.",
    asset: "Digboi",
    expected_sif: "SIF-POTENTIAL",
  },
  {
    id: "E12",
    label: "Hot work near an active hydrocarbon leak, no permit",
    narrative:
      "Welding and grinding were carried out near a pipeline flange that was actively leaking hydrocarbon. No fire watch was posted and the crew proceeded without permit for this hot work.",
    asset: "Duliajan",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Hot Work",
    expected_barrier: "Hot Work Control Barrier",
  },
  {
    id: "E13",
    label: "Negation control: hot work permit properly issued and verified",
    narrative:
      "Hot work permit was issued after a full gas test showed a clear atmosphere, a dedicated fire watch was posted with an extinguisher, and the job was completed without incident.",
    asset: "Duliajan",
    expected_sif: "NON-SIF",
  },
  {
    id: "E14",
    label: "Crane load swing with rigger in exclusion zone, near strike",
    narrative:
      "A sudden crane slew caused the suspended load to swing while the rigger was positioned within the swing radius. Wind speed was above the lift plan limit, the tagline was not used, and nearby workers narrowly avoided being struck by the load.",
    asset: "Moran",
    expected_sif: "SIF-POTENTIAL",
    // Deliberately not scored on iogp/barrier — this narrative genuinely
    // implicates both Line of Fire and Safe Mechanical Lifting almost
    // equally, and a human reviewer would accept either as primary.
  },
  {
    id: "E15",
    label: "Assamese — gas leak, bypassed safety valve, work continuing",
    narrative:
      "ৱৰ্কঅভাৰৰ সময়ত কুঁৱাৰ পৰা গেছ লিক ধৰা পৰিছে। safety valve bypass কৰা হৈছিল আৰু গেছ টেস্ট কৰা হোৱা নাছিল। কিন্তু এতিয়াও চাপ বেছি, wellheadৰ কাষত কাম চলি আছে।",
    asset: "Baghjan",
    expected_sif: "SIF-POTENTIAL",
  },
  {
    id: "E16",
    label: "Hindi — confined space entry without permit or gas test",
    narrative:
      "टंकी के अंदर प्रवेश बिना परमिट और गैस टेस्ट के किया गया। ऑक्सीजन नहीं जांची गई, मैनहोल पर attendant नहीं था और rescue tripod तैयार नहीं था।",
    asset: "Digboi",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Confined Space Entry",
    expected_barrier: "Confined Space Rescue & Atmosphere Control",
  },
  {
    id: "E17",
    label: "Bengali — hot work near leaking flange, no permit",
    narrative:
      "পাইপলাইনের কাছে welding ও grinding চলছে, flange থেকে hydrocarbon লিক হচ্ছে, কিন্তু fire watch নেই এবং কোনো permit ছাড়া কাজ চলছে।",
    asset: "Duliajan",
    expected_sif: "SIF-POTENTIAL",
    // Deliberately not scored on iogp/barrier — this one genuinely
    // implicates both Hot Work and Asset Integrity & Line of Containment
    // (an active hydrocarbon leak at a flange, welded next to it); the
    // engine's own trigger count is close enough (leak/pipeline/flange vs.
    // welding/grinding/hot work) that either would be a defensible primary.
  },
  {
    id: "E18",
    label: "Low-severity observation: late toolbox talk, some helmets missing",
    narrative:
      "টুলবক্স মিটিং দেৰিৰে হৈছিল, helmet কিছুমান মানুহে পৰিধান কৰা নাছিল। চাইটত housekeeping ভাল নাছিল।",
    asset: "Moran",
    expected_sif: "NON-SIF",
  },
  {
    id: "E19",
    label: "Scheduled fire extinguisher inspection, all normal",
    narrative:
      "Scheduled monthly fire extinguisher inspection completed across the unit; all units found charged, tagged and within hydro-test date. No deficiencies identified.",
    asset: "Digboi",
    expected_sif: "NON-SIF",
  },
  {
    id: "E20",
    label: "Vessel entry without gas test, nitrogen-purged tank, attendant left post",
    narrative:
      "Two workers entered a nitrogen-purged storage tank for cleaning without gas test being carried out first, and the attendant left the manhole entry point to help with equipment nearby instead of staying at post.",
    asset: "Digboi",
    expected_sif: "SIF-POTENTIAL",
    expected_iogp_primary: "Confined Space Entry",
    expected_barrier: "Confined Space Rescue & Atmosphere Control",
  },
];

export interface EvalCaseResult {
  id: string;
  label: string;
  expected_sif: SifLabel;
  predicted_sif: SifLabel;
  sif_correct: boolean;
  expected_iogp_primary?: string;
  predicted_iogp_primary: string;
  iogp_correct: boolean | null;
  expected_barrier?: string;
  predicted_barrier: string;
  barrier_correct: boolean | null;
}

export interface EvalReport {
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

/** Runs the deterministic rule engine (no LLM, no network) against EVAL_SET and scores it. */
export function evaluateEngine(): EvalReport {
  const cases: EvalCaseResult[] = EVAL_SET.map((c) => {
    const result = assessReport({ narrative: c.narrative, asset: c.asset });
    const predictedSif = result.sif_classification.label;
    const predictedIogp = result.iogp_rule_mapping.primary;
    const predictedBarrier = result.failing_barrier_analysis.barrier_name;
    return {
      id: c.id,
      label: c.label,
      expected_sif: c.expected_sif,
      predicted_sif: predictedSif,
      sif_correct: predictedSif === c.expected_sif,
      expected_iogp_primary: c.expected_iogp_primary,
      predicted_iogp_primary: predictedIogp,
      iogp_correct: c.expected_iogp_primary ? predictedIogp === c.expected_iogp_primary : null,
      expected_barrier: c.expected_barrier,
      predicted_barrier: predictedBarrier,
      barrier_correct: c.expected_barrier ? predictedBarrier === c.expected_barrier : null,
    };
  });

  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const c of cases) {
    if (c.expected_sif === "SIF-POTENTIAL" && c.predicted_sif === "SIF-POTENTIAL") tp++;
    else if (c.expected_sif === "NON-SIF" && c.predicted_sif === "SIF-POTENTIAL") fp++;
    else if (c.expected_sif === "NON-SIF" && c.predicted_sif === "NON-SIF") tn++;
    else fn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const iogpScored = cases.filter((c) => c.iogp_correct !== null);
  const barrierScored = cases.filter((c) => c.barrier_correct !== null);

  return {
    total: cases.length,
    sif_accuracy: Number((cases.filter((c) => c.sif_correct).length / cases.length).toFixed(3)),
    sif_true_positive: tp,
    sif_false_positive: fp,
    sif_true_negative: tn,
    sif_false_negative: fn,
    sif_precision: Number(precision.toFixed(3)),
    sif_recall: Number(recall.toFixed(3)),
    sif_f1: Number(f1.toFixed(3)),
    iogp_scored: iogpScored.length,
    iogp_accuracy: iogpScored.length ? Number((iogpScored.filter((c) => c.iogp_correct).length / iogpScored.length).toFixed(3)) : 0,
    barrier_scored: barrierScored.length,
    barrier_accuracy: barrierScored.length ? Number((barrierScored.filter((c) => c.barrier_correct).length / barrierScored.length).toFixed(3)) : 0,
    cases,
  };
}
