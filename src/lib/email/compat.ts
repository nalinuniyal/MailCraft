import * as csstree from "css-tree";
import { scanHtml, attr } from "./parse";
import { getFeature, clientSupport, featureSummary, KEY_CLIENTS, CANIEMAIL_SOURCE, type ClientSupport, type SupportLevel } from "./caniemail";
import type { Issue, Severity } from "./types";

export interface FeatureUsage {
  slug: string;
  title: string;
  category: string;
  url: string;
  lastTestDate: string;
  occurrences: { line: number; context: string }[];
  overall: SupportLevel;
  supportPct: number | null;
  counts: Record<SupportLevel, number>;
  clients: ClientSupport[];
  notes: string | null;
}

export interface CompatibilityResult {
  features: FeatureUsage[];
  /** Detected constructs that Can I Email has no entry for: shown as "requires testing". */
  untracked: { name: string; line: number }[];
  /** Overall classification across every client Can I Email tested. */
  summary: Record<SupportLevel, number>;
  /** Classification across the key clients: unsupported = fails in at least one key client. */
  keySummary: Record<SupportLevel, number>;
  clientSummary: { label: string; family: string; platform: string; supported: number; partial: number; unsupported: number; unknown: number }[];
  source: typeof CANIEMAIL_SOURCE;
  issues: Issue[];
}

type Hit = { slug: string; line: number; context: string };

const PROP_ALIASES: Record<string, string> = {
  top: "css-left-right-top-bottom", left: "css-left-right-top-bottom", right: "css-left-right-top-bottom", bottom: "css-left-right-top-bottom",
  inset: "css-inset", gap: "css-gap", "row-gap": "css-gap", "column-gap": "css-gap",
  "grid-template-columns": "css-grid-template", "grid-template-rows": "css-grid-template", "grid-template-areas": "css-grid-template", "grid-template": "css-grid-template",
  "margin-inline-start": "css-margin-inline-start-end", "margin-inline-end": "css-margin-inline-start-end",
  "margin-block-start": "css-margin-block-start-end", "margin-block-end": "css-margin-block-start-end",
  "margin-inline": "css-margin-inline-block", "margin-block": "css-margin-inline-block",
  "padding-inline-start": "css-padding-inline-start-end", "padding-inline-end": "css-padding-inline-start-end",
  "padding-block-start": "css-padding-block-start-end", "padding-block-end": "css-padding-block-start-end",
  "padding-inline": "css-padding-inline-block", "padding-block": "css-padding-inline-block",
  "inline-size": "css-inline-size", "block-size": "css-block-inline-size",
  "column-width": "css-column-layout-properties", "column-gap-rule": "css-column-layout-properties", "column-rule": "css-column-layout-properties", "columns": "css-column-layout-properties",
  "flex-flow": "css-flex-wrap",
  "scroll-snap-type": "css-scroll-snap", "scroll-snap-align": "css-scroll-snap",
  "animation-name": "css-animation", "transition-property": "css-transition",
  "text-decoration-line": "css-text-decoration-line",
};
const PROP_PREFIXES: [RegExp, string][] = [
  [/^padding(-(top|right|bottom|left))?$/, "css-padding"],
  [/^margin(-(top|right|bottom|left))?$/, "css-margin"],
  [/^border(-(top|right|bottom|left))?(-(width|style|color))?$/, "css-border"],
  [/^border-(top|bottom)-(left|right)-radius$/, "css-border-radius"],
  [/^background-color$/, "css-background-color"],
  [/^font-family$/, "css-font"],
  [/^animation(-.*)?$/, "css-animation"],
  [/^transition(-.*)?$/, "css-transition"],
  [/^list-style(-.*)?$/, "css-list-style"],
];
const UNIT_SLUGS: Record<string, string> = { rem: "css-unit-rem", em: "css-unit-em", vh: "css-unit-vh", vw: "css-unit-vw", vmin: "css-unit-vmin", vmax: "css-unit-vmax", ch: "css-unit-ch", ex: "css-unit-ex", cm: "css-unit-cm", mm: "css-unit-mm", in: "css-unit-in", pc: "css-unit-pc", pt: "css-unit-pt" };
const FUNCTION_SLUGS: Record<string, string> = {
  calc: "css-unit-calc", clamp: "css-function-clamp", min: "css-function-min", max: "css-function-max", "light-dark": "css-function-light-dark",
  "linear-gradient": "css-linear-gradient", "repeating-linear-gradient": "css-linear-gradient", "radial-gradient": "css-radial-gradient", "conic-gradient": "css-conic-gradient",
  rgb: "css-rgb", rgba: "css-rgba", var: "css-variables", oklch: "css-modern-color", oklab: "css-modern-color", lab: "css-modern-color", lch: "css-modern-color", "color-mix": "css-modern-color", hwb: "css-modern-color",
};

