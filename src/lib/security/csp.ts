/**
 * App Content-Security-Policy. Scripts need a per-request nonce
 * ('strict-dynamic' lets Next's and Monaco's loaders add their own chunks).
 *
 * Notes on the looser directives:
 * - style-src 'unsafe-inline': Monaco, Radix and next-themes inject styles at
 *   runtime, and email previews are inline-styled by nature. https: lets
 *   previews load web-font stylesheets. CSS cannot execute script.
 * - img-src/font-src https:: email previews load remote images and fonts.
 * Email previews are srcdoc iframes: they inherit this policy and add their
 * own stricter one (script-src 'none').
 */
export function buildCsp({ nonce, dev, supabaseUrl }: { nonce: string; dev: boolean; supabaseUrl?: string }) {
  const supabase = supabaseUrl ? [supabaseUrl, supabaseUrl.replace(/^http/, "ws")] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", "https:"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https:"],
    "connect-src": ["'self'", ...supabase],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
  return dev ? policy : `${policy}; upgrade-insecure-requests`;
}

export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
