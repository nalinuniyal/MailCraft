import { z } from "zod";
import { AI_MODELS, callStructured } from "@/lib/ai/anthropic";
import { ASSIST_SYSTEM, emailBlock } from "@/lib/ai/prompts";
import { AiAssistSchema, AI_ASSIST_JSON_SCHEMA } from "@/lib/ai/schemas";
import { aiRequest, aiErrorResponse, AI_MAX_HTML_BYTES } from "@/lib/ai/route";

export const maxDuration = 300;

const Body = z.object({
  html: z.string().max(AI_MAX_HTML_BYTES),
  selection: z.string().max(20_000).optional(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) })).min(1).max(30),
});

export async function POST(req: Request) {
  const ctx = await aiRequest(req);
  if ("response" in ctx) return ctx.response;
  const parsed = Body.safeParse(ctx.body);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") return Response.json({ error: "Send the conversation, ending with your message." }, { status: 400 });
  const { html, selection, messages } = parsed.data;
  // The current email goes with the latest user turn so earlier turns stay a stable, cacheable prefix.
  const last = messages.at(-1)!;
  const context = `${emailBlock(html)}${selection ? `\n\n<selected_code>\n${selection}\n</selected_code>` : ""}`;
  try {
    const result = await callStructured({
      model: AI_MODELS.assist,
      system: ASSIST_SYSTEM,
      messages: [...messages.slice(0, -1), { role: "user", content: `${context}\n\n${last.content}` }],
      jsonSchema: AI_ASSIST_JSON_SCHEMA,
      schema: AiAssistSchema,
      effort: "medium",
    });
    return Response.json({ ...result.data, model: result.model, remaining: ctx.remaining });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
