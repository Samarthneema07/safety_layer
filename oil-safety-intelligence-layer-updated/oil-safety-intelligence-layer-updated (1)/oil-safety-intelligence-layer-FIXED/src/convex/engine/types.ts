/**
 * OIL SAFETY INTELLIGENCE LAYER — RESPONSE SCHEMA
 * OIL India Limited · AI Safety Intelligence Officer
 * Structured JSON contract emitted for every triaged safety report.
 */

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SifLabel = "SIF-POTENTIAL" | "NON-SIF";
export type ReportLanguage = "Assamese" | "Hindi" | "Bengali" | "English";

export interface ReportMetadata {
  report_id: string;
  original_language: ReportLanguage;
  original_text: string;
  translated_narrative: string;
  translated: boolean;
  translation_confidence: number; // 0..1
  asset: string;
  received_utc: string;
  triage_latency_ms: number;
  /** How this specific report was analyzed — always disclosed, never overstated. */
  analysis_mode: "RULE_BASED" | "LLM_AUGMENTED";
  /** Plain-language, judge/auditor-facing explanation of how the verdict was produced. */
  ai_disclosure: string;
}

export interface SifClassification {
  label: SifLabel;
  confidence: number; // 0..1
  risk_level: RiskLevel;
  reasoning: string;
}

export interface IogpRuleMapping {
  primary: string; // IOGP Life-Saving Rule (Edition 2020) name
  secondary: string[];
}

export interface FailingBarrierAnalysis {
  barrier_name: string;
  root_cause: string;
  root_cause_category: "Human Factor" | "System / Process" | "Asset Integrity" | "Environmental";
  precursor_match: string;
  precursor_density: number; // 0..1 similarity to archived Indian O&G incident
  reference_incident: string; // permanent Indian HSSE knowledge-base entry
  oisd_reference: string; // OISD standard cross-reference
}

export interface ActionableRecommendation {
  immediate_corrective_action: string;
  long_term_fix: string;
}

export interface SafetyAssessment {
  report_metadata: ReportMetadata;
  sif_classification: SifClassification;
  iogp_rule_mapping: IogpRuleMapping;
  failing_barrier_analysis: FailingBarrierAnalysis;
  actionable_recommendations: ActionableRecommendation[];
}

export interface EngineStatus {
  engine: string;
  status: "ONLINE";
  triage_mode: "REAL-TIME / ZERO-BATCH";
  /** Whether this deployment has a live LLM cross-check configured. Always honest — never claims a model that isn't wired up. */
  analysis_mode: "RULE_BASED" | "LLM_AUGMENTED";
  engine_summary: string;
  knowledge_base: { incidents: number; regions: string[] };
  last_synced_utc: string;
}
