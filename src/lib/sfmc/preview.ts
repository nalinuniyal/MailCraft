import { findAmpscript } from "./lint";

/**
 * Sample-subscriber preview for Marketing Cloud emails.
 *
 * This is substitution, not AMPscript execution: personalization strings
 * (%%FirstName%%) are replaced from the sample subscriber, and only the
 * simplest inline expressions are resolved: v(@var), AttributeValue("Field"),
 * [Field] and @var, where @var was set unconditionally to AttributeValue(),
 * a [Field] or a string literal. IF/ELSE, loops, lookups and every other
 * function are not evaluated; their inline output is shown as a marker.
 */
export interface SubscriberPreview {
  html: string;
  substituted: string[];
  missingFields: string[];
  unresolved: string[];
  removedBlocks: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderSubscriberPreview(source: string, subscriber: Record<string, string>): SubscriberPreview {
  const lookup = new Map(Object.entries(subscriber).map(([k, v]) => [k.toLowerCase(), v]));
  const substituted = new Set<string>();
  const missing = new Set<string>();
  const unresolved: string[] = [];
  const field = (name: string): string => {
    const key = name.trim().toLowerCase();
    if (lookup.has(key)) {
      substituted.add(name.trim());
      return lookup.get(key)!;
    }
    missing.add(name.trim());
    return "";
  };

  // Unconditional assignments: SET statements outside IF/FOR in %%[ ]%% blocks.
  const vars = new Map<string, () => string>();
  const code = findAmpscript(source);
  for (const b of code.filter((c) => c.kind !== "inline" && c.closed)) {
    let depth = 0;
    for (const stmt of b.code.matchAll(/\b(IF|ENDIF|FOR|NEXT)\b|\bSET\s+(@\w+)\s*=\s*(AttributeValue\s*\(\s*["']([^"']+)["']\s*\)|\[([^\]]+)\]|"([^"]*)"|'([^']*)')/gi)) {
      const kw = stmt[1]?.toUpperCase();
      if (kw === "IF" || kw === "FOR") depth++;
      else if (kw === "ENDIF" || kw === "NEXT") depth = Math.max(0, depth - 1);
      else if (stmt[2] && depth === 0) {
        const name = stmt[2].toLowerCase();
        const f = stmt[4] ?? stmt[5];
        const lit = stmt[6] ?? stmt[7];
        vars.set(name, f !== undefined ? () => field(f) : () => lit ?? "");
      }
    }
  }

  const resolveExpr = (expr: string): string | null => {
    const e = expr.trim();
    let m = /^v\s*\(\s*(@\w+)\s*\)$/i.exec(e) ?? /^(@\w+)$/.exec(e);
    if (m) return vars.get(m[1].toLowerCase())?.() ?? null;
    m = /^AttributeValue\s*\(\s*["']([^"']+)["']\s*\)$/i.exec(e) ?? /^\[([^\]]+)\]$/.exec(e);
    if (m) return field(m[1]);
    return null;
  };

  let removedBlocks = 0;
  let html = source.replace(/%%\[[\s\S]*?\]%%|<script\b[^>]*runat\s*=\s*["']?server["']?[^>]*>[\s\S]*?<\/script>/gi, () => {
    removedBlocks++;
    return "";
  });
  html = html.replace(/%%=([\s\S]*?)=%%/g, (_, expr: string) => {
    const value = resolveExpr(expr);
    if (value !== null) return esc(value);
    unresolved.push(expr.trim());
    return esc(`[AMPscript: ${expr.trim().slice(0, 60)}]`);
  });
  // Personalization strings: %%FirstName%%, %%emailaddr%%, %%First Name%%
  html = html.replace(/%%([A-Za-z_][\w .-]{0,99})%%/g, (whole, name: string) => (lookup.has(name.trim().toLowerCase()) ? esc(field(name)) : (missing.add(name.trim()), whole)));

  return { html, substituted: [...substituted], missingFields: [...missing], unresolved, removedBlocks };
}

export const DEFAULT_SUBSCRIBER: Record<string, string> = {
  FirstName: "Alex",
  LastName: "Morgan",
  emailaddr: "alex.morgan@example.com",
  _subscriberkey: "SUB-000123",
  City: "Bristol",
  member_busname: "Northwind Inc.",
  member_addr: "123 Market Street",
  member_city: "San Francisco",
  member_state: "CA",
  member_postalcode: "94105",
  member_country: "US",
  view_email_url: "https://example.com/view",
  unsub_center_url: "https://example.com/unsubscribe",
  profile_center_url: "https://example.com/profile",
};
