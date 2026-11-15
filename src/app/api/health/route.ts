import { isSupabaseConfigured } from "@/lib/env";
import { aiProviderInfo } from "@/lib/ai/client";

/** Liveness and configuration check for uptime monitors. Reveals no secrets. */
export async function GET() {
  return Response.json(
    { ok: true, supabase: isSupabaseConfigured() ? "configured" : "missing", ai: aiProviderInfo() ? "configured" : "missing", aiProvider: aiProviderInfo()?.id ?? null, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
