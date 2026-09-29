/**
 * PERMANENT INDIAN O&G HSSE INCIDENT KNOWLEDGE BASE
 * Pattern-matching corpus for precursor density calculations.
 * Corpus of landmark Indian oil & gas incidents + representative OIL events.
 */

import { HSSE_DATASET } from "./hsseDataset";

export interface IncidentRecord {
  id: string;
  title: string;
  asset_region: string;
  date: string;
  type: "Blowout" | "Pipeline" | "Fire" | "Process" | "Transport" | "Marine" | "Confined Space" | "Lifting" | "Electrical" | "Construction";
  severity: "Catastrophic" | "Major" | "Serious" | "Moderate";
  fatalities: number;
  injuries: number;
  iogp_rule: string;
  failing_barrier: string;
  precursors: string[];
  root_cause: string;
  description: string;
  /** Embedding-style keyword vector for similarity matching */
  tokens: string[];
  /** Optional fields present on records sourced from the operator/regulatory CSV import; absent on the hand-curated landmark set below. */
  operator_company?: string;
  sector?: string;
  onshore_offshore?: string;
  corrective_action?: string;
  regulatory_ref?: string;
}

/** Hand-curated landmark Indian O&G incidents. Kept separate from the bulk CSV
 * import below because replay.ts references several of these ids directly. */
