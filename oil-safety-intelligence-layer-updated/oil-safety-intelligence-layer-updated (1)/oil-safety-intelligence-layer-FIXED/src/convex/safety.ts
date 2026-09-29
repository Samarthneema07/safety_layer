import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assessReport } from "./engine/assess";
import { detectLanguage, embeddingSimilarity, translateAndEnrich } from "./engine/language";
import { llmAssist } from "./engine/llm";
import { assessNarrativeQuality } from "./engine/quality";
import { INCIDENT_KB } from "./engine/incidents";
import { IOGP_RULES } from "./engine/iogp";
import { BARRIERS } from "./engine/barriers";
import type { EngineStatus } from "./engine/types";
import { evaluateEngine } from "./engine/eval";
import { replayIncident, listReplayScenarios as listReplayScenariosData, REPLAY_SCENARIOS } from "./engine/replay";

export const OIL_ASSETS = [
  "Duliajan",
  "Digboi",
  "Baghjan",
  "Moran",
  "Kakinada Offshore",
  "Downstream E&P (Numaligarh/Jorhat)",
] as const;

export const ASSET_COORDS: Record<string, { x: number; y: number }> = {
  Duliajan: { x: 27.5, y: 55 },
  Digboi: { x: 30, y: 58 },
  Baghjan: { x: 33, y: 60 },
  Moran: { x: 25, y: 53 },
  "Kakinada Offshore": { x: 78, y: 82 },
  "Downstream E&P (Numaligarh/Jorhat)": { x: 20, y: 48 },
};

/** Live engine status for the HUD top strip. Always discloses the real analysis mode — never claims a model that isn't configured. */
export const getEngineStatus = query({
  args: {},
  handler: async (ctx): Promise<EngineStatus> => {
    const count = await ctx.db.query("safetyReports").collect();
    const llmConfigured = !!process.env.ANTHROPIC_API_KEY;
    return {
      engine: "OIL-SIF TRIAGE ENGINE v3.0",
      status: "ONLINE",
      triage_mode: "REAL-TIME / ZERO-BATCH",
      analysis_mode: llmConfigured ? "LLM_AUGMENTED" : "RULE_BASED",
      engine_summary: llmConfigured
        ? `Deterministic rule engine + LLM cross-check (${process.env.ANTHROPIC_MODEL || "Claude"})`
        : "Deterministic rule engine (no external AI model configured)",
      knowledge_base: { incidents: Math.max(INCIDENT_KB.length, count.length > 0 ? count.length : 0), regions: Object.keys(ASSET_COORDS) },
      last_synced_utc: new Date().toISOString(),
    };
  },
});

/** Full assessment pipeline — runs the engine synchronously (real-time triage). */
export const assess = action({
  args: {
    reporterName: v.string(),
    incidentType: v.string(),
    location: v.string(),
    incidentDateTime: v.string(),
    narrative: v.string(),
    asset: v.string(),
    persist: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Reports are attributed (reporterName is mandatory) and viewed only from
    // the authenticated dashboard, so submission requires a signed-in user too
    // — this is the server-side gate; the frontend route guard alone isn't enough.
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required. Please sign in to submit a safety report.");
    }

    // Server-side guardrail — mirrors the client-side mandatory-field check so a
    // report can never be persisted with missing or trivially short content,
    // even if a caller bypasses the UI.
    if (
      !args.reporterName.trim() ||
      !args.incidentType.trim() ||
      !args.location.trim() ||
      !args.incidentDateTime.trim() ||
      args.narrative.trim().length < 30 ||
      args.narrative.trim().split(/\s+/).filter(Boolean).length < 6
    ) {
      throw new Error(
        "Report rejected: reporter name, incident type, location, date/time and a narrative of at least 30 characters (6+ words) are required."
      );
    }

    // Deterministic garbage filter — always runs, regardless of whether an LLM is configured.
    const quality = assessNarrativeQuality(args.narrative);
    if (quality.garbage) {
      throw new Error(`Report rejected: ${quality.reason}`);
    }

    // Optional LLM cross-check — no-ops to { used: false } if no key is configured
    // or the call fails for any reason, so this can never block a legitimate report.
    const llm = await llmAssist(args.narrative, args.asset);
    if (llm.used && llm.quality?.garbage) {
      throw new Error(`Report rejected: ${llm.quality.reason ?? "the AI cross-check flagged this narrative as not a genuine incident report."}`);
    }

    const result = assessReport({ narrative: args.narrative, asset: args.asset }, llm);

    if (args.persist !== false) {
      await ctx.runMutation(internal.safety.persistAssessment, {
        userId,
        reporterName: args.reporterName,
        incidentType: args.incidentType,
        location: args.location,
        incidentDateTime: args.incidentDateTime,
        narrative: args.narrative,
        asset: args.asset,
        result,
      });
    }
    return result;
  },
});

