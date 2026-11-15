export type LinkStatus = { url: string; kind: "link" | "image"; ok: boolean; status: number | null; finalUrl?: string; error?: string; ms: number };

/** Extracts absolute http(s) links and image sources to check. */
export function extractUrls(html: string): { url: string; kind: "link" | "image" }[] {
  const out = new Map<string, "link" | "image">();
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) if (/^https?:\/\//i.test(m[1])) out.set(m[1].trim(), "link");
  for (const m of html.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) if (/^https?:\/\//i.test(m[1])) out.set(m[1].trim(), "image");
  for (const m of html.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi)) out.set(m[1].trim(), "image");
  return [...out].slice(0, 60).map(([url, kind]) => ({ url, kind }));
}
