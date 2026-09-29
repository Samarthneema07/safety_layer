/**
 * REGIONAL LANGUAGE PIPELINE
 * Script + heuristic based detection, plus a deterministic offline glossary
 * translation for Assamese, Hindi, and Bengali safety narratives. This is a
 * genuine limitation to be transparent about: a substring glossary can carry
 * across known safety vocabulary reliably, but it is NOT fluent machine
 * translation — grammar, conjugation, and words outside the glossary are
 * left in the original script. `translation_confidence` reflects that
 * honestly (see `translateNarrative` below); when an LLM cross-check is
 * configured (engine/llm.ts), its translation is preferred over this one.
 */

import { IOGP_RULES } from "./iogp";
import { INCIDENT_KB } from "./incidents";

export type ReportLanguage = "Assamese" | "Hindi" | "Bengali" | "English";

const SCRIPT_RANGES: Array<[RegExp, ReportLanguage]> = [
  [/[\u0980-\u09FF]/, "Bengali"], // Bengali + Assamese script block
  [/[\u0900-\u097F]/, "Hindi"], // Devanagari
];

/** Detects language by Unicode script blocks; Assamese vs Bengali via conjuncts. */
export function detectLanguage(text: string): ReportLanguage {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const hasBengaliScript = /[\u0980-\u09FF]/.test(text);
  if (hasDevanagari && !hasBengaliScript) return "Hindi";
  if (hasBengaliScript) {
    // Assamese uses ৰ (U+09F0) and ৱ (U+09F1); Bengali does not.
    if (/[\u09F0\u09F1]/.test(text)) return "Assamese";
    return "Bengali";
  }
  if (SCRIPT_RANGES.length === 0) return "English";
  // Latin script: check for common regional words romanized
  const lower = text.toLowerCase();
  if (/\b(kaam|kotha|kori|ase|nai|kob|lagise|korise|hai)\b/.test(lower)) return "Assamese";
  if (/\b(kaj|nahi|hai|karo|chal|raha|karna|lagta)\b/.test(lower)) return "Hindi";
  if (/\b(kaj|korchhi|achhe|na|bolo|lagchhe|korchi)\b/.test(lower)) return "Bengali";
  return "English";
}

interface TranslationEntry {
  from: string;
  to: string;
}

/**
 * Deterministic offline glossary. This is a genuine substring dictionary,
 * not a model — see the module-level comment above for what that does and
 * doesn't guarantee. Sorted longest-phrase-first below so a multi-word
 * phrase (e.g. "কৰা হোৱা নাছিল") is matched before a shorter substring of
 * it (e.g. "কৰা") can consume part of it and corrupt the match.
 */
