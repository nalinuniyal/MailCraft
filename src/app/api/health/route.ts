import { isSupabaseConfigured } from "@/lib/env";
import { isAiConfigured } from "@/lib/ai/anthropic";

/** Liveness and configuration check for uptime monitors. Reveals no secrets. */
export async function GET() {
  return Response.json(
    { ok: true, supabase: isSupabaseConfigured() ? "configured" : "missing", ai: isAiConfigured() ? "configured" : "missing", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