function propertySlug(prop: string): string | null {
  if (prop.startsWith("--")) return "css-variables";
  const p = prop.replace(/^-(webkit|moz|ms|o)-/, "");
  if (PROP_ALIASES[p]) return PROP_ALIASES[p];
  if (getFeature(`css-${p}`)) return `css-${p}`;
  for (const [re, slug] of PROP_PREFIXES) if (re.test(p)) return slug;
  return null;
}

function collectDeclaration(decl: csstree.Declaration, line: number, hits: Hit[], untracked: { name: string; line: number }[]) {
  const prop = decl.property.toLowerCase();
  const value = csstree.generate(decl.value);
  const ctx = `${prop}: ${value}`.slice(0, 120);
  if (prop.startsWith("mso-") || prop.startsWith("-ms-") || prop === "-webkit-text-size-adjust" || prop === "-ms-text-size-adjust") return; // client-specific hacks
  if (prop === "display") {
    const v = value.trim().toLowerCase();
    if (/\b(inline-)?flex\b/.test(v)) hits.push({ slug: "css-display-flex", line, context: ctx });
    else if (/\b(inline-)?grid\b/.test(v)) hits.push({ slug: "css-display-grid", line, context: ctx });
    else if (v === "none") hits.push({ slug: "css-display-none", line, context: ctx });
    else hits.push({ slug: "css-display", line, context: ctx });
  } else if (prop === "background" || prop === "background-image") {
    if (/url\(/i.test(value)) hits.push({ slug: "css-background-image", line, context: ctx });
    hits.push({ slug: prop === "background" ? "css-background" : "css-background-image", line, context: ctx });
  } else {
    const slug = propertySlug(prop);
    if (slug) hits.push({ slug, line, context: ctx });
    else untracked.push({ name: prop, line });
  }
  if (decl.important) hits.push({ slug: "css-important", line, context: ctx });
  csstree.walk(decl.value, (node) => {
    if (node.type === "Dimension") {
      const u = node.unit.toLowerCase();
      if (UNIT_SLUGS[u]) hits.push({ slug: UNIT_SLUGS[u], line, context: ctx });
    } else if (node.type === "Percentage") {
      hits.push({ slug: "css-unit-percent", line, context: ctx });
    } else if (node.type === "Function") {
      const f = FUNCTION_SLUGS[node.name.toLowerCase()];
      if (f) hits.push({ slug: f, line, context: ctx });
    }
  });
}

function collectSelector(sel: csstree.CssNode, line: number, hits: Hit[]) {
  const text = csstree.generate(sel).slice(0, 120);
  let simpleCount = 0;
  csstree.walk(sel, (node) => {
    switch (node.type) {
      case "AttributeSelector": hits.push({ slug: "css-selector-attribute", line, context: text }); simpleCount++; break;
      case "ClassSelector": hits.push({ slug: "css-selector-class", line, context: text }); simpleCount++; break;
      case "IdSelector": hits.push({ slug: "css-selector-id", line, context: text }); simpleCount++; break;
      case "TypeSelector":
        if (node.name === "*") hits.push({ slug: "css-selector-universal", line, context: text });
        else hits.push({ slug: "css-selector-type", line, context: text });
        simpleCount++;
        break;
      case "PseudoClassSelector": {
        const slug = `css-pseudo-class-${node.name.toLowerCase()}`;
        if (getFeature(slug)) hits.push({ slug, line, context: text });
        simpleCount++;
        break;
      }
      case "PseudoElementSelector": {
        const slug = `css-pseudo-element-${node.name.toLowerCase()}`;
        if (getFeature(slug)) hits.push({ slug, line, context: text });
        break;
      }
      case "Combinator": {
        const m: Record<string, string> = { ">": "css-selector-child", "+": "css-selector-adjacent-sibling", "~": "css-selector-general-sibling", " ": "css-selector-descendant" };
        if (m[node.name]) hits.push({ slug: m[node.name], line, context: text });
        simpleCount = 0;
        break;
      }
    }
    if (simpleCount >= 2) {
      hits.push({ slug: "css-selector-chaining", line, context: text });
      simpleCount = -100;
    }
  });
}

function analyzeStylesheet(css: string, baseLine: number, hits: Hit[], untracked: { name: string; line: number }[]) {
  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(css, { positions: true, parseValue: true, onParseError: () => undefined });
  } catch {
    return;
  }
  if (/\/\*/.test(css)) hits.push({ slug: "css-comments", line: baseLine, context: "/* … */" });
  csstree.walk(ast, {
    enter(node: csstree.CssNode) {
      const line = baseLine + (node.loc?.start.line ?? 1) - 1;
      if (node.type === "Atrule") {
        const name = node.name.toLowerCase();
        const prelude = node.prelude ? csstree.generate(node.prelude) : "";
        const ctx = `@${name} ${prelude}`.slice(0, 120);
        if (name === "media") {
          hits.push({ slug: "css-at-media", line, context: ctx });
          if (/prefers-color-scheme/i.test(prelude)) hits.push({ slug: "css-at-media-prefers-color-scheme", line, context: ctx });
          if (/prefers-reduced-motion/i.test(prelude)) hits.push({ slug: "css-at-media-prefers-reduced-motion", line, context: ctx });
          if (/orientation/i.test(prelude)) hits.push({ slug: "css-at-media-orientation", line, context: ctx });
          if (/\(\s*hover/i.test(prelude)) hits.push({ slug: "css-at-media-hover", line, context: ctx });
          if (/device-pixel-ratio|resolution/i.test(prelude)) hits.push({ slug: "css-at-media-device-pixel-ratio", line, context: ctx });
        } else if (name === "font-face") hits.push({ slug: "css-at-font-face", line, context: ctx });
        else if (name === "import") hits.push({ slug: "css-at-import", line, context: ctx });
        else if (name === "keyframes" || name.endsWith("-keyframes")) hits.push({ slug: "css-at-keyframes", line, context: ctx });
        else if (name === "supports") hits.push({ slug: "css-at-supports", line, context: ctx });
        else untracked.push({ name: `@${name}`, line });
      } else if (node.type === "Rule" && node.prelude.type === "SelectorList") {
        if (node.prelude.children.size > 1) hits.push({ slug: "css-selector-grouping", line, context: csstree.generate(node.prelude).slice(0, 120) });
        node.prelude.children.forEach((s) => collectSelector(s, line, hits));
        if (node.block.children.some((c) => c.type === "Rule")) hits.push({ slug: "css-nesting", line, context: csstree.generate(node.prelude).slice(0, 120) });
      } else if (node.type === "Declaration") {
        collectDeclaration(node, line, hits, untracked);
      }
    },
  });
}

const HTML_ELEMENT_SLUGS: Record<string, string> = { h1: "html-h1-h6", h2: "html-h1-h6", h3: "html-h1-h6", h4: "html-h1-h6", h5: "html-h1-h6", h6: "html-h1-h6", ul: "html-lists", ol: "html-lists", dl: "html-lists", s: "html-strike", strike: "html-strike", map: "html-image-maps", header: "html-semantics", footer: "html-semantics", nav: "html-semantics", section: "html-semantics", article: "html-semantics", aside: "html-semantics", main: "html-semantics" };
const HTML_ATTR_SLUGS: Record<string, string> = { align: "html-align", valign: "html-valign", background: "html-background", cellpadding: "html-cellpadding", cellspacing: "html-cellspacing", lang: "html-lang", dir: "html-dir", role: "html-role", srcset: "html-srcset", loading: "html-loading-attribute", target: "html-target", hidden: "html-hidden", required: "html-required", "aria-label": "html-aria-label", "aria-hidden": "html-aria-hidden", "aria-describedby": "html-aria-describedby", "aria-labelledby": "html-aria-labelledby", "aria-live": "html-aria-live", width: "html-width", height: "html-height", popover: "html-popover", inert: "css-inert-attribute" };
const IMAGE_EXT: Record<string, string> = { webp: "image-webp", svg: "image-svg", gif: "image-gif", png: "image-png", jpg: "image-jpg", jpeg: "image-jpg", avif: "image-avif", apng: "image-apng", bmp: "image-bmp", ico: "image-ico", tif: "image-tiff", tiff: "image-tiff", heif: "image-heif", heic: "image-heif" };

function severityFor(clients: ClientSupport[]): Severity | null {
  const key = clients.filter((c) => c.level !== "unknown");
  if (!key.length) return null;
  const unsupported = key.filter((c) => c.level === "unsupported").length;
  const partial = key.filter((c) => c.level === "partial").length;
  if (!unsupported && !partial) return null;
  const ratio = unsupported / key.length;
  const majorDown = clients.some((c) => c.level === "unsupported" && ((c.family === "gmail" && c.platform === "desktop-webmail") || (c.family === "outlook" && c.platform === "windows") || (c.family === "apple-mail" && c.platform === "ios")));
  if (ratio >= 0.5) return "high";
  if (ratio >= 0.2 || majorDown) return "medium";
  return "low";
}

/** Base selectors etc. that are near-universally supported and not worth an issue. */
const QUIET_SLUGS = new Set(["css-selector-type", "css-selector-class", "css-selector-grouping", "css-selector-descendant", "html-doctype", "html-body", "html-div", "html-span", "html-p", "html-table", "html-img", "html-style", "html-comments", "css-comments", "css-unit-px", "css-unit-percent", "html-width", "html-height", "html-align", "html-cellpadding", "html-cellspacing", "html-valign", "css-display", "css-padding", "css-margin", "css-border", "css-width", "css-height", "css-font-size", "css-font-weight", "css-font", "css-line-height", "css-text-align", "css-background-color", "css-color", "css-text-decoration", "html-lang", "html-dir", "html-role", "html-target", "image-png", "image-jpg", "image-gif"]);

/** Detects HTML/CSS features and maps them to Can I Email support data. */
export function analyzeCompatibility(source: string): CompatibilityResult {
  const scan = scanHtml(source);
  const hits: Hit[] = [];
  const untracked: { name: string; line: number }[] = [];

  for (const block of scan.styles) {
    hits.push({ slug: "html-style", line: block.line, context: "<style>" });
    analyzeStylesheet(block.content, scan.lineOf(block.start).line, hits, untracked);
  }
  if (scan.hasDoctype) hits.push({ slug: "html-doctype", line: 1, context: "<!DOCTYPE html>" });

  for (const t of scan.tags) {
    if (t.kind !== "open") continue;
    const el = HTML_ELEMENT_SLUGS[t.name] ?? (getFeature(`html-${t.name}`) ? `html-${t.name}` : null);
    if (el) hits.push({ slug: el, line: t.line, context: `<${t.name}>` });
    if (t.name === "input") {
      const type = (attr(t, "type") ?? "text").toLowerCase();
      if (getFeature(`html-input-${type}`)) hits.push({ slug: `html-input-${type}`, line: t.line, context: `<input type="${type}">` });
    }
    if (t.name === "button") {
      const type = (attr(t, "type") ?? "submit").toLowerCase();
      if (getFeature(`html-button-${type}`)) hits.push({ slug: `html-button-${type}`, line: t.line, context: `<button type="${type}">` });
    }
    if (t.name === "meta" && /color-scheme/i.test(attr(t, "name") ?? "")) hits.push({ slug: "html-meta-color-scheme", line: t.line, context: `<meta name="${attr(t, "name")}">` });
    for (const a of t.attrs) {
      const slug = HTML_ATTR_SLUGS[a.name];
      if (slug && !(a.name === "width" || a.name === "height") ) hits.push({ slug, line: t.line, context: `${a.name}="${(a.value ?? "").slice(0, 40)}"` });
      if (a.name === "style" && a.value) {
        try {
          const ast = csstree.parse(a.value, { context: "declarationList", parseValue: true, onParseError: () => undefined });
          csstree.walk(ast, { visit: "Declaration", enter: (d: csstree.Declaration) => collectDeclaration(d, t.line, hits, untracked) });
        } catch {
          /* malformed inline CSS is reported by the validator */
        }
      }
    }
    if (t.name === "a") {
      const href = attr(t, "href") ?? "";
      if (/^mailto:/i.test(href)) hits.push({ slug: "html-mailto-links", line: t.line, context: href.slice(0, 60) });
      if (href.startsWith("#") && href.length > 1) hits.push({ slug: "html-anchor-links", line: t.line, context: href });
    }
    if (t.name === "img") {
      const src = attr(t, "src") ?? "";
      if (/^data:/i.test(src)) hits.push({ slug: "image-base64", line: t.line, context: "data: URI" });
      else {
        const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(src)?.[1]?.toLowerCase();
        if (ext && IMAGE_EXT[ext]) hits.push({ slug: IMAGE_EXT[ext], line: t.line, context: src.slice(-60) });
      }
    }
  }

  // group
  const grouped = new Map<string, Hit[]>();
  for (const h of hits) {
    if (!getFeature(h.slug)) continue;
    const list = grouped.get(h.slug) ?? [];
    list.push(h);
    grouped.set(h.slug, list);
  }

  const features: FeatureUsage[] = [];
  for (const [slug, list] of grouped) {
    const f = getFeature(slug)!;
    const s = featureSummary(f);
    const seen = new Set<number>();
    const occurrences = list.filter((h) => (seen.has(h.line) ? false : (seen.add(h.line), true))).slice(0, 25).map((h) => ({ line: h.line, context: h.context }));
    features.push({
      slug,
      title: f.title,
      category: f.category,
      url: f.url,
      lastTestDate: f.lastTestDate,
      occurrences,
      overall: s.overall,
      supportPct: s.pct,
      counts: s.counts,
      clients: KEY_CLIENTS.map((c) => clientSupport(f, c.family, c.platform, c.label)),
      notes: f.notes,
    });
  }
  const rank: Record<SupportLevel, number> = { unsupported: 0, partial: 1, unknown: 2, supported: 3 };
  features.sort((a, b) => rank[a.overall] - rank[b.overall] || (a.supportPct ?? 101) - (b.supportPct ?? 101) || a.title.localeCompare(b.title));

  const summary: Record<SupportLevel, number> = { supported: 0, partial: 0, unsupported: 0, unknown: 0 };
  for (const f of features) summary[f.overall]++;

  const keySummary: Record<SupportLevel, number> = { supported: 0, partial: 0, unsupported: 0, unknown: 0 };
  for (const f of features) keySummary[keyLevel(f)]++;

  const clientSummary = KEY_CLIENTS.map((c) => {
    const row = { label: c.label, family: c.family, platform: c.platform, supported: 0, partial: 0, unsupported: 0, unknown: 0 };
    for (const f of features) row[f.clients.find((x) => x.family === c.family && x.platform === c.platform)!.level]++;
    return row;
  });

  const issues: Issue[] = [];
  for (const f of features) {
    if (QUIET_SLUGS.has(f.slug)) continue;
    const sev = severityFor(f.clients);
    if (!sev) continue;
    const bad = f.clients.filter((c) => c.level === "unsupported").map((c) => c.label);
    const partial = f.clients.filter((c) => c.level === "partial").map((c) => c.label);
    const isOutlook = bad.some((b) => b.startsWith("Outlook")) && bad.length <= 3;
    const isGmail = bad.some((b) => b.startsWith("Gmail"));
    issues.push({
      id: `compat-${f.slug}`,
      ruleId: `caniemail:${f.slug}`,
      category: isOutlook ? "outlook" : isGmail ? "gmail" : "compatibility",
      severity: sev,
      title: `${f.title} has limited support`,
      description: [bad.length ? `Not supported in: ${bad.join(", ")}.` : "", partial.length ? `Partial support in: ${partial.join(", ")}.` : ""].filter(Boolean).join(" "),
      line: f.occurrences[0]?.line,
      snippet: f.occurrences[0]?.context,
      whyItMatters: `Can I Email (tested ${f.lastTestDate}) reports ${f.counts.unsupported} unsupported and ${f.counts.partial} partial results across ${f.counts.supported + f.counts.partial + f.counts.unsupported} tested clients. Styling that depends on it may break where it is ignored.`,
      recommendation: `Provide a fallback for clients without support, or test in those clients. Details: ${f.url}`,
      source: "caniemail",
    });
  }

  const untrackedUnique = [...new Map(untracked.map((u) => [u.name, u])).values()].slice(0, 30);
  return { features, untracked: untrackedUnique, summary, keySummary, clientSummary, source: CANIEMAIL_SOURCE, issues };
}

/** Worst support level among the key clients (unknown only if none were tested). */
export function keyLevel(f: Pick<FeatureUsage, "clients">): SupportLevel {
  const levels = f.clients.map((c) => c.level);
  if (levels.includes("unsupported")) return "unsupported";
  if (levels.includes("partial")) return "partial";
  if (levels.includes("supported")) return "supported";
  return "unknown";
}
