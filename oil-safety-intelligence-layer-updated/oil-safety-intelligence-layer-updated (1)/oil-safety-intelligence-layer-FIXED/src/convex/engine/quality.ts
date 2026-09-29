/**
 * NARRATIVE QUALITY GUARD
 * Cheap, deterministic, dependency-free checks that catch obviously
 * non-report input (keyboard mashing, copy-paste spam, placeholder text)
 * before it ever reaches the SIF engine or gets persisted. Runs the same
 * way on the client (instant feedback) and the server (the real gate —
 * never trust the client alone).
 */

export interface NarrativeQualityResult {
  garbage: boolean;
  reason?: string;
}

/**
 * Recognised vocabulary: common English function words + incident/HSSE terms +
 * frequent romanised Hindi/Assamese/Bengali words (field reports are often
 * typed in Latin script). A genuine narrative always contains several of these;
 * keyboard-mashing essentially never does.
 */
const KNOWN_WORDS = new Set(
  `
a an the and or but if then so because while when where which who whom whose what that this these those there here
is are was were be been being am do does did done doing have has had having will would shall should can could may might must
i we you he she it they me us him her them my our your his its their mine ours
in on at by to from of for with without into onto over under above below near inside outside around through between during after before
up down out off again once not no yes all any some each every both few more most other such only own same than too very just also about against
as per via until since upon within across along behind beside beyond
worker workers person people man men operator operators supervisor contractor crew team staff employee engineer technician driver
rig well wellhead pad site plant platform tank tanks pipe pipes pipeline pipelines flange flanges hose hoses valve valves pump pumps
compressor separator vessel drilling drill drilled rotary derrick mast crane lift lifting load loads rope wire sling hook
gas oil crude condensate fluid mud water steam pressure temperature flow line lines leak leaked leaking leakage spill spilled release released
fire flame smoke explosion blast burst rupture ruptured blowout kick h2s hydrogen sulphide sulfide toxic fumes vapour vapor odour odor smell
injury injured hurt cut burn burned burnt fracture fell fall fallen slip slipped trip tripped struck hit crushed trapped caught pinned
fatal fatality death died dead hospital medical ambulance
unsafe act condition incident accident hazard risk danger dangerous safety safe
ppe helmet gloves goggles harness glasses boots mask respirator
permit ptw jsa toolbox talk tbt isolation isolated lockout tagout loto lock tag energy electrical electric electrocuted shock power live cable cables panel
confined space entry hot cold work welding welder grinding cutting spark sparks test tested testing monitor monitoring detector alarm
scaffold scaffolding ladder height heights edge barricade barrier barriers guard guarding cordon
maintenance inspection inspected repair repairing replaced replacement installation installed operation operations operating started stopped shutdown shut
procedure procedures instruction instructions training trained competent supervision communication
noticed observed found saw heard reported reporting discovered detected identified checked verified informed called
failed failure damaged damage broken loose missing corroded corrosion crack cracked wear worn faulty defective malfunction
vehicle truck tanker road driving speed collision overturned tractor forklift
area zone location gate lane camp store yard workshop office control room shift night day morning evening today yesterday
working worked task job activity activities using used use proper improper lack lacking
approx approximately metres meters feet ft mm cm bar psi kg tonnes tons minutes hours am pm
one two three four five six seven eight nine ten first second third next last new old high low large small heavy light
kaam kaj kotha kori korise korchhi kore ase asil achhe nai nahi nahin hai hain tha thi ho gaya gayi gaye raha rahi rahe hua hui hue
mein me ka ki ke ko se par aur ya wo woh yeh ye kya kyun kaise kab jab tab
aag pani tel kuan machine mazdoor karmchari sahayak
`
    .split(/\s+/)
    .filter(Boolean),
);

const VOWELS = /[aeiouy]/i;

/** Does a single Latin-script word look pronounceable / like a real word? */
function looksLikeWord(word: string): boolean {
  const w = word.replace(/[^A-Za-z]/g, "");
  if (w.length <= 2) return true; // too short to judge
  const isAllCaps = w === w.toUpperCase();
  const isCapitalised = /^[A-Z][a-z]+$/.test(w);
  const isLower = w === w.toLowerCase();
  // Random mid-word capitals, e.g. "hsuaihsiUAH"
  if (!isAllCaps && !isCapitalised && !isLower) return false;
  const lower = w.toLowerCase();
  // No vowel: only acceptable as a short acronym (PPE, PTW, LOTO, JSA)
  if (!VOWELS.test(lower)) return isAllCaps && lower.length <= 5;
  if (/[^aeiouy]{5,}/.test(lower)) return false; // impossible consonant clusters
  if (/[aeiouy]{4,}/.test(lower)) return false; // impossible vowel runs
  const vowelRatio = (lower.match(/[aeiouy]/g) ?? []).length / lower.length;
  if (lower.length >= 5 && (vowelRatio < 0.2 || vowelRatio > 0.7)) return false;
  // Keyboard-row runs
  if (/(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm)/.test(lower)) return false;
  // Same 2–3 letter chunk repeated ("hahaha", "sdsdsd")
  if (/(.{2,3})\1{2,}/.test(lower)) return false;
  return true;
}


