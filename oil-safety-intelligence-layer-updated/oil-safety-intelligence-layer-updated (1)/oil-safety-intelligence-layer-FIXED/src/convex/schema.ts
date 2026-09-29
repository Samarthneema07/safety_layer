import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // OIL Safety Intelligence Layer — triaged safety reports
    safetyReports: defineTable({
      reporterName: v.string(),
      incidentType: v.string(),
      location: v.string(),
      incidentDateTime: v.string(),
      narrative: v.string(),
      asset: v.string(),
      originalLanguage: v.string(),
      originalText: v.string(),
      translatedNarrative: v.string(),
      translated: v.boolean(),
      translationConfidence: v.number(),
      analysisMode: v.union(v.literal("RULE_BASED"), v.literal("LLM_AUGMENTED")),
      aiDisclosure: v.string(),
      sifLabel: v.union(v.literal("SIF-POTENTIAL"), v.literal("NON-SIF")),
      sifConfidence: v.number(),
      riskLevel: v.union(v.literal("CRITICAL"), v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")),
      iogpPrimary: v.string(),
      iogpSecondary: v.array(v.string()),
      barrierName: v.string(),
      rootCause: v.string(),
      rootCauseCategory: v.string(),
      precursorMatch: v.string(),
      precursorDensity: v.number(),
      referenceIncident: v.string(),
      oisdReference: v.string(),
      immediateAction: v.string(),
      longTermFix: v.string(),
      triageLatencyMs: v.number(),
      createdAt: v.number(),
      createdBy: v.optional(v.id("users")),
    }).index("by_created_at", ["createdAt"]),

    // Permanent Indian HSSE dataset (mirrors engine INCIDENT_KB for browsing)
    kbIncidents: defineTable({
      kbId: v.string(),
      title: v.string(),
      assetRegion: v.string(),
      date: v.string(),
      type: v.string(),
      severity: v.string(),
      fatalities: v.number(),
      injuries: v.number(),
      iogpRule: v.string(),
      failingBarrier: v.string(),
      precursors: v.array(v.string()),
      rootCause: v.string(),
      description: v.string(),
      // Present on records sourced from the operator/regulatory CSV import; absent on the hand-curated landmark set.
      operatorCompany: v.optional(v.string()),
      sector: v.optional(v.string()),
      onshoreOffshore: v.optional(v.string()),
      correctiveAction: v.optional(v.string()),
      regulatoryRef: v.optional(v.string()),
    }).index("by_kbId", ["kbId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
