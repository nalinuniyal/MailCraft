import "server-only";
import { requireApiUser, readJson } from "@/lib/api";
import { consumeRateLimit, rateLimitResponse, envInt } from "@/lib/rate-limit";
import { isAiConfigured, aiSetupHint, AiError } from "./client";

/** HTML larger than this is not sent to the AI provider (cost and latency guard). */
export const AI_MAX_HTML_BYTES = envInt("AI_MAX_HTML_BYTES", 400_000);

/** Auth, AI-configured check, body parsing, then the per-user hourly AI budget. */
export async function aiRequest(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return { response: auth.error } as const;
  if (!isAiConfigured()) {
    return { response: Response.json({ error: `AI is not configured. ${aiSetupHint()}`, code: "ai_not_configured" }, { status: 503 }) } as const;
  }
  const json = await readJson<unknown>(req, AI_MAX_HTML_BYTES + 64_000);
  if (!json.ok) return { response: json.response } as const;
  const limit = await consumeRateLimit(auth.supabase, "ai", envInt("AI_RATE_LIMIT_PER_HOUR", 30));
  if (!limit.allowed) return { response: rateLimitResponse(limit) } as const;
  return { auth, body: json.body, remaining: limit.remaining } as const;
}

export function aiErrorResponse(err: unknown) {
  if (err instanceof AiError) return Response.json({ error: err.message }, { status: err.status });
  console.error("[ai] unexpected error", err);
  return Response.json({ error: "Something went wrong while talking to the AI provider." }, { status: 500 });
}
