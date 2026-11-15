import { z } from "zod";
import type { Issue } from "@/lib/email/types";
import type { Patch } from "./patches";

/* Shapes Claude must return. The JSON Schemas below are sent as structured
 * output formats; the zod schemas re-validate on our side before anything is
 * shown or stored. */

const SEVERITY = ["critical", "high", "medium", "low"] as const;
const CATEGORY = ["html", "css", "responsive", "accessibility", "images", "links", "outlook", "gmail", "size", "compatibility", "dark-mode", "ampscript", "rendering"] as const;

export const PatchSchema = z.object({
  description: z.string().max(500),
  find: z.string().max(20000),
  replace: z.string().max(40000),
});

export const AiIssueSchema = z.object({
  title: z.string().max(200),
  severity: z.enum(SEVERITY),
  category: z.enum(CATEGORY),
  description: z.string().max(2000),
  why_it_matters: z.string().max(1000),
  recommendation: z.string().max(1500),
  snippet: z.string().max(2000),
  fix: PatchSchema.nullable(),
});

export const AiAnalysisSchema = z.object({
  summary: z.string().max(3000),
  issues: z.array(AiIssueSchema).max(40),
});

export const AiFixSchema = z.object({
  explanation: z.string().max(2000),
  patches: z.array(PatchSchema).max(20),
});

export const AiAssistSchema = z.object({
  reply: z.string().max(8000),
  patches: z.array(PatchSchema).max(20),
});

export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;
export type AiFix = z.infer<typeof AiFixSchema>;
export type AiAssist = z.infer<typeof AiAssistSchema>;

const patchJson = {
  type: "object",
  additionalProperties: false,
  required: ["description", "find", "replace"],
  properties: {
    description: { type: "string", description: "One sentence on what this change does." },
    find: { type: "string", description: "Exact text copied from the current HTML. Must occur exactly once; include enough surrounding text to be unique." },
    replace: { type: "string", description: "Replacement text." },
  },
} as const;

export const AI_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "issues"],
  properties: {
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "severity", "category", "description", "why_it_matters", "recommendation", "snippet", "fix"],
        properties: {
          title: { type: "string" },
          severity: { type: "string", enum: [...SEVERITY] },
          category: { type: "string", enum: [...CATEGORY] },
          description: { type: "string" },
          why_it_matters: { type: "string" },
          recommendation: { type: "string" },
          snippet: { type: "string", description: "Exact excerpt from the HTML this issue is about, or empty string." },
          fix: { anyOf: [patchJson, { type: "null" }] },
        },
      },
    },
  },
} as const;

export const AI_FIX_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["explanation", "patches"],
  properties: { explanation: { type: "string" }, patches: { type: "array", items: patchJson } },
} as const;

export const AI_ASSIST_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "patches"],
  properties: {
    reply: { type: "string", description: "Markdown answer for the user." },
    patches: { type: "array", items: patchJson, description: "Proposed edits to the email. Empty when no change is needed." },
  },
} as const;

/** Client-facing AI issue: a regular Issue plus the optional patch that fixes it. */
export type AiIssue = Issue & { fix?: Patch };

export function toIssues(analysis: AiAnalysis, lineOf: (s: string) => number | undefined): AiIssue[] {
  return analysis.issues.map((i, n) => ({
    id: `ai-${n}`,
    ruleId: `ai/${i.category}`,
    category: i.category,
    severity: i.severity,
    title: i.title,
    description: i.description,
    whyItMatters: i.why_it_matters,
    recommendation: i.recommendation,
    snippet: i.snippet || undefined,
    line: i.snippet ? lineOf(i.snippet) : undefined,
    suggestedCode: i.fix?.replace,
    source: "ai" as const,
    fix: i.fix ?? undefined,
  }));
}

export type ChatMessage = { role: "user" | "assistant"; content: string };
