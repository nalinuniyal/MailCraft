import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

/* The only module that touches ANTHROPIC_API_KEY. "server-only" makes any
 * accidental import from a client component a build error. */

export const AI_MODELS = {
  analyze: process.env.ANTHROPIC_MODEL_ANALYZE || "claude-opus-5-5",
  assist: process.env.ANTHROPIC_MODEL_ASSIST || "claude-sonnet-5-5",
};

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 180_000 });
  return client;
}

export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * One structured-output call. Streams internally (long HTML inputs and outputs)
 * and returns the validated object. Server-side fallbacks retry a safety
 * decline on Anthropic's recommended fallback model.
 */
export async function callStructured<T>(opts: {
  model: string;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  jsonSchema: Record<string, unknown>;
  schema: ZodType<T>;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<{ data: T; model: string; usage: { input: number; output: number } }> {
  if (!isAiConfigured()) throw new AiError("AI is not configured on this server.", 503);
  let message: Anthropic.Beta.BetaMessage;
  try {
    const stream = getClient().beta.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
      output_config: { effort: opts.effort, format: { type: "json_schema", schema: opts.jsonSchema } },
    });
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 502);
    if (err instanceof Anthropic.RateLimitError) throw new AiError("Claude is rate limited right now. Try again in a minute.", 429);
    if (err instanceof Anthropic.BadRequestError) throw new AiError(`Claude rejected the request: ${err.message}`, 502);
    if (err instanceof Anthropic.APIError) throw new AiError(`Claude API error (${err.status ?? "network"}).`, 502);
    throw err;
  }
  if (message.stop_reason === "refusal") throw new AiError("Claude declined this request.", 422);
  if (message.stop_reason === "max_tokens") throw new AiError("Claude's answer was too long and got cut off. Try a smaller email or a narrower question.", 502);
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiError("Claude returned a response that could not be read.", 502);
  }
  const parsed = opts.schema.safeParse(raw);
  if (!parsed.success) throw new AiError("Claude returned a response in an unexpected shape.", 502);
  return { data: parsed.data, model: message.model, usage: { input: message.usage.input_tokens, output: message.usage.output_tokens } };
}