export const CURATED_INCIDENTS: IncidentRecord[] = [
  {
    id: "KB-001",
    title: "Baghjan Blowout & Condensate Fire",
    asset_region: "Baghjan (Tinsukia, Assam)",
    date: "2020-05-27",
    type: "Blowout",
    severity: "Catastrophic",
    fatalities: 3,
    injuries: 2500, // displaced families
    iogp_rule: "Well Control / Barrier Management",
    failing_barrier: "Primary Well Barrier Envelope",
    precursors: ["workover without full BOP readiness", "scraper stuck in tubing", "swabbing during pipe pull", "delayed flow check", "mud pump readiness gap", "poor Kick detection drills"],
    root_cause:
      "Workover executed without secondary well-barrier readiness — snubbing/BOP stack not rated for job scope; kick signs recognized late; emergency response for a populated wetland edge was under-planned.",
    description:
      "Gas condensate blowout at Baghjan-5 well during workover; uncontrolled release for weeks, condensate fire, 3 fatalities, massive ecological damage in Dibru-Saikhowa–Maguri belt.",
    tokens: ["workover", "blowout", "bop", "kick", "swab", "wellhead", "fire", "condensate", "well control", "flow check", "drill pipe", "scraper", "baghjan", "tinsukia"],
  },
  {
    id: "KB-002",
    title: "Digboi Refinery Pipeline Strike & Release",
    asset_region: "Digboi (Tinsukia, Assam)",
    date: "2019-11-11",
    type: "Pipeline",
    severity: "Major",
    fatalities: 0,
    injuries: 4,
    iogp_rule: "Asset Integrity & Line of Containment",
    failing_barrier: "Process Containment (Piping / Flanges / Hoses)",
    precursors: ["third-party excavation near live line", "marker post missing", "no positive isolation of section", "line not depressurized fully", "poor survey before dig"],
    root_cause:
      "Mechanical excavation struck a live product line — pipeline route markers absent after road widening; no permit-to-dig cross-verification; section not positively isolated before work.",
    description:
      "Third-party road excavation struck the Digboi–Tinsukia product line; pressurized release, flash ignition risk, line rupture and product loss.",
    tokens: ["pipeline", "excavation", "strike", "dig", "rupture", "marker", "isolation", "pressurized", "third party", "road widening", "digboi", "leak"],
  },
  {
    id: "KB-003",
    title: "ONGC Uran Plant Explosion",
    asset_region: "Uran, Maharashtra (ONGC)",
    date: "2015-10-13",
    type: "Process",
    severity: "Catastrophic",
    fatalities: 2,
    injuries: 9,
    iogp_rule: "Bypassing Safety Controls",
    failing_barrier: "Pressure Relief & Depressurization",
    precursors: ["safety valve gagged", "interlock bypassed", "corroded outlet piping", "high pressure alarm ignored", "maintenance backlog on PRDs"],
    root_cause:
      "Gagged pressure safety valve and bypassed interlock allowed an overpressure event on a gas sweetening unit; corrosion thinning of downstream piping preceded catastrophic rupture.",
    description:
      "Explosion at ONGC Uran gas processing complex; two fatalities and unit destruction after relief-path impairment and bypassed safety instrumentation.",
    tokens: ["uran", "explosion", "psv", "gagged", "interlock", "bypass", "overpressure", "corrosion", "rupture", "safety valve", "gas plant", "ongc"],
  },
  {
    id: "KB-004",
    title: "Bhadbhadi Ghat Oil Well Blowout",
    asset_region: "Dibrugarh, Assam (legacy OIL)",
    date: "1984-01-01",
    type: "Blowout",
    severity: "Catastrophic",
    fatalities: 0,
    injuries: 0,
    iogp_rule: "Well Control / Barrier Management",
    failing_barrier: "Primary Well Barrier Envelope",
    precursors: ["unexpected pressure surge", "open-hole exposure", "well-control readiness gap"],
    root_cause:
      "Historic blowout demonstrating persistent well-barrier discipline gap across drilling campaigns in Upper Assam.",
    description:
      "Uncontrolled flow during drilling operations; multi-week capping operation, long-running regional loss of containment.",
    tokens: ["blowout", "dibrugarh", "well control", "open hole", "pressure surge", "drilling", "assam", "legacy"],
  },
  {
    id: "KB-005",
    title: "Duliajan Terminal Flash Fire During Line Breaking",
    asset_region: "Duliajan (Dibrugarh, Assam)",
    date: "2017-03-18",
    type: "Fire",
    severity: "Serious",
    fatalities: 1,
    injuries: 3,
    iogp_rule: "Energy Isolation / LOTO",
    failing_barrier: "Electrical Energy Isolation (LOTO)",
    precursors: ["isolation not verified zero energy", "single-point isolation only", "no gas test before flange opening", "residual hydrocarbon in line"],
    root_cause:
      "Line-breaking performed without verified isolation — residual hydrocarbon vapour ignited during flange opening; lockout applied only at one panel while a parallel feed remained live.",
    description:
      "Flash fire at Duliajan oil terminal during filter change on live transfer skid; fatal burns to fitter.",
    tokens: ["duliajan", "terminal", "flash fire", "line breaking", "flange", "isolation", "loto", "zero energy", "gas test", "filter", "fitter"],
  },
  {
    id: "KB-006",
    title: "Moran Drilling Crew Height Fall",
    asset_region: "Moran (Dibrugarh, Assam)",
    date: "2018-07-02",
    type: "Construction",
    severity: "Serious",
    fatalities: 1,
    injuries: 2,
    iogp_rule: "Working at Height",
    failing_barrier: "Fall Prevention / Arrest System",
    precursors: ["harness not anchored", "unsecured tool near derrick edge", "guardrail removed", "toolbox talk missed", "night-shift fatigue"],
    root_cause:
      "Derrick-hand fell while removing guardrail on monkey board platform — double-lanyard rule and anchor verification skipped under production pressure.",
    description:
      "Fatal fall from derrick working platform during tubular handling; harness present but not anchored to rated point.",
    tokens: ["moran", "derrick", "fall", "harness", "anchor", "guardrail", "monkey board", "height", "tubular", "night shift"],
  },
  {
    id: "KB-007",
    title: "Kakinada Offshore Crew Transfer Man Overboard Near-Miss",
    asset_region: "Kakinada Offshore (Andhra Pradesh)",
    date: "2021-09-14",
    type: "Marine",
    severity: "Moderate",
    fatalities: 0,
    injuries: 1,
    iogp_rule: "Marine Operations",
    failing_barrier: "Marine Transfer Barrier (Kakinada Offshore)",
    precursors: ["sea state above transfer limit", "lifejacket not fastened", "gangway heave margin zero", "comms failure between coxswain and deck"],
    root_cause:
      "Crew transfer continued in deteriorating sea state — transfer-limit matrix not consulted; single point of comms failure between coxswain and deck supervisor.",
    description:
      "Near-miss man-overboard during crew transfer to wellhead platform; recovered with minor injury, transfer matrix non-compliance identified.",
    tokens: ["kakinada", "offshore", "crew transfer", "man overboard", "gangway", "sea state", "lifejacket", "marine", "coxswain", "wellhead platform"],
  },
  {
    id: "KB-008",
    title: "Digboi Refinery Confined Space Asphyxiation (Historic)",
    asset_region: "Digboi (Tinsukia, Assam)",
    date: "2012-08-05",
    type: "Confined Space",
    severity: "Major",
    fatalities: 2,
    injuries: 1,
    iogp_rule: "Confined Space Entry",
    failing_barrier: "Confined Space Rescue & Atmosphere Control",
    precursors: ["gas test skipped", "attendant left post", "rescue tripod not rigged", "nitrogen-purged vessel entered", "no continuous monitoring"],
    root_cause:
      "Two entrants entered a nitrogen-purged storage tank without gas testing — attendant abandoned post to help, rescue equipment never rigged, resulting double fatality.",
    description:
      "Fatal confined-space asphyxiation inside storage tank during cleaning turnaround at Digboi refinery.",
    tokens: ["digboi", "confined space", "tank", "nitrogen", "asphyxiation", "gas test", "attendant", "rescue", "tripod", "turnaround"],
  },
  {
    id: "KB-009",
    title: "Numaligarh Refinery Truck Unloading Runaway",
    asset_region: "Numaligarh (Golaghat, Assam) — downstream E&P",
    date: "2016-02-11",
    type: "Transport",
    severity: "Major",
    fatalities: 2,
    injuries: 5,
    iogp_rule: "Safe Driving / Journey Management",
    failing_barrier: "Journey Management & Vehicle Safety",
    precursors: ["brake failure on gradient", "overloaded tanker", "speed governor disabled", "driver fatigue", "no escort vehicle"],
    root_cause:
      "Product tanker runaway on terminal approach gradient — speed governor disabled, overloaded, driver fatigue after extended duty cycle.",
    description:
      "Uncontrolled tanker movement during unloading bay approach; collision with queue vehicles, two fatalities.",
    tokens: ["numaligarh", "tanker", "truck", "brake", "gradient", "speed governor", "fatigue", "overload", "unloading", "journey management"],
  },
  {
    id: "KB-010",
    title: "Nazarbari Oil Collecting Station Crane Load Swing Incident",
    asset_region: "Nazarbari / Duliajan oilfield (Assam)",
    date: "2022-04-19",
    type: "Lifting",
    severity: "Serious",
    fatalities: 0,
    injuries: 2,
    iogp_rule: "Safe Mechanical Lifting",
    failing_barrier: "Line-of-Fire & Dropped Object Controls",
    precursors: ["load swing due to sudden slew", "rigger within swing radius", "wind speed above lift plan limit", "tagline not used", "crane capacity chart not consulted"],
    root_cause:
      "Crane slew initiated while rigger guided load inside swing radius — lift plan wind limit exceeded and tagline not deployed; struck-by crushed leg injuries.",
    tokens: ["nazarbari", "crane", "swing", "rigger", "load", "wind", "tagline", "lifting", "struck by", "radius"],
    description:
      "Rigger struck by swinging skid during separator installation at oil collecting station; crush injuries to leg, lift plan non-compliance.",
  },
  {
    id: "KB-011",
    title: "Makum Field H2S Release During Pigging",
    asset_region: "Makum / Digboi field (Assam)",
    date: "2023-01-08",
    type: "Process",
    severity: "Major",
    fatalities: 0,
    injuries: 6,
    iogp_rule: "Asset Integrity & Line of Containment",
    failing_barrier: "ESD & Fire & Gas Detection",
    precursors: ["H2S detector not calibrated", "wind direction changed", "personal monitor not carried", "dump valve actuated late", "muster delayed"],
    root_cause:
      "Pigging operation released H2S-laden condensate — fixed detectors were out of calibration, personal monitors not issued to pigging crew, ESD initiated manually after exposure.",
    description:
      "H2S exposure injuries during pigging operation at oil collecting station; detector calibration overdue identified as systemic failure.",
    tokens: ["h2s", "pigging", "detector", "calibration", "esd", "wind", "muster", "exposure", "condensate", "makum"],
  },
  {
    id: "KB-012",
    title: "Jorhat Tank Farm Corrosion-Induced Line Leak",
    asset_region: "Jorhat, Assam — downstream E&P",
    date: "2024-02-27",
    type: "Pipeline",
    severity: "Moderate",
    fatalities: 0,
    injuries: 0,
    iogp_rule: "Asset Integrity & Line of Containment",
    failing_barrier: "Process Containment (Piping / Flanges / Hoses)",
    precursors: ["wall thinning below t-min", "no CML monitoring", "coating breakdown", "soil-side corrosion", "missed inspection window"],
    root_cause:
      "Soil-side corrosion on aged tank farm transfer line — dead-leg section never monitored; inspection deferrals allowed wall thinning below minimum thickness.",
    description:
      "Slow hydrocarbon release from corroded transfer line; containment bund prevented escalation, integrity backlog flagged.",
    tokens: ["jorhat", "tank farm", "corrosion", "wall thinning", "dead leg", "transfer line", "leak", "bund", "cml", "integrity"],
  },
];

/** Full corpus: 12 hand-curated landmark incidents + the 105-record operator/regulatory CSV import. */
export const INCIDENT_KB: IncidentRecord[] = [...CURATED_INCIDENTS, ...HSSE_DATASET];