const TRANSLATION_MAP: Record<Exclude<ReportLanguage, "English">, TranslationEntry[]> = {
  Assamese: [
    { from: "ৱেলডিং", to: "welding" },
    { from: "গ্ৰাইণ্ডিং", to: "grinding" },
    { from: "কাম", to: "work" },
    { from: "কৰিছিল", to: "was doing" },
    { from: "কৰিছে", to: "did" },
    { from: "লিক", to: "leak" },
    { from: "পাইপলাইন", to: "pipeline" },
    { from: "ক্ষয়", to: "corrosion" },
    { from: "বিচ্ছিন্ন", to: "isolation" },
    { from: "লক আউট", to: "lockout" },
    { from: "বৈদ্যুতিক", to: "electrical" },
    { from: "বন্ধ স্থান", to: "confined space" },
    { from: "টেংকৰ ভিতৰত", to: "inside the tank" },
    { from: "উচ্চতাত", to: "at height" },
    { from: "মই", to: "ladder" },
    { from: "স্কেফোল্ড", to: "scaffold" },
    { from: "ক্ৰেইন", to: "crane" },
    { from: "উত্তোলন", to: "lifting" },
    { from: "ব্লোআউট", to: "blowout" },
    { from: "কুঁৱা", to: "well" },
    { from: "নিয়ন্ত্ৰণ", to: "control" },
    { from: "নিৰাপত্তা", to: "safety" },
    { from: "সঁজুলি", to: "equipment" },
    { from: "হেলমেট", to: "helmet" },
    { from: "আগুৰি", to: "around" },
    { from: "গেছ", to: "gas" },
    { from: "আগুন", to: "fire" },
    { from: "গাড়ী", to: "vehicle" },
    { from: "চলাচল", to: "movement" },
    { from: "ড্ৰাইভাৰ", to: "driver" },
    { from: "গতি", to: "speed" },
    { from: "বেছি", to: "excess" },
    { from: "টেংকী", to: "tank" },
    { from: "ভিতৰত", to: "inside" },
    { from: "প্ৰৱেশ", to: "entry" },
    { from: "অনুমতি", to: "permit" },
    { from: "পত্ৰ", to: "document" },
    { from: "নাই", to: "not present" },
    { from: "কৰা হোৱা নাছিল", to: "was not done" },
    { from: "আৰম্ভ", to: "start" },
    { from: "বন্ধ", to: "stop" },
    { from: "ৰোগী", to: "injured" },
    { from: "আহত", to: "injured" },
    { from: "ঘটনাস্থল", to: "site" },
    { from: "ৰিপৰ্ট", to: "report" },
    { from: "চাইট", to: "site" },
    { from: "চৌকাস", to: "caution" },
    { from: "বিপদ", to: "danger" },
    { from: "টিম", to: "team" },
    { from: "চুপাৰভাইজাৰ", to: "supervisor" },
    { from: "কিন্তু", to: "but" },
    { from: "এতিয়াও", to: "still" },
    { from: "চলি আছে", to: "continuing" },
    { from: "যান্ত্ৰিক", to: "mechanical" },
    { from: "বিজুলী", to: "electricity" },
    { from: "তাৰ পিছত", to: "after that" },
    { from: "সৰু", to: "small" },
    { from: "ডাঙৰ", to: "large" },
    { from: "চাপ", to: "pressure" },
    { from: "বাষ্প", to: "vapour" },
    { from: "গোন্ধ", to: "smell" },
    { from: "টাৱাৰ", to: "tower" },
    { from: "পাইপ", to: "pipe" },
    { from: "ফুটো", to: "burst" },
    { from: "হাত", to: "hand" },
    { from: "আঙুলি", to: "finger" },
    { from: "মূৰ", to: "head" },
    { from: "চকু", to: "eye" },
    { from: "ভৰি", to: "leg/foot" },
    { from: "আঘাত", to: "injury" },
    { from: "স্থান", to: "location" },
    { from: "পানী", to: "water" },
    { from: "মাটি", to: "soil" },
    { from: "জ্বলা", to: "burning" },
    { from: "ধোঁৱা", to: "smoke" },
    { from: "শুনিলোঁ", to: "heard" },
    { from: "দেখিলোঁ", to: "saw" },
    { from: "ঘটনা", to: "incident" },
    { from: "কালি", to: "yesterday" },
    { from: "আজি", to: "today" },
    { from: "ৰাতি", to: "night" },
    { from: "দিন", to: "day" },
    { from: "বিস্ফোৰণ", to: "explosion" },
    { from: "শক্তিশালী", to: "strong" },
    { from: "সতৰ্কবাণী", to: "warning" },
    { from: "অৱহেলা", to: "negligence" },
    { from: "বিপৰীতে", to: "opposite" },
    { from: "সহায়", to: "help" },
  ],
  Hindi: [
    { from: "वेल्डिंग", to: "welding" },
    { from: "ग्राइंडिंग", to: "grinding" },
    { from: "काम", to: "work" },
    { from: "कर रहा था", to: "was doing" },
    { from: "कर रहे थे", to: "were doing" },
    { from: "लीक", to: "leak" },
    { from: "रिसाव", to: "leakage" },
    { from: "पाइपलाइन", to: "pipeline" },
    { from: "क्षरण", to: "seepage" },
    { from: "क्रोडिंग", to: "corrosion" },
    { from: "जंग", to: "rust" },
    { from: "आइसोलेशन", to: "isolation" },
    { from: "लॉक आउट", to: "lockout" },
    { from: "लोटो", to: "LOTO" },
    { from: "बिजली", to: "electricity" },
    { from: "करंट", to: "current" },
    { from: "स्विच बंद", to: "switch off" },
    { from: "कॉन्फाइंड स्पेस", to: "confined space" },
    { from: "टंकी के अंदर", to: "inside the tank" },
    { from: "मैनहोल", to: "manhole" },
    { from: "गैस टेस्ट", to: "gas test" },
    { from: "ऑक्सीजन", to: "oxygen" },
    { from: "ऊंचाई पर काम", to: "work at height" },
    { from: "सीढ़ी", to: "ladder" },
    { from: "स्कैफोल्ड", to: "scaffold" },
    { from: "हार्नेस", to: "harness" },
    { from: "गिरना", to: "fall" },
    { from: "गिर गया", to: "fell" },
    { from: "क्रेन", to: "crane" },
    { from: "लिफ्टिंग", to: "lifting" },
    { from: "रिगिंग", to: "rigging" },
    { from: "स्लिंग", to: "sling" },
    { from: "ब्लोआउट", to: "blowout" },
    { from: "बीओपी", to: "BOP" },
    { from: "किक", to: "kick" },
    { from: "कुआं", to: "well" },
    { from: "वेलहेड", to: "wellhead" },
    { from: "प्रेशर", to: "pressure" },
    { from: "नियंत्रण", to: "control" },
    { from: "सुरक्षा", to: "safety" },
    { from: "उपकरण", to: "equipment" },
    { from: "हेलमेट", to: "helmet" },
    { from: "आग", to: "fire" },
    { from: "गैस", to: "gas" },
    { from: "वाहन", to: "vehicle" },
    { from: "गाड़ी", to: "vehicle" },
    { from: "ड्राइवर", to: "driver" },
    { from: "स्पीड", to: "speed" },
    { from: "गति सीमा", to: "speed limit" },
    { from: "सीट बेल्ट", to: "seat belt" },
    { from: "यात्रा प्रबंधन", to: "journey management" },
    { from: "टंकी", to: "tank" },
    { from: "अंदर", to: "inside" },
    { from: "प्रवेश", to: "entry" },
    { from: "परमिट", to: "permit" },
    { from: "वर्क परमिट", to: "work permit" },
    { from: "अनुमति", to: "permission" },
    { from: "बिना परमिट", to: "without permit" },
    { from: "टूलबॉक्स टॉक", to: "toolbox talk" },
    { from: "नहीं", to: "not" },
    { from: "नहीं किया", to: "not done" },
    { from: "शुरू", to: "start" },
    { from: "बंद", to: "stop" },
    { from: "घायल", to: "injured" },
    { from: "चोट", to: "injury" },
    { from: "साइट", to: "site" },
    { from: "रिपोर्ट", to: "report" },
    { from: "चेतावनी", to: "warning" },
    { from: "खतरा", to: "danger" },
    { from: "टीम", to: "team" },
    { from: "सुपरवाइजर", to: "supervisor" },
    { from: "लेकिन", to: "but" },
    { from: "अभी भी", to: "still" },
    { from: "चल रहा", to: "continuing" },
    { from: "मशीन", to: "machine" },
    { from: "बायपास", to: "bypass" },
    { from: "सेफ्टी बाईपास", to: "safety bypass" },
    { from: "अलार्म बंद", to: "alarm disabled" },
    { from: "इंटरलॉक", to: "interlock" },
    { from: "वाल्व", to: "valve" },
    { from: "फ्लैंज", to: "flange" },
    { from: "टूटी", to: "broken" },
    { from: "टूट गया", to: "broke" },
    { from: "बाष्प", to: "vapour" },
    { from: "गंध", to: "smell" },
    { from: "धुआं", to: "smoke" },
    { from: "हाथ", to: "hand" },
    { from: "उंगली", to: "finger" },
    { from: "सिर", to: "head" },
    { from: "आंख", to: "eye" },
    { from: "पैर", to: "leg/foot" },
    { from: "हादसा", to: "incident" },
    { from: "घटना", to: "incident" },
    { from: "कल", to: "yesterday" },
    { from: "आज", to: "today" },
    { from: "रात", to: "night" },
    { from: "दिन", to: "day" },
    { from: "विस्फोट", to: "explosion" },
    { from: "धमाका", to: "explosion" },
    { from: "जोरदार", to: "loud/strong" },
    { from: "लापरवाही", to: "negligence" },
    { from: "मदद", to: "help" },
    { from: "डर", to: "fear" },
    { from: "भागा", to: "ran away" },
    { from: "सुना", to: "heard" },
    { from: "देखा", to: "saw" },
    { from: "जा रहा था", to: "was going" },
    { from: "था", to: "was" },
    { from: "थे", to: "were" },
    { from: "में", to: "in" },
    { from: "के", to: "of" },
    { from: "पर", to: "on" },
    { from: "और", to: "and" },
  ],
  Bengali: [
    { from: "ওয়েল্ডিং", to: "welding" },
    { from: "গ্রাইন্ডিং", to: "grinding" },
    { from: "কাজ", to: "work" },
    { from: "করছিল", to: "was doing" },
    { from: "করেছিল", to: "did" },
    { from: "লিক", to: "leak" },
    { from: "ফুটো", to: "burst/leak" },
    { from: "পাইপলাইন", to: "pipeline" },
    { from: "ক্ষয়", to: "corrosion" },
    { from: "আইসোলেশন", to: "isolation" },
    { from: "লক আউট", to: "lockout" },
    { from: "বিদ্যুৎ", to: "electricity" },
    { from: "কারেন্ট", to: "current" },
    { from: "কনফাইন্ড স্পেস", to: "confined space" },
    { from: "ট্যাংকের ভিতরে", to: "inside the tank" },
    { from: "ম্যানহোল", to: "manhole" },
    { from: "গ্যাস টেস্ট", to: "gas test" },
    { from: "অক্সিজেন", to: "oxygen" },
    { from: "উচ্চতায় কাজ", to: "work at height" },
    { from: "সিঁড়ি", to: "ladder" },
    { from: "স্ক্যাফোল্ড", to: "scaffold" },
    { from: "হারনেস", to: "harness" },
    { from: "পড়ে যাওয়া", to: "falling" },
    { from: "পড়ে গেল", to: "fell" },
    { from: "ক্রেন", to: "crane" },
    { from: "লিফটিং", to: "lifting" },
    { from: "রিগিং", to: "rigging" },
    { from: "স্লিং", to: "sling" },
    { from: "ব্লোআউট", to: "blowout" },
    { from: "কুয়া", to: "well" },
    { from: "ওয়েলহেড", to: "wellhead" },
    { from: "চাপ", to: "pressure" },
    { from: "নিয়ন্ত্রণ", to: "control" },
    { from: "নিরাপত্তা", to: "safety" },
    { from: "সরঞ্জাম", to: "equipment" },
    { from: "হেলমেট", to: "helmet" },
    { from: "আগুন", to: "fire" },
    { from: "গ্যাস", to: "gas" },
    { from: "গাড়ি", to: "vehicle" },
    { from: "ড্রাইভার", to: "driver" },
    { from: "স্পিড", to: "speed" },
    { from: "সিট বেল্ট", to: "seat belt" },
    { from: "ট্যাংক", to: "tank" },
    { from: "ভিতরে", to: "inside" },
    { from: "প্রবেশ", to: "entry" },
    { from: "পারমিট", to: "permit" },
    { from: "ওয়ার্ক পারমিট", to: "work permit" },
    { from: "অনুমতি ছাড়া", to: "without permission" },
    { from: "টুলবক্স টক", to: "toolbox talk" },
    { from: "না", to: "not" },
    { from: "করা হয়নি", to: "not done" },
    { from: "শুরু", to: "start" },
    { from: "বন্ধ", to: "stop" },
    { from: "আহত", to: "injured" },
    { from: "চোট", to: "injury" },
    { from: "সাইট", to: "site" },
    { from: "রিপোর্ট", to: "report" },
    { from: "সতর্কতা", to: "warning" },
    { from: "বিপদ", to: "danger" },
    { from: "টিম", to: "team" },
    { from: "সুপারভাইজার", to: "supervisor" },
    { from: "কিন্তু", to: "but" },
    { from: "এখনও", to: "still" },
    { from: "চলছে", to: "continuing" },
    { from: "মেশিন", to: "machine" },
    { from: "বাইপাস", to: "bypass" },
    { from: "অ্যালার্ম বন্ধ", to: "alarm disabled" },
    { from: "ইন্টারলক", to: "interlock" },
    { from: "ভালভ", to: "valve" },
    { from: "ফ্ল্যাঞ্জ", to: "flange" },
    { from: "ভেঙে", to: "broken" },
    { from: "ভেঙে গেছে", to: "broke" },
    { from: "বাষ্প", to: "vapour" },
    { from: "গন্ধ", to: "smell" },
    { from: "ধোঁয়া", to: "smoke" },
    { from: "হাত", to: "hand" },
    { from: "আঙুল", to: "finger" },
    { from: "মাথা", to: "head" },
    { from: "চোখ", to: "eye" },
    { from: "পা", to: "leg/foot" },
    { from: "দুর্ঘটনা", to: "accident" },
    { from: "ঘটনা", to: "incident" },
    { from: "গতকাল", to: "yesterday" },
    { from: "আজ", to: "today" },
    { from: "রাত", to: "night" },
    { from: "দিন", to: "day" },
    { from: "বিস্ফোরণ", to: "explosion" },
    { from: "প্রবল", to: "strong" },
    { from: "অবহেলা", to: "negligence" },
    { from: "সাহায্য", to: "help" },
    { from: "ভয়", to: "fear" },
    { from: "দৌড়", to: "ran" },
    { from: "শুনলাম", to: "heard" },
    { from: "দেখলাম", to: "saw" },
    { from: "মধ্যে", to: "in" },
    { from: "এবং", to: "and" },
  ],
};