/**
 * INCIDENT-RELEVANCE VOCABULARY (word stems, matched as token prefixes).
 * A genuine HSSE narrative names at least one hazard, injury, equipment item,
 * energy source, failed control, or operation. Well-formed English that has
 * none of these ("hello my name is ... and i am a good boy") is not a report.
 */
const DOMAIN_STEMS = [
  // events / outcomes
  "incident","accident","near-miss","nearmiss","near miss","injur","hurt","fatal","fatalit","death","died","dead","fractur","burn","scald","cut ","bleed","faint","unconscious","collaps","fell","fall","slip","trip","struck","strike","hit","crush","trapp","caught","pinned","collid","collision","overturn","capsiz","explo","blast","blowout","fire","flame","ignit","spark","smoke","leak","spill","release","rupture","burst","overflow","seep","gush","kick","flare","fume","vapo","gas","h2s","hydrocarbon","toxic","exposure","exposed","asphyx","suffocat","drown","electrocut","shock",
  // hazards / conditions
  "unsafe","hazard","danger","risk","corros","crack","damag","broke","broken","fail","faulty","defect","malfunction","loose","missing","worn","rust","blocked","obstruct","pressure","overpressure","depressur","temperature","heat","cold","noise","vibrat","dust","slippery","wet","oily","dark","visibility","weather","storm","wind","rain","flood","sea state","swell","unstable","collapse",
  // energy / isolation / permits
  "permit","ptw","jsa","toolbox","isolat","lockout","lock out","loto","tagout","de-energ","deenerg","energ","electric","voltage","live ","cable","panel","circuit","earthing","grounding","bypass","override","interlock","alarm","detector","trip ","shutdown","shut down","esd","psv","relief valve","safety valve",
  // work types / equipment / places
  "weld","grind","cutting","hot work","confined","tank","vessel","manhole","entry","scaffold","ladder","height","harness","lifeline","crane","lift","sling","rigging","hoist","load","rope","hook","forklift","truck","tanker","vehicle","driv","road","reverse","reversing","banksman","rig","drill","wellhead","derrick","mast","rotary","kelly","bop","casing","tubing","mud","cement","separator","compressor","pump","valve","flange","hose","pipe","pipeline","manifold","header","heater","boiler","furnace","flare","gauge","instrument","sensor","transmitter","coupling","bolt","gasket","seal","platform","offshore","onshore","jetty","vessel","boat","helideck","helicopter","gangway","transfer","crew","excavat","trench","construction","maintenance","inspection","repair","shutdown","turnaround","commission","start-up","startup","testing","sampling","cleaning","painting","blasting","hydrotest","pigging","tie-in","hot tap",
  // controls / PPE / procedure
  "safety","perimeter","cargo","discharge","drift","supply","marine","mooring","anchor","berth","ppe","helmet","glove","goggle","glasses","boots","mask","respirator","scba","harness","fire watch","firewatch","extinguisher","barricad","barrier","guard","cordon","signage","supervis","procedure","instruction","training","competen","briefing","stop work","stopwork","muster","evacuat","rescue","first aid","first-aid","ambulance","hospital","medical","emergency","sop","msds","sds","gas test","lel","oxygen","ventilat","standby","attendant",
  // romanised Hindi / Assamese / Bengali safety words
  "aag","dhuan","dhua","rissa","risav","chot","ghayal","girna","durghatna","khatra","suraksha","nirapatta","permit","gas","pipeline","lekage","leak",
];

/** Generic words that appear in everyday talk too — they only count for half. */
const WEAK_STEMS = new Set([
  "risk","cold","heat","dark","wet","wind","rain","storm","weather","road","driv","crew","boat","load","transfer","entry","cleaning","painting",
  "medical","hospital","emergency","training","instruction","procedure","supervis","maintenance","inspection","repair","construction","fall","hit",
  "release","exposure","exposed","broke","broken","fail","missing","loose","noise","dust","pressure","temperature","vessel","platform","transfer",
  "trip","lift","line","gauge","seal","bolt","barrier","guard","signage","briefing","standby","sampling","testing","test","energ",
]);

