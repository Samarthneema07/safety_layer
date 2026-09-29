/**
 * OPTIONAL LLM CATEGORIZATION
 *
 * When no API key is configured, the SIF engine (engine/assess.ts) falls
 * back to a deterministic, fully explainable keyword/pattern system — that
 * is disclosed honestly in every report, never hidden behind a fake model
 * name. When a key *is* configured, this module asks the model to actually
 * read and understand the narrative — semantics, negation, context — and
 * produce the full categorization itself:
 *   1. SIF potential + confidence, reasoned from what happened, not from
 *      which trigger words appear
 *   2. which IOGP Life-Saving Rule and which failing safety barrier the
 *      narrative describes, chosen from the plant's closed vocabulary
 *      (never invented) but selected by comprehension of the narrative
 *      rather than a substring match
 *   3. a root-cause category and explanation, and the closest analogue
 *      from the permanent Indian HSSE incident knowledge base
 *   4. a real translation of non-English narratives (the deterministic
 *      glossary translation still runs too, so nothing breaks if this is
 *      unavailable)
 *   5. a coherence/quality opinion, to catch garbage narratives the
 *      lightweight heuristic in engine/quality.ts might miss
 *
 * Enable it by setting ANTHROPIC_API_KEY on the Convex deployment
 * (`npx convex env set ANTHROPIC_API_KEY sk-ant-...`). Without a key, this
 * function returns `{ used: false }` immediately and the app runs in plain
 * rule-based mode — clearly labeled as such in the UI. Every failure mode
 * (missing key, network error, malformed response, or a response that
 * names something outside the plant's closed vocabulary) degrades that
 * specific field back to the rule engine's answer rather than throwing —
 * the LLM is a bonus signal, never a point of failure for report submission.
 */

import { IOGP_RULES } from "./iogp";
import { BARRIERS } from "./barriers";
import { INCIDENT_KB } from "./incidents";
import type { SifLabel } from "./types";

export type RootCauseCategory = "Human Factor" | "System / Process" | "Asset Integrity" | "Environmental";
const ROOT_CAUSE_CATEGORIES: RootCauseCategory[] = ["Human Factor", "System / Process", "Asset Integrity", "Environmental"];

export interface LlmCategorization {
  iogp_primary: string;
  iogp_secondary: string[];
  barrier_name: string;
  root_cause: string;
  root_cause_category: RootCauseCategory;
  reference_incident_id: string | null;
  precursor_density: number; // 0..1, the model's own estimate of how closely this matches the reference incident
  immediate_corrective_action: string;
  long_term_fix: string;
}

export interface LlmAssistResult {
  used: boolean;
  model?: string;
  detected_language?: string;
  translated_narrative?: string;
  sif_opinion?: { label: SifLabel; confidence: number; reasoning: string };
  categorization?: LlmCategorization;
  quality?: { garbage: boolean; reason?: string };
  error?: string;
}

interface LlmJsonShape {
  detected_language?: string;
  translated_narrative?: string;
  sif_label?: string;
  sif_confidence?: number;
  sif_reasoning?: string;
  iogp_primary?: string;
  iogp_secondary?: string[];
  barrier_name?: string;
  root_cause?: string;
  root_cause_category?: string;
  reference_incident_id?: string;
  precursor_density?: number;
  immediate_corrective_action?: string;
  long_term_fix?: string;
  is_garbage?: boolean;
  garbage_reason?: string;
}

const IOGP_NAMES = IOGP_RULES.map((r) => r.name);
const BARRIER_NAMES = BARRIERS.map((b) => b.name);
const KB_SUMMARY = INCIDENT_KB.map(
  (rec) => `${rec.id} | ${rec.title} | ${rec.asset_region} | precursors: ${rec.precursors.slice(0, 4).join(", ")}`
).join("\n");

