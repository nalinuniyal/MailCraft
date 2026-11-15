import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Authenticated route helper: returns the Supabase client + user, or a 401 response. */
export async function requireApiUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub as string | undefined;
  if (error || !id) return { error: Response.json({ error: "Authentication required." }, { status: 401 }) } as const;
  return { supabase, user: { id } } as const;
}

export async function readJson<T>(req: Request, maxBytes: number): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return { ok: false, response: Response.json({ error: "Request too large." }, { status: 413 }) };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, response: Response.json({ error: "Request too large." }, { status: 413 }) };
  try {
    return { ok: true, body: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON." }, { status: 400 }) };
  }
}