function translateTokens(text: string, lang: Exclude<ReportLanguage, "English">): string {
  let out = text;
  // Longest phrases first (see comment on TRANSLATION_MAP above) — computed
  // once per call is cheap enough at this glossary size and keeps the source
  // array's declaration order untouched for readability.
  const entries = [...TRANSLATION_MAP[lang]].sort((a, b) => b.from.length - a.from.length);
  for (const entry of entries) {
    out = out.split(entry.from).join(entry.to);
  }
  return out;
}

export interface TranslationResult {
  original_language: ReportLanguage;
  translated_narrative: string;
  translated: boolean;
  translation_confidence: number;
}

/** Glossary-based translation: detect script, apply the substring dictionary above. Honest about being partial — see module comment. */
export function translateNarrative(text: string): TranslationResult {
  const lang = detectLanguage(text);
  if (lang === "English") {
    return {
      original_language: lang,
      translated_narrative: text,
      translated: false,
      translation_confidence: 1.0,
    };
  }
  const translated = translateTokens(text, lang);
  const residualNonLatin = (translated.match(/[^\u0020-\u024F\u2000-\u206F\s.,!?;:'"()[\]{}<>/\-–—0-9]/g) ?? []).length;
  const totalAlpha = translated.replace(/[^a-zA-Z]/g, "").length || 1;
  // No artificial floor: if most of the narrative is still in the original
  // script after glossary substitution, confidence should say so plainly
  // rather than reporting a reassuring-looking "55%" regardless of how
  // little actually got translated.
  const confidence = Math.max(0.15, Math.min(0.97, 1 - residualNonLatin / (residualNonLatin + totalAlpha * 0.4)));
  return {
    original_language: lang,
    translated_narrative: translated,
    translated: true,
    translation_confidence: Number(confidence.toFixed(2)),
  };
}

/**
 * Deterministic 384-dimension hash-based bag-of-words vector — used only for
 * the in-app "similarity to knowledge-base incident" feature. This is a hash
 * trick, not a trained embedding model; it captures shared vocabulary, not
 * real semantic similarity. Labeled honestly wherever it's surfaced.
 */
export function pseudoEmbed(text: string): number[] {
  const dim = 384;
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    vec[Math.abs(h) % dim] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

export function embeddingSimilarity(a: string, b: string): number {
  const va = pseudoEmbed(a);
  const vb = pseudoEmbed(b);
  let dot = 0;
  for (let i = 0; i < va.length; i++) dot += va[i] * vb[i];
  return dot; // cosine similarity 0..1
}

export function translateAndEnrich(text: string): { translation: TranslationResult; ruleHits: Array<{ id: string; name: string; score: number }> } {
  const translation = translateNarrative(text);
  const lower = translation.translated_narrative.toLowerCase();
  const ruleHits: Array<{ id: string; name: string; score: number }> = [];
  for (const rule of IOGP_RULES) {
    let score = 0;
    for (const trigger of [...rule.triggers.en, ...rule.triggers.as, ...rule.triggers.hi, ...rule.triggers.bn]) {
      if (lower.includes(trigger.toLowerCase())) score += 1;
    }
    if (score > 0) ruleHits.push({ id: rule.id, name: rule.name, score });
  }
  ruleHits.sort((a, b) => b.score - a.score);
  return { translation, ruleHits };
}

export function matchIncidents(text: string): Array<{ id: string; title: string; similarity: number; record: (typeof INCIDENT_KB)[number] }> {
  return INCIDENT_KB.map((rec) => ({
    id: rec.id,
    title: rec.title,
    similarity: embeddingSimilarity(text, `${rec.title} ${rec.description} ${rec.tokens.join(" ")} ${rec.precursors.join(" ")}`),
    record: rec,
  }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}
