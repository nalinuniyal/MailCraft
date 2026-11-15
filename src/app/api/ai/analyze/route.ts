import { z } from "zod";
import { callStructured } from "@/lib/ai/client";
import { ANALYZE_SYSTEM, emailBlock } from "@/lib/ai/prompts";
import { AiAnalysisSchema, AI_ANALYSIS_JSON_SCHEMA, toIssues } from "@/lib/ai/schemas";
import { lineOf } from "@/lib/ai/patches";
import { aiRequest, aiErrorResponse, AI_MAX_HTML_BYTES } from "@/lib/ai/route";
import { countIssues, scoreIssues } from "@/lib/email/types";
import { sha256 } from "@/lib/utils";
import type { Json } from "@/lib/types/database";

export const maxDuration = 300;

const Body = z.object({ html: z.string().min(1).max(AI_MAX_HTML_BYTES), projectId: z.uuid().optional() });

export async function POST(req: Request) {
  const ctx = await aiRequest(req);
  if ("response" in ctx) return ctx.response;
  const parsed = Body.safeParse(ctx.body);
  if (!parsed.success) return Response.json({ error: `Provide the email HTML (up to ${Math.round(AI_MAX_HTML_BYTES / 1000)} KB for AI analysis).` }, { status: 400 });
  const { html, projectId } = parsed.data;
  const { supabase } = ctx.auth;

  if (projectId) {
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const result = await callStructured({
      task: "analyze",
      system: ANALYZE_SYSTEM,
      messages: [{ role: "user", content: `${emailBlock(html)}\n\nAnalyze this email.` }],
      jsonSchema: AI_ANALYSIS_JSON_SCHEMA,
      schema: AiAnalysisSchema,
      effort: "high",
    });
    const issues = toIssues(result.data, (s) => lineOf(html, s));
    const htmlHash = await sha256(html);
    const counts = countIssues(issues);
    const { data: report, error } = await supabase
      .from("analysis_reports")
      .insert({
        kind: "ai",
        title: "AI analysis",
        project_id: projectId ?? null,
        score: scoreIssues(issues),
        counts: counts as unknown as Json,
        issues: issues as unknown as Json,
        sections: { usage: result.usage } as unknown as Json,
        summary: result.data.summary,
        html_hash: htmlHash,
        model: result.model,
      })
      .select("id, created_at")
      .single();
    if (error) console.error("[ai] could not save report", error.message);
    return Response.json({ reportId: report?.id ?? null, createdAt: report?.created_at ?? new Date().toISOString(), model: result.model, summary: result.data.summary, issues, htmlHash, remaining: ctx.remaining });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
