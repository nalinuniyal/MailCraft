import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: string };

/** Fixed-window per-user limit stored in Postgres (works across serverless instances). */
export async function consumeRateLimit(supabase: SupabaseClient<Database>, bucket: string, limit: number, windowSeconds = 3600): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_rate_limit", { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds });
  if (error || !data?.[0]) throw new Error(`Rate limiter unavailable: ${error?.message ?? "no result"}`);
  return { allowed: data[0].allowed, remaining: data[0].remaining, resetAt: data[0].reset_at };
}

export function rateLimitResponse(r: RateLimitResult) {
  const retry = Math.max(1, Math.ceil((new Date(r.resetAt).getTime() - Date.now()) / 1000));
  return Response.json(
    { error: `Rate limit reached. Try again after ${new Date(r.resetAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC.` },
    { status: 429, headers: { "Retry-After": String(retry), "X-RateLimit-Remaining": "0" } },
  );
}

export function envInt(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