/** Translate + language detect preview only (no persistence). */
export const translatePreview = action({
  args: { narrative: v.string() },
  handler: async (_ctx, args) => {
    const lang = detectLanguage(args.narrative);
    const { translation, ruleHits } = translateAndEnrich(args.narrative);
    return { detected: lang, translation, ruleHits };
  },
});

/** Internal-only — never exposed to clients directly; always called from within `assess` after validation. */
export const persistAssessment = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    reporterName: v.string(),
    incidentType: v.string(),
    location: v.string(),
    incidentDateTime: v.string(),
    narrative: v.string(),
    asset: v.string(),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const r = args.result;
    return await ctx.db.insert("safetyReports", {
      reporterName: args.reporterName,
      incidentType: args.incidentType,
      location: args.location,
      incidentDateTime: args.incidentDateTime,
      narrative: args.narrative,
      asset: args.asset,
      originalLanguage: r.report_metadata.original_language,
      originalText: r.report_metadata.original_text,
      translatedNarrative: r.report_metadata.translated_narrative,
      translated: r.report_metadata.translated,
      translationConfidence: r.report_metadata.translation_confidence,
      analysisMode: r.report_metadata.analysis_mode,
      aiDisclosure: r.report_metadata.ai_disclosure,
      sifLabel: r.sif_classification.label,
      sifConfidence: r.sif_classification.confidence,
      riskLevel: r.sif_classification.risk_level,
      iogpPrimary: r.iogp_rule_mapping.primary,
      iogpSecondary: r.iogp_rule_mapping.secondary,
      barrierName: r.failing_barrier_analysis.barrier_name,
      rootCause: r.failing_barrier_analysis.root_cause,
      rootCauseCategory: r.failing_barrier_analysis.root_cause_category,
      precursorMatch: r.failing_barrier_analysis.precursor_match,
      precursorDensity: r.failing_barrier_analysis.precursor_density,
      referenceIncident: r.failing_barrier_analysis.reference_incident,
      oisdReference: r.failing_barrier_analysis.oisd_reference,
      immediateAction: r.actionable_recommendations[0].immediate_corrective_action,
      longTermFix: r.actionable_recommendations[0].long_term_fix,
      triageLatencyMs: r.report_metadata.triage_latency_ms,
      createdAt: Date.now(),
      createdBy: args.userId,
    });
  },
});

export interface ReportRow {
  _id: string;
  reporterName: string;
  incidentType: string;
  location: string;
  incidentDateTime: string;
  narrative: string;
  originalText: string;
  translatedNarrative: string;
  originalLanguage: string;
  asset: string;
  analysisMode: string;
  aiDisclosure: string;
  sifLabel: string;
  sifConfidence: number;
  riskLevel: string;
  iogpPrimary: string;
  iogpSecondary: string[];
  barrierName: string;
  rootCause: string;
  rootCauseCategory: string;
  precursorDensity: number;
  referenceIncident: string;
  oisdReference: string;
  immediateAction: string;
  longTermFix: string;
  triageLatencyMs: number;
  createdAt: number;
}

/** Live feed of triaged reports for the dashboard. Requires sign-in — report narratives and locations are operational data, not public. */
export const listReports = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ReportRow[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required.");
    const rows = await ctx.db
      .query("safetyReports")
      .withIndex("by_created_at")
      .order("desc")
      .take(args.limit ?? 50);
    return rows.map((r) => ({
      _id: r._id,
      reporterName: r.reporterName,
      incidentType: r.incidentType,
      location: r.location,
      incidentDateTime: r.incidentDateTime,
      narrative: r.narrative,
      originalText: r.originalText,
      translatedNarrative: r.translatedNarrative,
      originalLanguage: r.originalLanguage,
      asset: r.asset,
      analysisMode: r.analysisMode,
      aiDisclosure: r.aiDisclosure,
      sifLabel: r.sifLabel,
      sifConfidence: r.sifConfidence,
      riskLevel: r.riskLevel,
      iogpPrimary: r.iogpPrimary,
      iogpSecondary: r.iogpSecondary,
      barrierName: r.barrierName,
      rootCause: r.rootCause,
      rootCauseCategory: r.rootCauseCategory,
      precursorDensity: r.precursorDensity,
      referenceIncident: r.referenceIncident,
      oisdReference: r.oisdReference,
      immediateAction: r.immediateAction,
      longTermFix: r.longTermFix,
      triageLatencyMs: r.triageLatencyMs,
      createdAt: r.createdAt,
    }));
  },
});

