import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

export type { LinkStatus } from "./link-check-types";
import type { LinkStatus } from "./link-check-types";

// Separate lists: Node matches IPv4 lookups against IPv4-mapped IPv6 rules too.
const blockedV4 = new net.BlockList();
const blockedV6 = new net.BlockList();
for (const [addr, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]] as const) {
  blockedV4.addSubnet(addr, prefix, "ipv4");
}
for (const [addr, prefix] of [["::", 127], ["::ffff:0:0", 96], ["64:ff9b::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]] as const) {
  blockedV6.addSubnet(addr, prefix, "ipv6");
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return blockedV4.check(ip, "ipv4");
  if (net.isIPv6(ip)) return blockedV6.check(ip, "ipv6"); // includes all IPv4-mapped (::ffff:0:0/96)
  return true;
}

/**
 * Dispatcher whose DNS lookup refuses private addresses at connect time, so a
 * hostname cannot pass the pre-check and then re-resolve to an internal IP
 * (DNS rebinding).
 */
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dns.lookup(hostname, { all: true, verbatim: true }).then(
        (addrs) => {
          const bad = addrs.find((a) => isPrivateIp(a.address));
          if (!addrs.length || bad) return callback(new Error("Host resolves to a private address"), "", 4);
          const first = addrs[0];
          if ((options as { all?: boolean }).all) (callback as unknown as (e: null, a: typeof addrs) => void)(null, addrs);
          else callback(null, first.address, first.family);
        },
        (err) => callback(err, "", 4),
      );
    },
  },
  headersTimeout: 8000,
  bodyTimeout: 8000,
});

/** Rejects non-http(s), non-standard ports, credentials, and hosts resolving to private ranges (SSRF guard). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http(s) URLs are checked");
  if (url.username || url.password) throw new Error("URLs with credentials are not checked");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Non-standard ports are not checked");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error("Private host");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("Host resolves to a private address");
  return url;
}

export async function checkUrl(raw: string, kind: "link" | "image", timeoutMs = 6000): Promise<LinkStatus> {
  const started = Date.now();
  let current = raw;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const url = await assertPublicUrl(current);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res: Awaited<ReturnType<typeof undiciFetch>>;
      try {
        res = await undiciFetch(url, { dispatcher: guardedAgent, method: "HEAD", redirect: "manual", signal: ctrl.signal, headers: { "user-agent": "MailCraftLinkChecker/1.0" } });
        if (res.status === 405 || res.status === 403 || res.status === 501) {
          res = await undiciFetch(url, { dispatcher: guardedAgent, method: "GET", redirect: "manual", signal: ctrl.signal, headers: { "user-agent": "MailCraftLinkChecker/1.0", range: "bytes=0-0" } });
          await res.body?.cancel();
        }
      } finally {
        clearTimeout(timer);
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, url).toString();
        continue;
      }
      const ok = res.status < 400;
      const type = res.headers.get("content-type") ?? "";
      if (ok && kind === "image" && type && !type.startsWith("image/")) {
        return { url: raw, kind, ok: false, status: res.status, finalUrl: current, error: `Not an image (content-type ${type.split(";")[0]})`, ms: Date.now() - started };
      }
      return { url: raw, kind, ok, status: res.status, finalUrl: current !== raw ? current : undefined, ms: Date.now() - started };
    }
    return { url: raw, kind, ok: false, status: null, error: "Too many redirects", ms: Date.now() - started };
  } catch (e) {
    const err = e as Error;
    return { url: raw, kind, ok: false, status: null, error: err.name === "AbortError" ? "Timed out" : err.message, ms: Date.now() - started };
  }
}

export async function checkMany(items: { url: string; kind: "link" | "image" }[], concurrency = 6): Promise<LinkStatus[]> {
  const out: LinkStatus[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await checkUrl(items[idx].url, items[idx].kind);
      }
    }),
  );
  return out;
}
