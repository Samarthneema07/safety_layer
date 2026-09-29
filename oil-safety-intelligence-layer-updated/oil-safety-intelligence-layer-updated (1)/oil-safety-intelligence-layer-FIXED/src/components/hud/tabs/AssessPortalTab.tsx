import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Upload,
  Mic,
  FileText,
  Languages,
  Play,
  Loader2,
  Radar,
  Copy,
  Check,
  ShieldAlert,
  Wrench,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HudPanel,
  Chip,
  GlowBar,
  OIL_ASSETS,
  DEMO_PRESETS,
  RISK_COLORS,
  LANG_COLORS,
  INCIDENT_TYPES,
  NARRATIVE_MIN_CHARS,
  NARRATIVE_MIN_WORDS,
} from "@/components/hud/hud";
import { assessNarrativeQuality } from "@/convex/engine/quality";
import type { SafetyAssessment } from "@/convex/engine/types";

/* Minimal Web Speech API typings (not in TS DOM lib) */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type EngineStatus = {
  status?: string;
  triage_mode?: string;
  engine_summary?: string;
  analysis_mode?: string;
};

/** "YYYY-MM-DDTHH:mm" in local time, for defaulting the datetime-local input. */
function nowForDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type MandatoryField = "reporterName" | "incidentType" | "location" | "incidentDateTime" | "narrative";