export interface DashboardStats {
  totalReports: number;
  sifCount: number;
  sifDensity: number;
  avgLatencyMs: number;
  dominantBarrier: string;
  dominantBarrierCount: number;
  topIogpRule: string;
  topIogpCount: number;
  criticalAssets: Array<{ asset: string; score: number; sifCount: number; total: number }>;
  barrierDensity: Array<{ barrier: string; density: number; count: number; oisd: string }>;
  ruleDistribution: Array<{ rule: string; count: number; color: string }>;
  riskDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  recentCritical: Array<ReportRow>;
}

/** Aggregated analytics powering metric cards, heatmap and barrier panels. Requires sign-in. */
export const getStats = query({
  args: {},
  handler: async (ctx): Promise<DashboardStats> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required.");
    const rows = await ctx.db.query("safetyReports").collect();
    const total = rows.length;
    const sifRows = rows.filter((r) => r.sifLabel === "SIF-POTENTIAL");
    const sifDensity = total ? sifRows.length / total : 0;
    const avgLatency = total ? rows.reduce((s, r) => s + r.triageLatencyMs, 0) / total : 0;

    const barrierCount = new Map<string, number>();
    const barrierDensitySum = new Map<string, number>();
    const ruleCount = new Map<string, number>();
    const riskDist: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const langDist: Record<string, number> = {};

    for (const r of rows) {
      barrierCount.set(r.barrierName, (barrierCount.get(r.barrierName) ?? 0) + 1);
      barrierDensitySum.set(r.barrierName, (barrierDensitySum.get(r.barrierName) ?? 0) + r.precursorDensity);
      ruleCount.set(r.iogpPrimary, (ruleCount.get(r.iogpPrimary) ?? 0) + 1);
      riskDist[r.riskLevel] = (riskDist[r.riskLevel] ?? 0) + 1;
      langDist[r.originalLanguage] = (langDist[r.originalLanguage] ?? 0) + 1;
    }

    let dominantBarrier = "—";
    let dominantBarrierCount = 0;
    for (const [b, c] of barrierCount) {
      if (c > dominantBarrierCount) {
        dominantBarrier = b;
        dominantBarrierCount = c;
      }
    }

    let topRule = "—";
    let topRuleCount = 0;
    for (const [rule, c] of ruleCount) {
      if (c > topRuleCount) {
        topRule = rule;
        topRuleCount = c;
      }
    }

    const criticalAssets = OIL_ASSETS.map((asset) => {
      const assetRows = rows.filter((r) => r.asset === asset);
      const sifN = assetRows.filter((r) => r.sifLabel === "SIF-POTENTIAL").length;
      const riskWeights: Record<string, number> = { CRITICAL: 1, HIGH: 0.7, MEDIUM: 0.4, LOW: 0.15 };
      const score = assetRows.length
        ? Math.min(
            99,
            Math.round(
              (assetRows.reduce((s, r) => s + (riskWeights[r.riskLevel] ?? 0.2), 0) / assetRows.length) * 70 +
                (assetRows.length ? (sifN / assetRows.length) * 30 : 0) +
                Math.min(15, assetRows.length * 1.5),
            ),
          )
        : 0;
      return { asset, score, sifCount: sifN, total: assetRows.length };
    }).sort((a, b) => b.score - a.score);

    const barrierDensity = [...barrierCount.entries()]
      .map(([barrier, count]) => ({
        barrier,
        count,
        density: Math.round(((barrierDensitySum.get(barrier) ?? 0) / count) * 100),
        oisd: BARRIERS.find((b) => b.name === barrier)?.oisd ?? "—",
      }))
      .sort((a, b) => b.density - a.density);

    const ruleDistribution = [...ruleCount.entries()]
      .map(([rule, count]) => ({
        rule,
        count,
        color: IOGP_RULES.find((r) => r.name === rule)?.color ?? "#2563EB",
      }))
      .sort((a, b) => b.count - a.count);

    const recentCritical = rows
      .filter((r) => r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((r) => ({
        _id: r._id,
        reporterName: r.reporterName,
        incidentType: r.incidentType,
        location: r.location,
        incidentDateTime: r.incidentDateTime,
        narrative: r.narrative,
        originalText: r.originalText,
        translatedNarrative: r.translatedNarrative,
        originalLanguage: r.originalLanguage,
        asset: r.asset,
        analysisMode: r.analysisMode,
        aiDisclosure: r.aiDisclosure,
        sifLabel: r.sifLabel,
        sifConfidence: r.sifConfidence,
        riskLevel: r.riskLevel,
        iogpPrimary: r.iogpPrimary,
        iogpSecondary: r.iogpSecondary,
        barrierName: r.barrierName,
        rootCause: r.rootCause,
        rootCauseCategory: r.rootCauseCategory,
        precursorDensity: r.precursorDensity,
        referenceIncident: r.referenceIncident,
        oisdReference: r.oisdReference,
        immediateAction: r.immediateAction,
        longTermFix: r.longTermFix,
        triageLatencyMs: r.triageLatencyMs,
        createdAt: r.createdAt,
      }));

    return {
      totalReports: total,
      sifCount: sifRows.length,
      sifDensity: Math.round(sifDensity * 100),
      avgLatencyMs: Math.round(avgLatency),
      dominantBarrier,
      dominantBarrierCount,
      topIogpRule: topRule,
      topIogpCount: topRuleCount,
      criticalAssets,
      barrierDensity,
      ruleDistribution,
      riskDistribution: riskDist,
      languageDistribution: langDist,
      recentCritical,
    };
  },
});

