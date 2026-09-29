/**
 * IOGP LIFE-SAVING RULES (Edition 2020) — REGISTRY
 * Edition 2020: 9 rules + 3 focus areas. Mapped to OIL assets:
 * Duliajan, Digboi, Baghjan, Moran, Kakinada Offshore, Downstream E&P.
 */

export interface IogpRule {
  id: string;
  name: string;
  focusArea: boolean;
  color: string; // HUD hex token
  /** Multilingual trigger vocabulary, weighted by detection strength */
  triggers: { en: string[]; as: string[]; hi: string[]; bn: string[] };
}

export const IOGP_RULES: IogpRule[] = [
  {
    id: "R1",
    name: "Energy Isolation / LOTO",
    focusArea: false,
    color: "#2563EB",
    triggers: {
      en: ["isolation", "lockout", "loto", "isolate", "tag out", "live line", "charged line", "energy source", "electrical panel", "spading", "blinding"],
      as: ["বিচ্ছিন্ন", "লক আউট", "বৈদ্যুতিক"],
      hi: ["आइसोलेशन", "लॉक आउट", "लोटो", "बिजली", "करंट", "स्विच बंद"],
      bn: ["আইসোলেশন", "লক আউট", "বিদ্যুৎ", "কারেন্ট"],
    },
  },
  {
    id: "R2",
    name: "Hot Work",
    focusArea: false,
    color: "#D97706",
    triggers: {
      en: ["hot work", "welding", "weld", "grinding", "grinder", "cutting", "gas cutting", "flame", "spark", "torching", "soldering"],
      as: ["ৱেল্ডিং", "গ্ৰাইণ্ডিং", "কাটিং"],
      hi: ["वेल्डिंग", "ग्राइंडिंग", "कटिंग", "गैस कटिंग", "फ्लेम"],
      bn: ["ওয়েল্ডিং", "গ্রাইন্ডিং", "কাটিং", "গ্যাস কাটিং"],
    },
  },
  {
    id: "R3",
    name: "Confined Space Entry",
    focusArea: false,
    color: "#DC2626",
    triggers: {
      en: ["confined space", "vessel entry", "tank entry", "pit entry", "sump", "manhole", "oxygen level", "gas test", "gas testing", "permit to enter", "inside tank", "sewer entry"],
      as: ["বন্ধ স্থান", "টেংকৰ ভিতৰত"],
      hi: ["कॉन्फाइंड स्पेस", "टंकी के अंदर", "मैनहोल", "गैस टेस्ट", "ऑक्सीजन"],
      bn: ["কনফাইন্ড স্পেস", "ট্যাংকের ভিতরে", "ম্যানহোল", "গ্যাস টেস্ট"],
    },
  },
  {
    id: "R4",
    name: "Line of Fire",
    focusArea: false,
    color: "#DC2626",
    triggers: {
      en: ["line of fire", "struck by", "pinch point", "crushed", "stored energy", "under suspended load", "suspended load", "falling object", "dropped object", "in front of", "behind vehicle", "swing radius"],
      as: ["লাইন অৱ ফায়াৰ"],
      hi: ["लाइन ऑफ फायर", "नीचे से गुजरना", "लटके हुए भार", "गिरने वाली", "पिच पॉइंट"],
      bn: ["লাইন অফ ফায়ার", "ঝুলন্ত ভার", "পড়ে যাওয়া"],
    },
  },
  {
    id: "R5",
    name: "Working at Height",
    focusArea: false,
    color: "#D97706",
    triggers: {
      en: ["working at height", "height work", "ladder", "scaffold", "scaffolding", "full body harness", "harness", "fall arrest", "roof work", "platform", "unprotected edge"],
      as: ["উচ্চতাত কাম", "মই"],
      hi: ["ऊंचाई पर काम", "सीढ़ी", "स्कैफोल्ड", "हार्नेस", "गिरना"],
      bn: ["উচ্চতায় কাজ", "সিঁড়ি", "স্ক্যাফোল্ড", "হারনেস"],
    },
  },
  {
    id: "R6",
    name: "Safe Driving / Journey Management",
    focusArea: false,
    color: "#16A34A",
    triggers: {
      en: ["driving", "driver", "speed", "overspeed", "speeding", "seat belt", "seatbelt", "journey management", "convoy", "night driving", "fatigue", "reversing vehicle", "vehicle movement"],
      as: ["গাড়ী চলাচল", "ড্ৰাইভাৰ"],
      hi: ["ड्राइविंग", "स्पीड", "गति सीमा", "सीट बेल्ट", "यात्रा प्रबंधन", "ड्राइवर"],
      bn: ["ড্রাইভিং", "স্পিড", "সিট বেল্ট", "ড্রাইভার"],
    },
  },
  {
    id: "R7",
    name: "Safe Mechanical Lifting",
    focusArea: false,
    color: "#2563EB",
    triggers: {
      en: ["lifting", "crane", "lift plan", "rigging", "rigger", "hoist", "winch", "slings", "load chart", "tandem lift", "lifting operation", "chain block"],
      as: ["উত্তোলন", "ক্ৰেইন"],
      hi: ["लिफ्टिंग", "क्रेन", "रिगिंग", "उठाना", "स्लिंग"],
      bn: ["লিফটিং", "ক্রেন", "রিগিং", "স্লিং"],
    },
  },
  {
    id: "R8",
    name: "Bypassing Safety Controls",
    focusArea: false,
    color: "#DC2626",
    triggers: {
      en: ["bypass", "bypassed", "override", "safety valve", "alarm disabled", "disabled alarm", "tripped", "interlock", "relief valve", "psv", "gagging", "defeated"],
      as: ["নিৰাপত্তা বাইপাছ"],
      hi: ["बायपास", "सेफ्टी बाईपास", "अलार्म बंद", "इंटरलॉक", "वाल्व"],
      bn: ["বাইপাস", "অ্যালার্ম বন্ধ", "ইন্টারলক"],
    },
  },
  {
    id: "R9",
    name: "Asset Integrity & Line of Containment",
    focusArea: false,
    color: "#D97706",
    triggers: {
      en: ["leak", "leakage", "corrosion", "pipeline", "line rupture", "flange", "gasket", "hydrocarbon release", "hydrocarbon leak", "containment", "drip", "seepage", "crack", "weld defect", "thinning"],
      as: ["লিক", "পাইপলাইন", "ক্ষয়"],
      hi: ["लीक", "रिसाव", "पाइपलाइन", "क्षरण", "क्रोडिंग", "फ्लैंज", "टूटी"],
      bn: ["লিক", "ফুটো", "পাইপলাইন", "ক্ষয়", "ফ্ল্যাঞ্জ"],
    },
  },
  {
    id: "F1",
    name: "Well Control / Barrier Management",
    focusArea: true,
    color: "#DC2626",
    triggers: {
      en: ["well control", "blowout", "bop", "blowout preventer", "kick", "drilling fluid", "mud weight", "well kill", "wellhead", "well barrier", "pressure surge", "flow line", "flare", "gas release at wellhead", "open hole"],
      as: ["কুঁৱা নিয়ন্ত্ৰণ", "ব্লোআউট", "বিস্ফোৰণ"],
      hi: ["वेल कंट्रोल", "ब्लोआउट", "बीओपी", "किक", "कुआं", "वेलहेड", "प्रेशर"],
      bn: ["ওয়েল কন্ট্রোল", "ব্লোআউট", "কিক", "কুয়া", "ওয়েলহেড"],
    },
  },
  {
    id: "F2",
    name: "Marine Operations",
    focusArea: true,
    color: "#2563EB",
    triggers: {
      en: ["marine", "offshore vessel", "boat landing", "deck operations", "transfer at sea", "crew transfer", "mooring", "towing", "berthing", "jetty operations", "gangway"],
      as: ["নৌ কাৰ্যক্রম"],
      hi: ["मरीन", "समुद्री", "जहाज", "टोइंग"],
      bn: ["মেরিন", "সমুদ্র", "জাহাজ"],
    },
  },
  {
    id: "F3",
    name: "Permit to Work / Toolbox Talk",
    focusArea: true,
    color: "#16A34A",
    triggers: {
      en: ["permit to work", "ptw", "work permit", "toolbox talk", "tbt", "jsa", "job safety analysis", "gas test not done", "no permit", "permit violated", "work started without", "cold work permit", "excavation permit"],
      as: ["অনুমতি পত্ৰ", "টুলবক্স মিটিং"],
      hi: ["परमिट", "वर्क परमिट", "टूलबॉक्स टॉक", "अनुमति", "बिना परमिट"],
      bn: ["পারমিট", "ওয়ার্ক পারমিট", "টুলবক্স টক", "অনুমতি ছাড়া"],
    },
  },
];

/** Alternative short display labels for HUD chips */
export const IOGP_SHORT: Record<string, string> = {
  R1: "LOTO",
  R2: "Hot Work",
  R3: "Confined Space",
  R4: "Line of Fire",
  R5: "Work at Height",
  R6: "Safe Driving",
  R7: "Mech. Lifting",
  R8: "Bypass Controls",
  R9: "Asset Integrity",
  F1: "Well Control",
  F2: "Marine Ops",
  F3: "PTW / TBT",
};

export function ruleNameToId(name: string): string | null {
  return IOGP_RULES.find((r) => r.name === name)?.id ?? null;
}
