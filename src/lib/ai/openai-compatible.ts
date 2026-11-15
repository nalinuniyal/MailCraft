import "server-only";
import type { ZodType } from "zod";
import { AiError, type AiProvider } from "./provider";
import type { StructuredRequest, StructuredResult } from "./client";

type ChatResponse = {
  model?: string;
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: string };
};

/** Longest provider-requested wait we sit through before retrying a 429 once. */
const MAX_RETRY_WAIT_MS = 20_000;

/** Strips a ```json fence some models add in plain JSON mode. */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

/**
 * Chat Completions call for OpenAI-compatible providers (xAI Grok, Groq).
 * Asks for strict JSON Schema output; if the model doesn't support that, retries
 * once in JSON mode with the schema in the system prompt. The answer is always
 * re-validated with zod, so a malformed reply is an error, never shown as-is.
 */
export async function callOpenAiCompatible<T>(p: AiProvider, opts: StructuredRequest<T>): Promise<StructuredResult<T>> {
  const name = p.label;
  const base = {
    model: opts.model,
    max_tokens: Math.min(opts.maxTokens ?? 16000, 16000),
    messages: [{ role: "system", content: opts.system }, ...opts.messages],
    // Groq's gpt-oss models spend reasoning tokens against a small free-tier
    // per-minute budget, so keep reasoning lighter than the task's nominal effort.
    ...(p.id === "groq" && /gpt-oss/.test(opts.model) ? { reasoning_effort: opts.effort === "high" ? "medium" : "low" } : {}),
  };
  const strict = { ...base, response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema: opts.jsonSchema } } };
  let res = await post(p, strict);
  // Fall back to JSON mode when the model has no structured outputs, or when
  // Groq's strict mode fails to produce schema-valid JSON on this sample.
  if (res.status === 400 && (/response_format|json_schema|structured/i.test(res.body.error?.message ?? "") || isJsonGenerationFailure(res.body))) {
    const system = `${opts.system}\n\nRespond with a single JSON object only, no prose and no code fences, matching this JSON Schema:\n${JSON.stringify(opts.jsonSchema)}`;
    res = await post(p, { ...base, messages: [{ role: "system", content: system }, ...opts.messages], response_format: { type: "json_object" } });
  }
  const { status, body } = res;
  if (status === 401 || status === 403) throw new AiError(`The ${name} API key was rejected. Check the key in the server environment.`, 502);
  if (status === 404) throw new AiError(`${name} does not know the model "${opts.model}". Set AI_MODEL_ANALYZE / AI_MODEL_ASSIST to a model your account can use.`, 502);
  if (status === 413) throw new AiError(`This email is too large for ${name}'s current limits. Try a smaller email or select a section and ask the assistant about it.`, 413);
  if (status === 429) throw new AiError(`${name} is rate limited right now (free tiers have low per-minute limits). Try again in a minute.`, 429);
  if (status === 400 && isJsonGenerationFailure(body)) throw new AiError(`${name} could not produce a valid answer for this email. Try again.`, 502);
  if (status >= 400) throw new AiError(`${name} rejected the request: ${body.error?.message ?? `HTTP ${status}`}`, 502);
  const choice = body.choices?.[0];
  if (choice?.message?.refusal) throw new AiError(`${name} declined this request.`, 422);
  if (choice?.finish_reason === "length") throw new AiError(`${name}'s answer was too long and got cut off. Try a smaller email or a narrower question.`, 502);
  return { data: parse(choice?.message?.content ?? "", opts.schema, name), model: body.model ?? opts.model, usage: { input: body.usage?.prompt_tokens ?? 0, output: body.usage?.completion_tokens ?? 0 } };
}

function parse<T>(text: string, schema: ZodType<T>, name: string): T {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch {
    throw new AiError(`${name} returned a response that could not be read.`, 502);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AiError(`${name} returned a response in an unexpected shape.`, 502);
  return parsed.data;
}

function isJsonGenerationFailure(body: ChatResponse) {
  return body.error?.code === "json_validate_failed" || /failed to generate json/i.test(body.error?.message ?? "");
}

/** Seconds from Retry-After (or Groq's x-ratelimit-reset-tokens like "7.5s"), as ms. */
function retryAfterMs(headers: Headers): number | null {
  const ra = headers.get("retry-after");
  if (ra && /^\d+(\.\d+)?$/.test(ra)) return Number(ra) * 1000;
  const reset = headers.get("x-ratelimit-reset-tokens")?.match(/^(?:(\d+)m)?(\d+(?:\.\d+)?)s$/);
  if (reset) return (Number(reset[1] ?? 0) * 60 + Number(reset[2])) * 1000;
  return null;
}

/** POST, retrying once after a short provider-requested wait on 429 (free tiers have tight per-minute limits). */
async function post(p: AiProvider, payload: unknown): Promise<{ status: number; body: ChatResponse }> {
  const first = await postOnce(p, payload);
  if (first.status !== 429) return first;
  const wait = retryAfterMs(first.headers);
  if (wait === null || wait > MAX_RETRY_WAIT_MS) return first;
  await new Promise((r) => setTimeout(r, wait + 250));
  return postOnce(p, payload);
}

async function postOnce(p: AiProvider, payload: unknown): Promise<{ status: number; body: ChatResponse; headers: Headers }> {
  let res: Response;
  try {
    res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(170_000),
    });
  } catch {
    throw new AiError(`Could not reach ${p.label}. Try again in a minute.`, 502);
  }
  const body = (await res.json().catch(() => ({}))) as ChatResponse;
  return { status: res.status, body, headers: res.headers };
}