/** Permanent Indian HSSE dataset browser rows. */
export const listKbIncidents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("kbIncidents").withIndex("by_kbId").collect();
  },
});

/** Seed the permanent KB once. Idempotent. */
export const seedKb = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("kbIncidents").collect();
    if (existing.length >= INCIDENT_KB.length) return { seeded: false, count: existing.length };
    for (const inc of INCIDENT_KB) {
      const found = existing.find((e) => e.kbId === inc.id);
      if (found) continue;
      await ctx.db.insert("kbIncidents", {
        kbId: inc.id,
        title: inc.title,
        assetRegion: inc.asset_region,
        date: inc.date,
        type: inc.type,
        severity: inc.severity,
        fatalities: inc.fatalities,
        injuries: inc.injuries,
        iogpRule: inc.iogp_rule,
        failingBarrier: inc.failing_barrier,
        precursors: inc.precursors,
        rootCause: inc.root_cause,
        description: inc.description,
        operatorCompany: inc.operator_company,
        sector: inc.sector,
        onshoreOffshore: inc.onshore_offshore,
        correctiveAction: inc.corrective_action,
        regulatoryRef: inc.regulatory_ref,
      });
    }
    return { seeded: true, count: INCIDENT_KB.length };
  },
});

const DEMO_FEED = [
  {
    narrative:
      "ৱৰ্কঅভাৰৰ সময়ত কুঁৱাৰ পৰা গেছ লিক ধৰা পৰিছে। safety valve bypass কৰা হৈছিল আৰু গেছ টেস্ট কৰা হোৱা নাছিল। কিন্তু এতিয়াও চাপ বেছি, wellheadৰ কাষত কাম চলি আছে।",
    asset: "Baghjan",
  },
  {
    narrative:
      "Fitter opened 415V electrical panel without LOTO isolation to replace contactor. Only single point isolation was applied on a parallel feed, no zero energy verification, residual hydrocarbon transfer line not depressurized.",
    asset: "Duliajan",
  },
  {
    narrative:
      "Crane slew started while rigger stood inside swing radius guiding suspended load. Tagline not used, wind speed above lift plan limit, exclusion zone barricade removed. Rigger suffered crush injury to leg.",
    asset: "Moran",
  },
  {
    narrative:
      "Crew transfer to wellhead platform continued despite sea state above transfer limit matrix. Lifejacket not fastened, gangway heave margin zero, comms failure between coxswain and deck supervisor during man overboard near miss.",
    asset: "Kakinada Offshore",
  },
  {
    narrative:
      "टंकी के अंदर प्रवेश बिना परमिट और गैस टेस्ट के किया गया। ऑक्सीजन नहीं जांची गई, मैनहोल पर attendant नहीं था और rescue tripod तैयार नहीं था।",
    asset: "Digboi",
  },
  {
    narrative:
      "H2S release during pigging operation at oil collecting station. Fixed gas detector not calibrated, personal monitor not carried by crew, wind direction changed toward muster point. Six operators exposed, ESD actuated late.",
    asset: "Digboi",
  },
];

