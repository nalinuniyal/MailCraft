import { z } from "zod";
import { requireApiUser, readJson } from "@/lib/api";
import { validateEmail } from "@/lib/email/validate";
import { analyzeCompatibility } from "@/lib/email/compat";
import { MAX_HTML_BYTES } from "@/lib/email/limits";
import { consumeRateLimit, rateLimitResponse, envInt } from "@/lib/rate-limit";

const Body = z.object({ html: z.string().min(1).max(MAX_HTML_BYTES) });

/** Deterministic analysis: HTML validation + Can I Email compatibility. No AI involved. */
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const json = await readJson<unknown>(req, MAX_HTML_BYTES + 4096);
  if (!json.ok) return json.response;
  const parsed = Body.safeParse(json.body);
  if (!parsed.success) return Response.json({ error: "Provide html (1 byte – 1 MB)." }, { status: 400 });
  const limit = await consumeRateLimit(auth.supabase, "analyze", envInt("ANALYZE_RATE_LIMIT_PER_HOUR", 300));
  if (!limit.allowed) return rateLimitResponse(limit);
  const validation = validateEmail(parsed.data.html);
  const compatibility = analyzeCompatibility(parsed.data.html);
  return Response.json({ validation, compatibility });
}
