import { z } from "zod";
import { requireApiUser, readJson } from "@/lib/api";
import { checkMany } from "@/lib/email/link-check";
import { consumeRateLimit, rateLimitResponse, envInt } from "@/lib/rate-limit";

const Body = z.object({
  items: z.array(z.object({ url: z.url().max(2048), kind: z.enum(["link", "image"]) })).min(1).max(60),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const json = await readJson<unknown>(req, 200_000);
  if (!json.ok) return json.response;
  const parsed = Body.safeParse(json.body);
  if (!parsed.success) return Response.json({ error: "Provide 1–60 absolute http(s) URLs." }, { status: 400 });
  const limit = await consumeRateLimit(auth.supabase, "link-check", envInt("LINK_CHECK_RATE_LIMIT_PER_HOUR", 20));
  if (!limit.allowed) return rateLimitResponse(limit);
  const unique = [...new Map(parsed.data.items.map((i) => [i.url, i])).values()];
  const results = await checkMany(unique);
  return Response.json({ results, remaining: limit.remaining });
}