/** One-click demo feed: assesses a representative multilingual set and persists results. */
export const seedDemoFeed = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required to seed the demo feed.");
    }
    let count = 0;
    for (const demo of DEMO_FEED) {
      const quality = assessNarrativeQuality(demo.narrative);
      if (quality.garbage) continue; // defensive — the curated demo set should never trip this
      const llm = await llmAssist(demo.narrative, demo.asset);
      const result = assessReport({ narrative: demo.narrative, asset: demo.asset }, llm);
      await ctx.runMutation(internal.safety.persistAssessment, {
        userId,
        reporterName: "Demo Feed Seeder",
        incidentType: "Near Miss",
        location: demo.asset,
        incidentDateTime: new Date().toISOString().slice(0, 16),
        narrative: demo.narrative,
        asset: demo.asset,
        result,
      });
      count += 1;
    }
    return { ingested: count };
  },
});

/** Similarity search against the in-memory KB — used by dataset browser. */
export const searchKb = action({
  args: { text: v.string() },
  handler: async (_ctx, args) => {
    return INCIDENT_KB.map((rec) => ({
      id: rec.id,
      title: rec.title,
      asset_region: rec.asset_region,
      date: rec.date,
      type: rec.type,
      severity: rec.severity,
      fatalities: rec.fatalities,
      injuries: rec.injuries,
      iogp_rule: rec.iogp_rule,
      failing_barrier: rec.failing_barrier,
      precursors: rec.precursors,
      root_cause: rec.root_cause,
      description: rec.description,
      operator_company: rec.operator_company,
      corrective_action: rec.corrective_action,
      regulatory_ref: rec.regulatory_ref,
      similarity: Number(embeddingSimilarity(args.text, `${rec.title} ${rec.description} ${rec.tokens.join(" ")}`).toFixed(3)),
    })).sort((a, b) => b.similarity - a.similarity);
  },
});

/** Barrier bow-tie catalogue with root-cause templates for the HUD panel. */
export const listBarriers = query({
  args: {},
  handler: async () => {
    return BARRIERS.map((b) => ({
      name: b.name,
      threat: b.threat,
      consequence: b.consequence,
      oisd: b.oisd,
      keywords: b.keywords.length,
    }));
  },
});

/**
 * Runs the hand-labeled benchmark (engine/eval.ts) against the deterministic
 * rule engine and returns per-field accuracy/precision/recall plus every
 * individual case's prediction vs. ground truth — no network call, always
 * available even with no LLM key configured. Public: this is model-card
 * data about the engine itself, not operational report content.
 */
export const runEvaluation = query({
  args: {},
  handler: async () => {
    return evaluateEngine();
  },
});

/** Catalogue of archived Indian O&G disasters available for precursor replay. */
export const listReplayScenarios = query({
  args: {},
  handler: async () => {
    return listReplayScenariosData();
  },
});

/**
 * Re-runs one archived disaster's own precursor chain through the live
 * triage pipeline (optionally with the LLM cross-check, if a key is
 * configured) to show what the engine would have flagged before the
 * escalation actually happened. Not persisted — this never touches
 * `safetyReports`, and carries no authentication requirement since it only
 * replays already-public historical archive data, never a live submission.
 */
export const runReplay = action({
  args: { kbId: v.string() },
  handler: async (_ctx, args) => {
    const scenario = REPLAY_SCENARIOS.find((s) => s.kbId === args.kbId);
    if (!scenario) throw new Error(`Unknown replay scenario: ${args.kbId}`);
    const llm = await llmAssist(scenario.precursor_narrative, scenario.asset);
    const result = replayIncident(args.kbId, llm.used ? llm : undefined);
    if (!result) throw new Error(`Unknown replay scenario: ${args.kbId}`);
    return result;
  },
});

// Internal helper kept for future per-tenant scoping
export const _reportById = internalQuery({
  args: { id: v.id("safetyReports") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});
