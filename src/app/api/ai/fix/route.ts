import { z } from "zod";
import { callStructured } from "@/lib/ai/client";
import { FIX_SYSTEM, emailBlock } from "@/lib/ai/prompts";
import { AiFixSchema, AI_FIX_JSON_SCHEMA } from "@/lib/ai/schemas";
import { aiRequest, aiErrorResponse, AI_MAX_HTML_BYTES } from "@/lib/ai/route";

export const maxDuration = 300;

const Body = z.object({
  html: z.string().min(1).max(AI_MAX_HTML_BYTES),
  issue: z.object({
    title: z.string().max(300),
    description: z.string().max(3000),
    recommendation: z.string().max(3000).optional(),
    line: z.number().int().positive().optional(),
    snippet: z.string().max(4000).optional(),
  }),
});

export async function POST(req: Request) {
  const ctx = await aiRequest(req);
  if ("response" in ctx) return ctx.response;
  const parsed = Body.safeParse(ctx.body);
  if (!parsed.success) return Response.json({ error: "Provide the email HTML and the issue to fix." }, { status: 400 });
  const { html, issue } = parsed.data;
  const issueText = [
    `Issue: ${issue.title}`,
    `Details: ${issue.description}`,
    issue.recommendation && `Recommendation: ${issue.recommendation}`,
    issue.line && `Reported at line ${issue.line}.`,
    issue.snippet && `Excerpt:\n${issue.snippet}`,
  ].filter(Boolean).join("\n");
  try {
    const result = await callStructured({
      task: "analyze",
      system: FIX_SYSTEM,
      messages: [{ role: "user", content: `${emailBlock(html)}\n\n<issue>\n${issueText}\n</issue>\n\nFix this issue.` }],
      jsonSchema: AI_FIX_JSON_SCHEMA,
      schema: AiFixSchema,
      effort: "medium",
    });
    return Response.json({ ...result.data, model: result.model, remaining: ctx.remaining });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
