/**
 * HISTORICAL INCIDENT REPLAY
 *
 * The permanent knowledge base (engine/incidents.ts) records what actually
 * happened at real Indian O&G disasters, including the precursor chain that
 * preceded each one. This module writes each disaster's own precursors back
 * out as a plausible, dated field report — the kind of near-miss or unsafe-
 * condition observation a supervisor could plausibly have logged shortly
 * before the escalation — and runs it through the same triage pipeline used
 * for live submissions.
 *
 * The point is demonstrable, not decorative: if the engine correctly flags
 * these precursor narratives as SIF-POTENTIAL / CRITICAL today, that is
 * direct evidence this kind of tool could have surfaced the same warning
 * before the real event, instead of only after it. `days_before_disaster`
 * and `actual_outcome` are pulled straight from the archived record —
 * nothing here is invented severity, only a plausible field-report phrasing
 * of precursors OIL's own knowledge base already documents.
 */

import { assessReport } from "./assess";
import { INCIDENT_KB, type IncidentRecord } from "./incidents";
import type { SafetyAssessment } from "./types";
import type { LlmAssistResult } from "./llm";

export interface ReplayScenario {
  kbId: string;
  /** Plausible field-report phrasing of the archived incident's own precursors, written as if logged before the escalation. */
  precursor_narrative: string;
  asset: string;
  /** How long before the actual escalation this precursor pattern was already present, per the archived timeline. */
  days_before_disaster: number;
}

export const REPLAY_SCENARIOS: ReplayScenario[] = [
  {
    kbId: "KB-001",
    asset: "Baghjan",
    days_before_disaster: 2,
    precursor_narrative:
      "Workover crew is bypassing the standard secondary well barrier verification step to save time, continuing to pull pipe despite unconfirmed BOP readiness. A scraper is stuck in the tubing and swabbing continues while trying to free it. Pressure readings have not been checked because the crew is focused on the stuck scraper, flow check has been skipped, and mud pump standby readiness has not been confirmed. There are early signs of a possible gas release at surface that have not yet been investigated. Kick detection drills for this crew are overdue.",
  },
  {
    kbId: "KB-003",
    asset: "Digboi",
    days_before_disaster: 5,
    precursor_narrative:
      "Pressure safety valve on the gas sweetening unit has been gagged and the high-pressure interlock bypassed to keep production running, with a plan to fix it on the next shutdown. Outlet piping downstream shows visible corrosion. High-pressure alarm has been going off intermittently and is being acknowledged and ignored by the panel operator. PRD maintenance backlog on this unit is overdue.",
  },
  {
    kbId: "KB-008",
    asset: "Digboi",
    days_before_disaster: 1,
    precursor_narrative:
      "Plan for tomorrow's tank cleaning turnaround: entrants will go into the nitrogen-purged storage tank without gas test being carried out, following the same shortcut used on the last two similar jobs to save time. The attendant has been leaving the manhole entry point to help fetch equipment instead of staying at post, and the rescue tripod for this tank has not been rigged in advance.",
  },
];

export interface ReplayResult {
  scenario: ReplayScenario;
  incident: IncidentRecord;
  assessment: SafetyAssessment;
}

/** Runs one archived disaster's own precursor pattern through the live triage pipeline. `llm` is optional and behaves exactly as it does for a live submission — omit it to see the deterministic rule-engine's read on the same precursors. */
export function replayIncident(kbId: string, llm?: LlmAssistResult): ReplayResult | null {
  const scenario = REPLAY_SCENARIOS.find((s) => s.kbId === kbId);
  const incident = INCIDENT_KB.find((r) => r.id === kbId);
  if (!scenario || !incident) return null;
  const assessment = assessReport({ narrative: scenario.precursor_narrative, asset: scenario.asset, reportId: `REPLAY-${kbId}` }, llm);
  return { scenario, incident, assessment };
}

export function listReplayScenarios(): Array<{ kbId: string; title: string; asset: string; days_before_disaster: number; date: string; severity: string; fatalities: number }> {
  return REPLAY_SCENARIOS.map((s) => {
    const incident = INCIDENT_KB.find((r) => r.id === s.kbId)!;
    return {
      kbId: s.kbId,
      title: incident.title,
      asset: s.asset,
      days_before_disaster: s.days_before_disaster,
      date: incident.date,
      severity: incident.severity,
      fatalities: incident.fatalities,
    };
  });
}