export default function AssessPortalTab() {
  const [narrative, setNarrative] = useState("");
  const [asset, setAsset] = useState<string>(OIL_ASSETS[0]);
  const [reporterName, setReporterName] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [location, setLocation] = useState("");
  const [incidentDateTime, setIncidentDateTime] = useState(nowForDateTimeLocal());
  const [touched, setTouched] = useState<Record<MandatoryField, boolean>>({
    reporterName: false,
    incidentType: false,
    location: false,
    incidentDateTime: false,
    narrative: false,
  });
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [result, setResult] = useState<SafetyAssessment | null>(null);
  const [copied, setCopied] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [submitBlocked, setSubmitBlocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const status = useQuery(api.safety.getEngineStatus) as EngineStatus | undefined;
  const assessAction = useAction(api.safety.assess);

  const narrativeWordCount = narrative.trim().split(/\s+/).filter(Boolean).length;
  const narrativeQuality = assessNarrativeQuality(narrative);

  const errors: Partial<Record<MandatoryField, string>> = {
    reporterName: reporterName.trim() ? undefined : "Reporter name is required.",
    incidentType: incidentType ? undefined : "Select an incident type.",
    location: location.trim() ? undefined : "Location / sub-area is required.",
    incidentDateTime: incidentDateTime ? undefined : "Incident date/time is required.",
    narrative:
      narrative.trim().length < NARRATIVE_MIN_CHARS || narrativeWordCount < NARRATIVE_MIN_WORDS
        ? `Narrative must be at least ${NARRATIVE_MIN_CHARS} characters and ${NARRATIVE_MIN_WORDS} words (currently ${narrative.trim().length} chars, ${narrativeWordCount} word${narrativeWordCount === 1 ? "" : "s"}).`
        : narrativeQuality.garbage
          ? narrativeQuality.reason
          : undefined,
  };
  const isFormValid = Object.values(errors).every((e) => !e);

  const handleAssess = async () => {
    if (!isFormValid) {
      setTouched({ reporterName: true, incidentType: true, location: true, incidentDateTime: true, narrative: true });
      setSubmitBlocked(true);
      return;
    }
    setSubmitBlocked(false);
    setSubmitError(null);
    setAssessing(true);
    setResult(null);
    try {
      const r = await assessAction({
        reporterName: reporterName.trim(),
        incidentType,
        location: location.trim(),
        incidentDateTime,
        narrative,
        asset,
        persist: true,
      });
      setResult(r as SafetyAssessment);
    } catch (e) {
      console.error("Assessment failed", e);
      setSubmitError(e instanceof Error ? e.message : "Assessment failed — please try again.");
    } finally {
      setAssessing(false);
    }
  };

  const applyPreset = (p: (typeof DEMO_PRESETS)[number]) => {
    setNarrative(p.text);
    setAsset(p.asset);
    setPreset(p.label);
    setResult(null);
  };

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setNarrative(String(reader.result ?? "").slice(0, 5000));
      setPreset(null);
    };
    reader.readAsText(f);
  };

  const handleVoice = () => {
    const SR = (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor });
    const Ctor = SR.SpeechRecognition ?? SR.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Voice capture requires a Chromium-based browser with SpeechRecognition support.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setNarrative((prev) => (prev ? `${prev} ${t}` : t));
      setPreset(null);
    };
    rec.start();
  };

  const copyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const meta = result?.report_metadata;
  const sif = result?.sif_classification;
  const barrier = result?.failing_barrier_analysis;
  const riskColor = sif ? RISK_COLORS[sif.risk_level] : "#2563EB";

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* ================= INPUT CONSOLE ================= */}
      <div className="space-y-5">
        <HudPanel
          title="SUPERVISOR REPORT CONSOLE"
          code="UPLOAD-01"
          action={
            <div className="flex items-center gap-1.5">
              <Chip text="TEXT" color="#2563EB" />
              <Chip text="FILE" color="#2563EB" />
              <Chip text="VOICE" color="#2563EB" />
            </div>
          }
        >
          <div className="space-y-4">
            {/* Asset + translate toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">ASSET</span>
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="font-data rounded border border-[#2563EB]/25 bg-white px-2 py-1.5 text-[11px] tracking-wider text-[#2563EB] outline-none"
                >
                  {OIL_ASSETS.map((a) => (
                    <option key={a} value={a} className="bg-[#FFFFFF]">
                      {a.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setAutoTranslate((v) => !v)}
                className={`flex items-center gap-2 rounded border px-3 py-1.5 transition ${
                  autoTranslate
                    ? "border-[#16A34A]/50 bg-[#16A34A]/10 text-[#16A34A]"
                    : "border-[#64748B]/40 text-[#64748B]"
                }`}
              >
                <Languages className="size-3.5" />
                <span className="font-data text-[9px] tracking-[0.18em]">
                  AUTO TRANSLATE {autoTranslate ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            {/* Mandatory report fields — no report can be submitted without these */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="REPORTER NAME"
                error={touched.reporterName ? errors.reporterName : undefined}
              >
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, reporterName: true }))}
                  placeholder="Full name of the person filing this report"
                  className={fieldClass(touched.reporterName && !!errors.reporterName)}
                />
              </FormField>

              <FormField
                label="INCIDENT TYPE"
                error={touched.incidentType ? errors.incidentType : undefined}
              >
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, incidentType: true }))}
                  className={fieldClass(touched.incidentType && !!errors.incidentType)}
                >
                  <option value="" disabled className="bg-[#FFFFFF]">
                    Select type…
                  </option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#FFFFFF]">
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="LOCATION / SUB-AREA"
                error={touched.location ? errors.location : undefined}
              >
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, location: true }))}
                  placeholder="e.g. Wellpad 3, Tank Farm B, Rig 14"
                  className={fieldClass(touched.location && !!errors.location)}
                />
              </FormField>

              <FormField
                label="INCIDENT DATE / TIME"
                error={touched.incidentDateTime ? errors.incidentDateTime : undefined}
              >
                <input
                  type="datetime-local"
                  value={incidentDateTime}
                  onChange={(e) => setIncidentDateTime(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, incidentDateTime: true }))}
                  className={fieldClass(touched.incidentDateTime && !!errors.incidentDateTime)}
                />
              </FormField>
            </div>

            {/* Narration textarea */}
            <div>
              <textarea
                value={narrative}
                onChange={(e) => {
                  setNarrative(e.target.value);
                  setPreset(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, narrative: true }))}
                rows={7}
                placeholder="Paste or type the safety narrative — Assamese / हिन्दी / বাংলা / English accepted. The engine auto-detects script and translates to standardized English before triage."
                className={`font-head w-full resize-none rounded-lg border bg-white p-3.5 text-sm leading-relaxed text-[#1E293B] outline-none transition placeholder:text-[#64748B] focus:shadow-[0_0_18px_rgba(37,99,235,0.15)] ${
                  touched.narrative && errors.narrative
                    ? "border-[#DC2626]/60 focus:border-[#DC2626]"
                    : "border-[#2563EB]/20 focus:border-[#2563EB]/50"
                }`}
              />
              <div className="mt-1 flex items-center justify-between">
                <p
                  className={`font-data text-[9px] tracking-wider ${
                    touched.narrative && errors.narrative ? "text-[#DC2626]" : "text-[#64748B]"
                  }`}
                >
                  {touched.narrative && errors.narrative
                    ? errors.narrative
                    : `Minimum ${NARRATIVE_MIN_CHARS} characters / ${NARRATIVE_MIN_WORDS} words required.`}
                </p>
                <p className="font-data text-[9px] tracking-wider text-[#64748B]">
                  {narrative.trim().length} chars · {narrativeWordCount} words
                </p>
              </div>
            </div>

            {submitBlocked && !isFormValid && (
              <p className="font-data rounded border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-[10px] tracking-[0.12em] text-[#DC2626]">
                COMPLETE ALL MANDATORY FIELDS BEFORE SUBMITTING — reporter name, incident type, location, date/time and a
                properly detailed narrative are required.
              </p>
            )}

            {submitError && (
              <p className="font-data rounded border border-[#DC2626]/40 bg-[#DC2626]/10 px-3 py-2 text-[10px] tracking-[0.12em] text-[#DC2626]">
                SUBMISSION FAILED — {submitError}
              </p>
            )}

            {/* Input buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleAssess()}
                disabled={assessing}
                title={!isFormValid ? "Complete all mandatory fields to run triage" : undefined}
                className={`glow-pulse flex items-center gap-2 rounded-md px-5 py-2.5 font-head text-sm font-bold tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isFormValid
                    ? "bg-[#2563EB] text-[#FFFFFF] hover:bg-[#2563EB]/85"
                    : "bg-[#2563EB]/60 text-[#FFFFFF] hover:bg-[#2563EB]/70"
                }`}
              >
                {assessing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {assessing ? "TRIAGING…" : "RUN REAL-TIME TRIAGE"}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-md border border-[#2563EB]/25 px-3.5 py-2.5 font-head text-sm text-[#475569] transition hover:border-[#2563EB]/50 hover:text-[#2563EB]"
              >
                <Upload className="size-4" /> FILE
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv,.md,text/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button
                onClick={handleVoice}
                className="flex items-center gap-2 rounded-md border border-[#2563EB]/25 px-3.5 py-2.5 font-head text-sm text-[#475569] transition hover:border-[#2563EB]/50 hover:text-[#2563EB]"
              >
                <Mic className="size-4" /> VOICE
              </button>
              {narrative && (
                <button
                  onClick={() => {
                    setNarrative("");
                    setResult(null);
                    setPreset(null);
                  }}
                  className="font-data ml-auto text-[10px] tracking-[0.2em] text-[#64748B] transition hover:text-[#DC2626]"
                >
                  CLEAR ✕
                </button>
              )}
            </div>
            <p className="font-data text-[9px] leading-relaxed tracking-[0.12em] text-[#64748B]">
              {status
                ? `ENGINE ${status.status} · ${status.engine_summary} · ${status.triage_mode}`
                : "SYNCING ENGINE STATUS…"}
            </p>
          </div>
        </HudPanel>

        {/* Demo presets */}
        <HudPanel title="INCIDENT PRESET LIBRARY" code="PRESET-02" accent="#D97706">
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${
                  preset === p.label
                    ? "glass-cyan border-[#2563EB]/50 bg-[#2563EB]/8"
                    : "border-[#2563EB]/12 bg-slate-50 hover:border-[#2563EB]/35"
                }`}
              >
                <p className="font-data text-[10px] font-semibold tracking-[0.12em] text-[#2563EB]">{p.label}</p>
                <p className="font-data mt-1 text-[9px] tracking-wider text-[#64748B]">
                  {p.asset.toUpperCase()} · {p.language.toUpperCase()}
                </p>
              </button>
            ))}
          </div>
        </HudPanel>

        {/* Language preview */}
        {narrative.trim() && (
          <HudPanel title="ZERO-SHOT TRANSLATION PREVIEW" code="XLATE-03" accent="#16A34A">
            <PreviewPanel narrative={narrative} enabled={autoTranslate} />
          </HudPanel>
        )}
      </div>

      {/* ================= RESULT PANEL ================= */}
      <div className="space-y-5">
        {assessing && (
          <div className="glass flex flex-col items-center gap-4 rounded-xl p-10">
            <Radar className="hud-radar size-10 text-[#2563EB]" />
            <p className="font-data text-[10px] tracking-[0.3em] text-[#2563EB]">REAL-TIME INFERENCE PIPELINE ACTIVE</p>
            <div className="w-64">
              <GlowBar pct={92} color="#2563EB" height={4} />
            </div>
            <p className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">
              TRANSLATE → EMBED → CLASSIFY → MAP RULES → BARRIER ANALYSIS
            </p>
          </div>
        )}

        <AnimatePresence>
          {!assessing && result && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* SIF verdict */}
              <HudPanel
                title="STRUCTURED TRIAGE OUTPUT"
                code={meta?.report_id ?? "OUT"}
                accent={riskColor}
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowJson((v) => !v)}
                      className="font-data rounded border border-[#2563EB]/30 px-2 py-1 text-[9px] tracking-[0.15em] text-[#2563EB] hover:bg-[#2563EB]/10"
                    >
                      {showJson ? "CARD VIEW" : "JSON VIEW"}
                    </button>
                    <button
                      onClick={copyJson}
                      className="font-data flex items-center gap-1 rounded border border-[#2563EB]/30 px-2 py-1 text-[9px] tracking-[0.15em] text-[#2563EB] hover:bg-[#2563EB]/10"
                    >
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />} JSON
                    </button>
                  </div>
                }
              >
                {showJson ? (
                  <pre className="hud-scroll max-h-[560px] overflow-auto font-data text-[10px] leading-relaxed text-[#16A34A]">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <div className="space-y-4">
                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#2563EB]/10 bg-slate-50 p-3">
                      <MetaItem label="ORIGINAL LANGUAGE" value={meta?.original_language ?? "—"} color={LANG_COLORS[meta?.original_language ?? "English"] ?? "#2563EB"} />
                      <MetaItem
                        label="TRANSLATED"
                        value={
                          !meta?.translated
                            ? "N/A — ENGLISH"
                            : (meta.translation_confidence ?? 0) >= 0.75
                              ? `YES · ${Math.round(meta.translation_confidence * 100)}%`
                              : `PARTIAL · ${Math.round((meta.translation_confidence ?? 0) * 100)}%`
                        }
                        color={!meta?.translated || (meta.translation_confidence ?? 0) >= 0.75 ? "#16A34A" : "#D97706"}
                      />
                      <MetaItem label="ASSET" value={meta?.asset ?? asset} color="#2563EB" />
                      <MetaItem label="TRIAGE LATENCY" value={`${meta?.triage_latency_ms ?? 0} MS`} color="#D97706" />
                      <MetaItem
                        label="ANALYSIS MODE"
                        value={meta?.analysis_mode === "LLM_AUGMENTED" ? "LLM-AUGMENTED" : "RULE-BASED"}
                        color={meta?.analysis_mode === "LLM_AUGMENTED" ? "#16A34A" : "#475569"}
                      />
                    </div>
                    {meta?.ai_disclosure && (
                      <p className="font-data px-1 text-[9px] leading-relaxed tracking-wide text-[#64748B]">{meta.ai_disclosure}</p>
                    )}

                    {/* SIF verdict */}
                    <div
                      className={`rounded-lg border p-4 ${sif?.risk_level === "CRITICAL" ? "glass-crimson crit-pulse" : sif?.risk_level === "HIGH" ? "glass-amber" : ""}`}
                      style={{ borderColor: `${riskColor}55`, background: `${riskColor}08` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="size-6" style={{ color: riskColor }} />
                          <div>
                            <p className="font-display text-lg font-black tracking-wider" style={{ color: riskColor, textShadow: `0 0 16px ${riskColor}88` }}>
                              {sif?.label}
                            </p>
                            <p className="font-data text-[9px] tracking-[0.2em] text-[#64748B]">RISK LEVEL: {sif?.risk_level}</p>
                          </div>
                        </div>
                        <div className="w-40">
                          <p className="font-data mb-1 text-right text-[9px] tracking-wider" style={{ color: riskColor }}>
                            CONF {(sif?.confidence ?? 0).toFixed(2)}
                          </p>
                          <GlowBar pct={sif ? sif.confidence * 100 : 0} color={riskColor} height={7} />
                        </div>
                      </div>
                      <p className="font-head mt-3 text-sm leading-relaxed text-[#475569]">{sif?.reasoning}</p>
                    </div>

                    {/* IOGP mapping */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 p-3">
                        <p className="font-data mb-1.5 text-[9px] tracking-[0.2em] text-[#2563EB]">PRIMARY IOGP LSR</p>
                        <p className="font-head text-sm font-semibold text-foreground">{result.iogp_rule_mapping.primary}</p>
                      </div>
                      <div className="rounded-lg border border-[#2563EB]/12 bg-slate-50 p-3">
                        <p className="font-data mb-1.5 text-[9px] tracking-[0.2em] text-[#64748B]">SECONDARY RULES</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.iogp_rule_mapping.secondary.map((s) => (
                            <Chip key={s} text={s} color="#2563EB" />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Barrier analysis */}
                    <div className="rounded-lg border border-[#D97706]/25 bg-[#D97706]/5 p-4">
                      <div className="flex items-center gap-2">
                        <Wrench className="size-4 text-[#D97706]" />
                        <p className="font-display text-[11px] font-bold tracking-[0.2em] text-[#D97706]">
                          FAILING BARRIER — {barrier?.barrier_name}
                        </p>
                      </div>
                      <p className="font-data mt-2 text-[9px] tracking-wider text-[#64748B]">
                        ROOT CAUSE CATEGORY: {barrier?.root_cause_category} · {barrier?.oisd_reference}
                      </p>
                      <p className="font-head mt-2 text-sm leading-relaxed text-[#1E293B]">{barrier?.root_cause}</p>
                      <div className="mt-3 grid gap-2 rounded border border-[#DC2626]/20 bg-slate-50 p-3 sm:grid-cols-2">
                        <div>
                          <p className="font-data text-[9px] tracking-[0.2em] text-[#DC2626]">PRECURSOR MATCH</p>
                          <p className="font-head mt-1 text-xs text-[#475569]">{barrier?.precursor_match}</p>
                        </div>
                        <div>
                          <p className="font-data text-[9px] tracking-[0.2em] text-[#DC2626]">PRECURSOR DENSITY</p>
                          <GlowBar pct={(barrier?.precursor_density ?? 0) * 100} color="#DC2626" height={6} />
                          <p className="font-data mt-1 text-[10px] text-[#DC2626]">{((barrier?.precursor_density ?? 0) * 100).toFixed(0)}% MATCH</p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#16A34A]/25 bg-[#16A34A]/5 p-3.5">
                        <div className="mb-2 flex items-center gap-2">
                          <Target className="size-4 text-[#16A34A]" />
                          <p className="font-data text-[9px] tracking-[0.2em] text-[#16A34A]">IMMEDIATE CORRECTIVE ACTION</p>
                        </div>
                        <p className="font-head text-sm leading-relaxed text-[#1E293B]">
                          {result.actionable_recommendations[0]?.immediate_corrective_action}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#2563EB]/20 bg-slate-50 p-3.5">
                        <div className="mb-2 flex items-center gap-2">
                          <Wrench className="size-4 text-[#2563EB]" />
                          <p className="font-data text-[9px] tracking-[0.2em] text-[#2563EB]">LONG TERM FIX</p>
                        </div>
                        <p className="font-head text-sm leading-relaxed text-[#1E293B]">
                          {result.actionable_recommendations[0]?.long_term_fix}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </HudPanel>
            </motion.div>
          )}
        </AnimatePresence>

        {!assessing && !result && (
          <div className="glass flex flex-col items-center gap-4 rounded-xl p-12 text-center">
            <FileText className="size-10 text-[#2563EB]/40" />
            <p className="font-display text-sm font-bold tracking-[0.25em] text-[#64748B]">AWAITING NARRATIVE INPUT</p>
            <p className="font-head max-w-sm text-sm text-[#64748B]">
              Load an incident preset or submit a field narrative. The engine returns SIF classification, IOGP rule
              tags, failing barrier root cause and corrective actions as structured JSON.
            </p>
            <div className="font-data mt-2 flex flex-wrap justify-center gap-2">
              <Chip text="SIF CLASSIFIER" color="#DC2626" />
              <Chip text="IOGP LSR 2020" color="#2563EB" />
              <Chip text="BARRIER RCA" color="#D97706" />
              <Chip text="KB MATCH" color="#16A34A" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared styling for a mandatory-field input/select, red-bordered once touched + invalid. */
function fieldClass(invalid: boolean): string {
  return `font-head w-full rounded-lg border bg-white p-2.5 text-sm text-[#1E293B] outline-none transition placeholder:text-[#64748B] focus:shadow-[0_0_18px_rgba(37,99,235,0.15)] ${
    invalid ? "border-[#DC2626]/60 focus:border-[#DC2626]" : "border-[#2563EB]/20 focus:border-[#2563EB]/50"
  }`;
}

/** Labeled wrapper for a mandatory field, showing an inline error once the field has been touched. */
function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-data flex items-center gap-1 text-[9px] tracking-[0.2em] text-[#64748B]">
        {label} <span className="text-[#DC2626]">*</span>
      </span>
      {children}
      {error && <span className="font-data block text-[9px] tracking-wider text-[#DC2626]">{error}</span>}
    </label>
  );
}

function MetaItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="font-data text-[8px] tracking-[0.2em] text-[#64748B]">{label}</p>
      <p className="font-head mt-0.5 truncate text-sm font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

/** Live translation preview — calls the translate action as the user types. */
function PreviewPanel({ narrative, enabled }: { narrative: string; enabled: boolean }) {
  const preview = useAction(api.safety.translatePreview);
  const [state, setState] = useState<{
    detected?: string;
    translated_narrative?: string;
    translated?: boolean;
    translation_confidence?: number;
    ruleHits?: Array<{ id: string; name: string; score: number }>;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !narrative.trim()) return;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        setState(await preview({ narrative }));
      } finally {
        setBusy(false);
      }
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrative, enabled]);

  return (
    <div className="space-y-3">
      <button
        onClick={() =>
          (async () => {
            if (!enabled || !narrative.trim()) return;
            setBusy(true);
            try {
              setState(await preview({ narrative }));
            } finally {
              setBusy(false);
            }
          })()
        }
        disabled={busy || !enabled}
        className="flex items-center gap-2 rounded border border-[#16A34A]/40 bg-[#16A34A]/8 px-3 py-1.5 font-data text-[9px] tracking-[0.2em] text-[#16A34A] transition hover:bg-[#16A34A]/15 disabled:opacity-40"
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : <Languages className="size-3" />}
        {enabled ? "RUN TRANSLATION PASS" : "AUTO-TRANSLATE DISABLED"}
      </button>
      {state && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip text={`DETECTED: ${state.detected?.toUpperCase() ?? "—"}`} color={LANG_COLORS[state.detected ?? "English"] ?? "#2563EB"} solid />
            {state.translated ? (
              <Chip text={`CONFIDENCE ${Math.round((state.translation_confidence ?? 0) * 100)}%`} color="#16A34A" />
            ) : (
              <Chip text="SOURCE IS ENGLISH" color="#475569" />
            )}
          </div>
          <p className="font-head rounded border border-[#16A34A]/15 bg-slate-50 p-3 text-sm leading-relaxed text-[#1E293B]">
            {state.translated_narrative}
          </p>
          {state.ruleHits && state.ruleHits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {state.ruleHits.slice(0, 4).map((h) => (
                <Chip key={h.id} text={`${h.id} · ${h.name} ×${h.score}`} color="#2563EB" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