/** Weighted relevance score: strong hazard/equipment term = 1, generic term = 0.5 (each distinct stem counted once). */
function domainScore(latinTokens: string[]): { score: number; strong: number } {
  const seen = new Map<string, number>();
  for (const t of latinTokens) {
    for (const raw of DOMAIN_STEMS) {
      const st = raw.trim();
      if (!st || st.includes(" ")) continue;
      // Short stems must match the whole word (or a plural) so "rig" never matches "right", "cut" never "cute".
      const hit = st.length <= 4 ? t === st || t === st + "s" || t === st + "ed" || t === st + "ing" : t.startsWith(st);
      if (hit) {
        if (!seen.has(st)) seen.set(st, WEAK_STEMS.has(st) ? 0.5 : 1);
        break;
      }
    }
  }
  let score = 0;
  let strong = 0;
  seen.forEach((w) => {
    score += w;
    if (w === 1) strong += 1;
  });
  return { score, strong };
}

function normaliseToken(t: string): string {
  return t.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

// \p{L} matches any Unicode letter in any script (Latin, Devanagari, Bengali/Assamese, etc.)
const READABLE_CHAR = /\p{L}/gu;

export function assessNarrativeQuality(rawText: string): NarrativeQualityResult {
  const text = rawText.trim();
  if (!text) return { garbage: true, reason: "Narrative is empty." };

  const tokens = text.split(/\s+/).filter(Boolean);

  const readableChars = (text.match(READABLE_CHAR) ?? []).length;
  if (readableChars / text.length < 0.35) {
    return {
      garbage: true,
      reason: "Narrative doesn't contain enough readable text — mostly symbols, numbers, or punctuation.",
    };
  }

  if (/(.)\1{7,}/.test(text)) {
    return { garbage: true, reason: "Narrative contains long repeated-character sequences (e.g. \"aaaaaaaa\")." };
  }

  const uniqueTokens = new Set(tokens.map((t) => t.toLowerCase()));
  if (tokens.length >= 6 && uniqueTokens.size / tokens.length < 0.4) {
    return { garbage: true, reason: "Narrative repeats the same few words too many times to describe a real incident." };
  }

  const PLACEHOLDER =
    /\b(lorem ipsum|test test|asdf|qwerty|xxxx|n\/?a|todo|tbd|sample text|placeholder|this is a test|just testing|testing testing|ignore this|please ignore|dummy (text|report|data)|blah blah|random text)\b/i;
  if (PLACEHOLDER.test(text) && tokens.length < 15) {
    return { garbage: true, reason: "Narrative looks like placeholder or test text rather than a field report." };
  }


  // ── Comprehension check (Latin script only) ────────────────────────────
  // Catches keyboard-mashing that has letters, mixed case and no repeats,
  // e.g. "ghdihdiuhaiuhda dijahsug hsuaihsiuAS AIUSHIUahsiuAH".
  // Non-Latin scripts (Devanagari / Bengali-Assamese) skip this: they are
  // covered by the checks above and by the LLM cross-check when configured.
  const latinTokens = tokens.map(normaliseToken).filter((t) => /^[a-z0-9'’-]+$/i.test(t) && /[a-z]/i.test(t));
  const isMostlyLatin = latinTokens.length >= tokens.length * 0.6;
  if (isMostlyLatin && latinTokens.length >= 3) {
    const alphaTokens = tokens.filter((t) => /[A-Za-z]{3,}/.test(t));
    const plausible = alphaTokens.filter((t) => looksLikeWord(t.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")));
    if (alphaTokens.length >= 3 && plausible.length / alphaTokens.length < 0.6) {
      return {
        garbage: true,
        reason:
          "Narrative doesn't look like real words — it appears to be random typing. Please describe what happened in plain sentences.",
      };
    }
    const known = latinTokens.filter((t) => KNOWN_WORDS.has(t));
    const knownDistinct = new Set(known).size;
    if (known.length / latinTokens.length < 0.2 || knownDistinct < 2) {
      return {
        garbage: true,
        reason:
          "Narrative doesn't read like an incident report. Describe who was involved, what happened, where, and what the hazard was.",
      };
    }

    // ── Relevance check ─────────────────────────────────────────────────
    // Real sentences that are NOT about an incident (introductions, chit-chat,
    // "i am a good boy and i dont work") must be rejected too.
    // Needs at least one strong hazard/equipment term; longer texts need a bit more evidence.
    // Generic words alone ("road", "crew", "weather") can never satisfy this.
    const { score, strong } = domainScore(latinTokens);
    const needed = latinTokens.length >= 20 ? 2 : 1;
    if (strong < 1 || score < needed) {
      return {
        garbage: true,
        reason:
          "Narrative doesn't describe a safety incident, hazard or unsafe condition. Please state what happened, where, and what equipment, energy source or hazard was involved.",
      };
    }
  }

  return { garbage: false };
}