function buildPrompt(narrative: string, asset: string): string {
  return `You are an expert HSSE (Health, Safety, Security, Environment) analyst for an Indian oil & gas operator. You are given ONE field safety narrative, possibly in Assamese, Hindi, Bengali, or English, sometimes mixed. Read it for what actually happened — do not pattern-match on isolated words; consider context, negation ("harness was NOT worn" vs "harness was worn"), and what energy sources and controls are actually implicated.

Asset: ${asset}
Narrative (as submitted by a field supervisor): """${narrative}"""

You must choose iogp_primary and barrier_name ONLY from these closed vocabularies — never invent a name outside these lists:

IOGP Life-Saving Rules (choose exactly one for iogp_primary, up to 3 more distinct ones for iogp_secondary):
${IOGP_NAMES.map((n) => `- ${n}`).join("\n")}

Safety barriers (choose exactly one for barrier_name — the specific barrier that failed or was challenged in this narrative):
${BARRIER_NAMES.map((n) => `- ${n}`).join("\n")}

Permanent Indian O&G incident knowledge base (choose the single closest analogue by id for reference_incident_id, or null if none are meaningfully similar):
${KB_SUMMARY}

Return ONLY a single JSON object, no prose, no markdown fences, with exactly these keys:
{
  "detected_language": "English" | "Hindi" | "Bengali" | "Assamese" | "Other",
  "translated_narrative": "<faithful English translation; if already English, repeat it verbatim>",
  "sif_label": "SIF-POTENTIAL" | "NON-SIF",
  "sif_confidence": <number 0 to 1>,
  "sif_reasoning": "<one or two sentences citing the specific energy source / precursor you relied on>",
  "iogp_primary": "<exact name from the IOGP list above>",
  "iogp_secondary": ["<0 to 3 more exact names from the IOGP list above, distinct from iogp_primary>"],
  "barrier_name": "<exact name from the barrier list above>",
  "root_cause_category": "Human Factor" | "System / Process" | "Asset Integrity" | "Environmental",
  "root_cause": "<2-3 sentences explaining, in your own words, why this barrier failed here — cite what the narrative actually says>",
  "reference_incident_id": "<exact id from the knowledge base above, or null>",
  "precursor_density": <number 0 to 1 — how closely this narrative's precursors match the reference incident's precursors; 0 if reference_incident_id is null>,
  "immediate_corrective_action": "<1-2 concrete sentences of what should happen right now>",
  "long_term_fix": "<1-2 concrete sentences of a systemic fix>",
  "is_garbage": <true if this is NOT a real safety narrative — e.g. keyboard mashing, placeholder text, unrelated content, or too incoherent to assess>,
  "garbage_reason": "<short reason if is_garbage is true, else empty string>"
}

"SIF-POTENTIAL" means the narrative describes exposure to a serious-injury-or-fatality energy source (falls from height, struck-by, confined space, live electrical, pressure release, suspended loads, toxic atmosphere, etc.), even if no injury actually occurred. Be conservative: if in doubt between SIF-POTENTIAL and NON-SIF, prefer SIF-POTENTIAL.`;
}

function extractJson(text: string): LlmJsonShape | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as LlmJsonShape;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as LlmJsonShape;
    } catch {
      return null;
    }
  }
}

/** Builds the categorization object only from values that actually land inside the plant's closed vocabulary — anything else is dropped so assess.ts falls back to the rule engine for that field instead of persisting a hallucinated category. */
function buildCategorization(parsed: LlmJsonShape): LlmCategorization | undefined {
  const primary = IOGP_NAMES.find((n) => n === parsed.iogp_primary);
  const barrier = BARRIER_NAMES.find((n) => n === parsed.barrier_name);
  const category = ROOT_CAUSE_CATEGORIES.find((c) => c === parsed.root_cause_category);
  if (!primary || !barrier || !category || !parsed.root_cause?.trim() || !parsed.immediate_corrective_action?.trim() || !parsed.long_term_fix?.trim()) {
    return undefined;
  }
  const secondary = Array.isArray(parsed.iogp_secondary)
    ? parsed.iogp_secondary.filter((n): n is string => IOGP_NAMES.includes(n) && n !== primary).slice(0, 3)
    : [];
  const refId = parsed.reference_incident_id && INCIDENT_KB.some((r) => r.id === parsed.reference_incident_id) ? parsed.reference_incident_id : null;
  const density = typeof parsed.precursor_density === "number" ? Math.max(0, Math.min(1, parsed.precursor_density)) : 0;
  return {
    iogp_primary: primary,
    iogp_secondary: secondary,
    barrier_name: barrier,
    root_cause: parsed.root_cause.trim(),
    root_cause_category: category,
    reference_incident_id: refId,
    precursor_density: refId ? density : 0,
    immediate_corrective_action: parsed.immediate_corrective_action.trim(),
    long_term_fix: parsed.long_term_fix.trim(),
  };
}

export async function llmAssist(narrative: string, asset: string): Promise<LlmAssistResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { used: false };

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: "user", content: buildPrompt(narrative, asset) }],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return { used: false, error: `LLM cross-check unavailable (HTTP ${res.status}).` };
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");

    const parsed = extractJson(text);
    if (!parsed) return { used: false, error: "LLM cross-check returned an unparseable response." };

    const confidence = typeof parsed.sif_confidence === "number" ? Math.max(0, Math.min(1, parsed.sif_confidence)) : undefined;
    const label: SifLabel | undefined =
      parsed.sif_label === "SIF-POTENTIAL" || parsed.sif_label === "NON-SIF" ? parsed.sif_label : undefined;

    return {
      used: true,
      model,
      detected_language: parsed.detected_language,
      translated_narrative: parsed.translated_narrative,
      sif_opinion:
        label && confidence !== undefined
          ? { label, confidence, reasoning: parsed.sif_reasoning?.trim() || "No reasoning provided." }
          : undefined,
      categorization: buildCategorization(parsed),
      quality: { garbage: !!parsed.is_garbage, reason: parsed.garbage_reason?.trim() || undefined },
    };
  } catch (e) {
    return { used: false, error: e instanceof Error ? e.message : "LLM cross-check failed." };
  }
}
