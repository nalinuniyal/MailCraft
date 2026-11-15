/**
 * Component placeholders: {{key|default}}. Keys are lowercase snake_case; the
 * default may be empty. The library turns them into form fields and fills them
 * in before inserting the component.
 */
const RE = /\{\{([a-z0-9_]+)\|([^{}]*)\}\}/g;

export interface Placeholder {
  key: string;
  label: string;
  defaultValue: string;
  kind: "color" | "url" | "number" | "text" | "long";
}

export function parsePlaceholders(html: string): Placeholder[] {
  const seen = new Map<string, Placeholder>();
  for (const m of html.matchAll(RE)) {
    const [, key, def] = m;
    if (seen.has(key)) continue;
    const kind: Placeholder["kind"] = /^#[0-9a-f]{3,8}$/i.test(def) ? "color" : /(^|_)url$|^url$|^https?:/.test(key) || /^https?:\/\//.test(def) ? "url" : /^\d+$/.test(def) ? "number" : def.length > 60 ? "long" : "text";
    seen.set(key, { key, label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), defaultValue: def, kind });
  }
  return [...seen.values()];
}

/** Escapes text for use inside HTML text or a quoted attribute. AMPscript %%..%% is kept. */
export function escapeHtmlValue(value: string) {
  return value.replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function fillPlaceholders(html: string, values: Record<string, string>): string {
  return html.replace(RE, (_, key: string, def: string) => escapeHtmlValue(values[key] ?? def));
}
