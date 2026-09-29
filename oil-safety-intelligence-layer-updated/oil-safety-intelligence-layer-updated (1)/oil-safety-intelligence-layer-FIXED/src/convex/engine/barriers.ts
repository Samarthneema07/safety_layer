/**
 * SAFETY BARRIERS CATALOG — OIL Operations
 * Bow-tie barriers protecting against major accident hazards across
 * Duliajan, Digboi, Baghjan, Moran, Kakinada Offshore, Downstream E&P.
 */

export interface Barrier {
  name: string;
  threat: string; // left side of bow-tie
  consequence: string; // right side of bow-tie
  oisd: string; // OISD standard cross-reference
  keywords: string[];
}

export const BARRIERS: Barrier[] = [
  {
    name: "Primary Well Barrier Envelope",
    threat: "Lost hydrostatic overbalance during tripping / swabbing",
    consequence: "Uncontrolled well release (blowout) & ignition",
    oisd: "OISD-GDN-161 / OISD-RP-170",
    keywords: ["bop", "mud", "kill line", "annular", "ram", "wellhead", "well barrier", "hydrostatic", "trip", "swab", "kick detection", "pit gain", "flow check"],
  },
  {
    name: "Secondary Well Barrier Envelope",
    threat: "Kick not detected / late shut-in",
    consequence: "Surface release at wellhead, formation damage",
    oisd: "OISD-GDN-161",
    keywords: ["kick", "flow check", "shut-in", "spp", "stand pipe", "scraper", "float shoe", "cement"],
  },
  {
    name: "Process Containment (Piping / Flanges / Hoses)",
    threat: "Corrosion, gasket failure, hammer union blow-off",
    consequence: "Hydrocarbon release, flash fire, VCE",
    oisd: "OISD-STD-129 / OISD-GDN-101",
    keywords: ["flange", "gasket", "hose", "hammer union", "piping", "pipe line", "pipeline", "spool", "union", "gland", "packing", "seal", "drip", "sweep", "clamp"],
  },
  {
    name: "Pressure Relief & Depressurization",
    threat: "PSV gagged / set pressure above MAWP",
    consequence: "Vessel overpressure rupture",
    oisd: "OISD-STD-105 / OISD-RP-123",
    keywords: ["psv", "relief valve", "safety valve", "rupture disc", "flare header", "depressurization", "set pressure"],
  },
  {
    name: "ESD & Fire & Gas Detection",
    threat: "Gas cloud undetected, ESD not initiated",
    consequence: "Ignition of release, escalation to adjacent units",
    oisd: "OISD-STD-117 / OISD-STD-164",
    keywords: ["esd", "gas detector", "fire detector", "h2s monitor", "smoke detector", "heat detector", "alarm", "hooter", "f&g", "call point"],
  },
  {
    name: "Electrical Energy Isolation (LOTO)",
    threat: "Stored / live energy not isolated before work",
    consequence: "Electric shock, arc flash, fatality",
    oisd: "OISD-GDN-192 / CEA Regulations",
    keywords: ["loto", "lockout", "isolation", "isolate", "permit", "tag", "electrical", "breaker", "panel", "live", "switchgear", "earthing", "capacitor"],
  },
  {
    name: "Hot Work Control Barrier",
    threat: "Ignition source near hydrocarbon atmosphere",
    consequence: "Flash fire / explosion in work zone",
    oisd: "OISD-STD-105 / OISD-GDN-206",
    keywords: ["hot work", "welding", "grinding", "cutting", "spark", "flame", "torching", "burner", "gas cutting", "fire watch"],
  },
  {
    name: "Confined Space Rescue & Atmosphere Control",
    threat: "Toxic / oxygen-deficient atmosphere in vessel",
    consequence: "Asphyxiation, H2S poisoning, fatal entry",
    oisd: "OISD-STD-105 / OISD-GDN-198",
    keywords: ["confined space", "vessel entry", "gas test", "oxygen", "h2s", "ba set", "breathing apparatus", "manhole", "attendant", "rescue tripod", "ventilation"],
  },
  {
    name: "Line-of-Fire & Dropped Object Controls",
    threat: "Personnel within swing radius / under load",
    consequence: "Struck-by, crush injury, fatality",
    oisd: "OISD-RP-109 / OISD-GDN-206",
    keywords: ["line of fire", "swing radius", "suspended load", "barrier tape", "exclusion zone", "drop zone", "barricade", "spotter", "toolbox", "positioning"],
  },
  {
    name: "Fall Prevention / Arrest System",
    threat: "Work at unprotected edge without anchorage",
    consequence: "Fatal fall from height",
    oisd: "OISD-RP-109",
    keywords: ["harness", "lanyard", "anchor", "scaffold", "ladder", "guard rail", "fall arrest", "lifeline", "platform", "double lanyard"],
  },
  {
    name: "Journey Management & Vehicle Safety",
    threat: "Speeding, fatigue, night convoy risk",
    consequence: "Road traffic fatality",
    oisd: "OISD-GDN-113",
    keywords: ["journey plan", "speed governor", "gps", "seat belt", "rest", "fatigue", "convoy", "escort", "night driving", "brake", "tyre"],
  },
  {
    name: "Marine Transfer Barrier (Kakinada Offshore)",
    threat: "Deck transfer in sea state beyond limits",
    consequence: "Man overboard, vessel collision",
    oisd: "OISD-GDN-129 (Marine) / DGH Guidelines",
    keywords: ["crew boat", "gangway", "transfer", "mooring", "sea state", "life jacket", "lifejacket", "jetty", "tide", "berthing"],
  },
];

export function findBarrier(name: string): Barrier | undefined {
  return BARRIERS.find((b) => b.name === name);
}
