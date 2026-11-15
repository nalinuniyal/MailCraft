import { scanHtml, attr, hasAttr, lineText, VOID_ELEMENTS, type ScanResult, type TagToken } from "./parse";
import { GMAIL_CLIP_BYTES } from "./limits";
import type { Issue, IssueCategory, Severity } from "./types";
import { byteLength } from "@/lib/utils";

type Draft = Omit<Issue, "id" | "source" | "snippet"> & { snippet?: string };

/** Elements whose end tag may legitimately be omitted per the HTML spec. */
const OPTIONAL_END = new Set(["html", "head", "body", "p", "li", "dt", "dd", "tr", "td", "th", "tbody", "thead", "tfoot", "option", "colgroup", "caption", "rt", "rp", "optgroup"]);
/** Structural elements where a missing end tag commonly breaks email layouts. */
const STRUCTURAL = new Set(["table", "tbody", "thead", "tfoot", "tr", "td", "th", "div", "center", "a"]);
const TABLE_PARTS: Record<string, string[]> = {
  tr: ["table", "tbody", "thead", "tfoot"],
  td: ["tr"],
  th: ["tr"],
  tbody: ["table"],
  thead: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
};
const BLOCK_IN_P = new Set(["div", "table", "p", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "hr", "center", "form"]);
const INLINE = new Set(["span", "a", "strong", "b", "em", "i", "font", "small", "u", "s", "sup", "sub"]);
const BLOCK = new Set(["div", "table", "p", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "center"]);

function snippetFor(scan: ScanResult, line?: number) {
  if (!line) return undefined;
  const text = lineText(scan.source, line).trim();
  return text.length > 220 ? `${text.slice(0, 220)}…` : text;
}

/** Validates HTML structure and email best practices. Deterministic and source-line accurate. */
export function validateEmail(source: string): Issue[] {
  const scan = scanHtml(source);
  const drafts: Draft[] = [];
  const add = (d: Draft) => drafts.push(d);

  checkStructure(scan, add);
  checkDocument(scan, add, source);
  checkImages(scan, add);
  checkLinks(scan, add);
  checkLayout(scan, add, source);
  checkAccessibility(scan, add);
  checkClientSpecific(scan, add, source);

  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const d of drafts) {
    const key = `${d.ruleId}:${d.line ?? 0}:${d.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...d, id: `rule-${out.length}-${d.ruleId}-${d.line ?? 0}`, source: "rule", snippet: d.snippet ?? snippetFor(scan, d.line) });
  }
  return out;
}

function issue(ruleId: string, category: IssueCategory, severity: Severity, title: string, line: number | undefined, description: string, whyItMatters: string, recommendation: string, suggestedCode?: string): Draft {
  return { ruleId, category, severity, title, line, description, whyItMatters, recommendation, suggestedCode };
}

// ---------------------------------------------------------------------------
function checkStructure(scan: ScanResult, add: (d: Draft) => void) {
  const stack: TagToken[] = [];
  const ids = new Map<string, number>();

  for (const t of scan.tags) {
    if (t.kind === "open") {
      const id = attr(t, "id");
      if (id) {
        if (ids.has(id)) add(issue("duplicate-id", "html", "low", `Duplicate id “${id}”`, t.line, `The id “${id}” is also used on line ${ids.get(id)}.`, "Duplicate ids make anchors and CSS targeting unpredictable.", "Give each element a unique id, or use a class instead."));
        else ids.set(id, t.line);
      }
      if (VOID_ELEMENTS.has(t.name) || t.selfClosing) continue;
      if (t.name.includes(":")) {
        // VML/Office namespaced elements: track but don't nest-check
        stack.push(t);
        continue;
      }
      // invalid nesting
      const parent = stack[stack.length - 1];
      const required = TABLE_PARTS[t.name];
      if (required && parent && !required.includes(parent.name) && !parent.name.includes(":")) {
        if (!(t.name === "tr" && parent.name === "table")) {
          add(issue("invalid-nesting", "html", "high", `<${t.name}> inside <${parent.name}>`, t.line, `<${t.name}> must be a child of ${required.map((r) => `<${r}>`).join(" or ")}, but its parent is <${parent.name}> (line ${parent.line}).`, "Browsers and email clients repair invalid table markup differently, so the layout can collapse or shift in some clients.", `Wrap the <${t.name}> in the correct parent element.`));
        }
      }
      if (parent?.name === "p" && BLOCK_IN_P.has(t.name)) {
        add(issue("block-in-p", "html", "medium", `<${t.name}> inside <p>`, t.line, `A <${t.name}> cannot be nested in a <p> (opened on line ${parent.line}); parsers implicitly close the paragraph.`, "The implicit close produces an empty paragraph and unexpected spacing in many clients.", "Replace the outer <p> with a <div> or <td>, or move the block element outside the paragraph."));
      }
      if (t.name === "a" && stack.some((s) => s.name === "a")) {
        add(issue("nested-links", "html", "high", "Nested <a> links", t.line, "A link is nested inside another link.", "Nested links are invalid; clients split them unpredictably and clicks may go to the wrong URL.", "Close the outer link before starting a new one."));
      }
      if (BLOCK.has(t.name) && parent && INLINE.has(parent.name) && parent.name !== "a") {
        add(issue("block-in-inline", "html", "medium", `<${t.name}> inside inline <${parent.name}>`, t.line, `Block element <${t.name}> is nested inside inline <${parent.name}> (line ${parent.line}).`, "Some clients (notably Outlook for Windows) drop or reflow block content inside inline elements.", `Move the <${t.name}> outside the <${parent.name}>, or apply the inline styles to the block instead.`));
      }
      stack.push(t);
      continue;
    }

    // close tag
    if (VOID_ELEMENTS.has(t.name)) {
      if (t.name !== "br") continue;
      add(issue("void-close", "html", "low", `Stray </${t.name}>`, t.line, `<${t.name}> is a void element and has no closing tag.`, "Some parsers treat </br> as <br>, adding unexpected line breaks.", `Remove </${t.name}>.`));
      continue;
    }
    const idx = findLastIndex(stack, (s) => s.name === t.name);
    if (idx === -1) {
      add(issue("stray-close", "html", "high", `Unexpected closing tag </${t.name}>`, t.line, `</${t.name}> does not match any open <${t.name}>.`, "Stray closing tags indicate broken structure; clients repair it differently, which can break layout.", `Remove the stray </${t.name}> or add the missing opening tag.`));
      continue;
    }
    // everything above idx was never closed
    for (let j = stack.length - 1; j > idx; j--) {
      const open = stack[j];
      if (OPTIONAL_END.has(open.name) || open.name.includes(":")) continue;
      add(missingClose(open, t));
    }
    stack.length = idx;
  }
  for (const open of stack) {
    if (OPTIONAL_END.has(open.name) || open.name.includes(":")) continue;
    add(missingClose(open));
  }
}

function missingClose(open: TagToken, closedBy?: TagToken): Draft {
  const structural = STRUCTURAL.has(open.name);
  return issue(
    "missing-close",
    "html",
    structural ? "critical" : "high",
    `Missing closing tag for <${open.name}>`,
    open.line,
    closedBy ? `<${open.name}> opened on line ${open.line} is never closed before </${closedBy.name}> on line ${closedBy.line}.` : `<${open.name}> opened on line ${open.line} is never closed.`,
    structural ? "Unclosed table and container elements are one of the most common causes of broken layouts, especially in Outlook and Gmail." : "Unclosed elements make styles leak into following content.",
    `Add </${open.name}> where the element should end.`,
    `</${open.name}>`,
  );
}

function findLastIndex<T>(arr: T[], fn: (t: T) => boolean) {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
  return -1;
}

// ---------------------------------------------------------------------------
function checkDocument(scan: ScanResult, add: (d: Draft) => void, source: string) {
  const first = (name: string) => scan.tags.find((t) => t.kind === "open" && t.name === name);
  const html = first("html");
  const metas = scan.tags.filter((t) => t.kind === "open" && t.name === "meta");
  if (!scan.hasDoctype) {
    add(issue("doctype", "html", "medium", "Missing <!DOCTYPE html>", 1, "The document has no doctype.", "Without a doctype, clients render in quirks mode: box sizing, table spacing and line-height change.", "Add a doctype as the first line.", "<!DOCTYPE html>"));
  }
  if (!html) add(issue("no-html", "html", "low", "Missing <html> element", 1, "No <html> root element was found.", "Some clients wrap fragments inconsistently, losing <head> styles and meta tags.", "Wrap the email in <html>, <head> and <body>."));
  if (!metas.some((m) => hasAttr(m, "charset") || /content-type/i.test(attr(m, "http-equiv") ?? ""))) {
    add(issue("charset", "html", "medium", "Missing character encoding", first("head")?.line ?? 1, "No <meta charset> was found.", "Without an explicit encoding, accented characters, emoji and symbols can display as garbage in some clients.", "Declare UTF-8 in the <head>.", '<meta charset="utf-8">'));
  }
  if (!metas.some((m) => attr(m, "name")?.toLowerCase() === "viewport")) {
    add(issue("viewport", "responsive", "high", "Missing viewport meta tag", first("head")?.line ?? 1, "No <meta name=\"viewport\"> was found.", "Mobile clients such as iOS Mail may render the email zoomed out, making text tiny.", "Add a responsive viewport meta tag.", '<meta name="viewport" content="width=device-width, initial-scale=1">'));
  }
  if (!first("title")) add(issue("title", "accessibility", "low", "Missing <title>", first("head")?.line ?? 1, "The document has no <title>.", "Screen readers announce the title, and it appears in web views and browser tabs.", "Add a <title> matching the subject line.", "<title>Your subject line</title>"));
  if (html && !attr(html, "lang")) {
    add(issue("lang", "accessibility", "medium", "Missing lang attribute on <html>", html.line, "<html> has no lang attribute.", "Screen readers use lang to choose pronunciation; without it content may be read in the wrong language.", 'Add lang (and dir if needed) to <html>.', '<html lang="en" dir="ltr">'));
  }
  if (!/color-scheme/i.test(source)) {
    add(issue("color-scheme", "dark-mode", "low", "No dark-mode colour scheme declared", first("head")?.line ?? 1, "No color-scheme meta tag or CSS property was found.", "Clients that support it (Apple Mail, iOS) will apply their own dark-mode inversion instead of your intended colours.", "Declare supported schemes and add @media (prefers-color-scheme: dark) styles.", '<meta name="color-scheme" content="light dark">\n<meta name="supported-color-schemes" content="light dark">'));
  }
}

// ---------------------------------------------------------------------------
function checkImages(scan: ScanResult, add: (d: Draft) => void) {
  for (const t of scan.tags) {
    if (t.kind !== "open" || t.name !== "img") continue;
    const src = attr(t, "src");
    if (!hasAttr(t, "alt")) {
      add(issue("img-alt", "accessibility", "high", "Image missing alt attribute", t.line, "This <img> has no alt attribute.", "Images are blocked by default in many clients and are invisible to screen readers; alt text keeps the message understandable.", 'Add descriptive alt text, or alt="" for purely decorative images.', 'alt="Describe the image"'));
    }
    if (src == null || src.trim() === "") {
      add(issue("img-src-missing", "images", "high", "Image without a source", t.line, "This <img> has an empty or missing src.", "An empty src shows a broken-image icon and some clients request the page URL itself.", "Set src to an absolute https URL, or remove the image."));
    } else if (!/^(https?:|cid:|data:|%%|\{\{|\[\[)/i.test(src.trim())) {
      add(issue("img-src-relative", "images", "high", "Broken image reference (relative or local path)", t.line, `src="${src}" is not an absolute URL.`, "Email has no base URL: relative paths, local files and localhost URLs never load for recipients.", "Host the image and use an absolute https URL.", `src="https://cdn.example.com/${src.replace(/^\.?\//, "")}"`));
    } else if (/^http:\/\//i.test(src) || /\/\/(localhost|127\.|192\.168\.|10\.)/i.test(src)) {
      add(issue("img-src-insecure", "images", "medium", /localhost|127\.|192\.168\.|10\./.test(src) ? "Image points to a local/private host" : "Image served over http", t.line, `src="${src}"`, "Private hosts are unreachable for recipients, and http images trigger mixed-content blocking or warnings in some clients.", "Serve images from a public https host."));
    }
    if (!hasAttr(t, "width")) {
      add(issue("img-width", "outlook", "medium", "Image without a width attribute", t.line, "This <img> has no HTML width attribute.", "Outlook for Windows ignores CSS width on images and renders them at their natural size, which can blow out the layout.", "Add a width attribute (in pixels, without units) matching the display size.", 'width="600" style="width:100%; max-width:600px; height:auto;"'));
    }
    if (src && /^data:/i.test(src)) {
      add(issue("img-base64", "images", "medium", "Base64-embedded image", t.line, "The image is embedded as a data: URI.", "Gmail and Outlook do not display base64 images, and they inflate message size towards Gmail's clipping limit.", "Host the image and reference it by https URL."));
    }
  }
}

// ---------------------------------------------------------------------------
function checkLinks(scan: ScanResult, add: (d: Draft) => void) {
  const tags = scan.tags;
  for (let i = 0; i < tags.length; i++) {
    const t = tags[i];
    if (t.kind !== "open" || t.name !== "a") continue;
    const href = attr(t, "href");
    if (href == null) {
      if (!hasAttr(t, "name") && !hasAttr(t, "id")) add(issue("link-no-href", "links", "medium", "Link without href", t.line, "This <a> has no href.", "Links without href are not clickable and some clients style them as plain text.", "Add an absolute href, or replace the <a> with a <span>."));
      continue;
    }
    const h = href.trim();
    if (h === "" || h === "#") {
      add(issue("link-placeholder", "links", "high", "Placeholder link (empty or #)", t.line, `href="${href}"`, "Placeholder links send recipients nowhere, which looks broken and hurts click-through.", "Replace with the real destination URL."));
    } else if (/^javascript:/i.test(h)) {
      add(issue("link-javascript", "links", "high", "javascript: link", t.line, "Email clients strip javascript: links.", "The link will do nothing, and some spam filters penalise script URLs.", "Use a normal https link."));
    } else if (!/^(https?:|mailto:|tel:|sms:|#|%%|\{\{|\[\[|\*\|)/i.test(h)) {
      add(issue("link-relative", "links", "high", "Broken link (relative URL)", t.line, `href="${href}" is not an absolute URL.`, "Email has no base URL, so relative links are broken for every recipient.", "Use an absolute https URL.", `href="https://www.example.com/${h.replace(/^\.?\//, "")}"`));
    } else if (/^http:\/\//i.test(h)) {
      add(issue("link-http", "links", "low", "Insecure http link", t.line, `href="${href}"`, "Some clients and browsers warn on insecure links, and many trackers rewrite them anyway.", "Use https."));
    } else if (/^https?:\/\/(www\.)?(example\.(com|org|net)|yourdomain\.com|domain\.com)\b/i.test(h)) {
      add(issue("link-example", "links", "low", "Link still points to an example domain", t.line, `href="${href}"`, "Placeholder domains are easy to ship by mistake.", "Replace with the real destination before sending."));
    }
    // link text heuristics
    const close = tags.slice(i + 1).find((x) => x.kind === "close" && x.name === "a");
    if (close) {
      const inner = scan.source.slice(t.end, close.start);
      const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      const hasImg = /<img\b/i.test(inner);
      if (!text && !hasImg && !attr(t, "aria-label")) add(issue("link-empty-text", "accessibility", "medium", "Link has no text", t.line, "This link contains no readable text or image.", "Screen readers announce it as just “link”.", "Add descriptive link text or an aria-label."));
      if (["click here", "here", "read more", "more", "link"].includes(text)) add(issue("link-text-generic", "accessibility", "low", `Non-descriptive link text “${text}”`, t.line, `Link text is “${text}”.`, "Screen-reader users often navigate by a list of links; generic text gives no context.", "Describe the destination, e.g. “View your order”."));
    }
  }
}

// ---------------------------------------------------------------------------
function cssPx(style: string, prop: string): number | null {
  const m = new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`, "i").exec(style);
  return m ? parseFloat(m[1]) : null;
}

function checkLayout(scan: ScanResult, add: (d: Draft) => void, source: string) {
  const hasMediaQuery = scan.styles.some((s) => /@media[^{]*(max|min)-width/i.test(s.content));
  const hasFluid = /max-width\s*:\s*\d+px/i.test(source) || /width\s*=\s*["']?100%/i.test(source);
  let reportedWide = 0;
  for (const t of scan.tags) {
    if (t.kind !== "open" || !["table", "td", "div", "img", "th"].includes(t.name)) continue;
    const w = attr(t, "width");
    const style = attr(t, "style") ?? "";
    const wNum = w && /^\d+$/.test(w.trim()) ? parseInt(w, 10) : null;
    const sNum = cssPx(style, "width");
    const minW = cssPx(style, "min-width");
    const width = Math.max(wNum ?? 0, sNum ?? 0, minW ?? 0);
    if (width > 640 && reportedWide < 5) {
      reportedWide++;
      add(issue("fixed-width-wide", "responsive", "medium", `Fixed width of ${width}px`, t.line, `<${t.name}> is fixed at ${width}px.`, "Most email clients have a reading pane of 550–650px; wider fixed layouts cause horizontal scrolling or shrinking on mobile.", "Keep the main container at 600–640px and make it fluid on small screens.", 'width="600" style="width:100%; max-width:600px;"'));
    }
    if (minW && minW > 320) {
      add(issue("min-width", "responsive", "medium", `min-width of ${minW}px`, t.line, `<${t.name}> has min-width: ${minW}px.`, "A min-width wider than a phone screen forces horizontal scrolling on mobile.", "Remove the min-width or reduce it below 320px."));
    }
  }
  const widest = scan.tags.filter((t) => t.kind === "open" && (t.name === "table" || t.name === "td")).map((t) => parseInt(attr(t, "width") ?? "", 10)).filter((n) => !Number.isNaN(n));
  if (!hasMediaQuery && !hasFluid && widest.some((n) => n > 480)) {
    add(issue("not-responsive", "responsive", "high", "Layout is not responsive", scan.tags.find((t) => t.name === "table")?.line, "The email uses fixed-width tables without media queries or fluid (max-width / 100%) widths.", "On phones, the layout will be shrunk to fit or need horizontal scrolling, making text unreadable.", "Use a fluid hybrid approach (width:100%; max-width:600px) and/or add @media (max-width:600px) rules to stack columns.", `@media only screen and (max-width: 620px) {\n  .container { width: 100% !important; }\n  .stack { display: block !important; width: 100% !important; }\n}`));
  }
}

// ---------------------------------------------------------------------------
function checkAccessibility(scan: ScanResult, add: (d: Draft) => void) {
  let reported = 0;
  for (const t of scan.tags) {
    if (t.kind !== "open" || t.name !== "table") continue;
    const role = attr(t, "role");
    if (!role && reported < 3) {
      reported++;
      add(issue("table-role", "accessibility", "low", "Layout table without role=\"presentation\"", t.line, "This table has no role attribute.", "Screen readers announce layout tables as data tables (rows, columns, cells), which is noisy and confusing.", 'Add role="presentation" to layout tables.', 'role="presentation"'));
    }
  }
  for (const t of scan.tags) {
    if (t.kind !== "open") continue;
    const style = attr(t, "style") ?? "";
    const fs = cssPx(style, "font-size");
    if (fs !== null && fs < 12 && fs > 0) {
      add(issue("small-font", "accessibility", "low", `Very small text (${fs}px)`, t.line, `font-size: ${fs}px.`, "Text below ~13px is hard to read, and iOS may auto-enlarge it, breaking layout.", "Use at least 14px for body copy (13px minimum for fine print)."));
    }
  }
}

// ---------------------------------------------------------------------------
function checkClientSpecific(scan: ScanResult, add: (d: Draft) => void, source: string) {
  const size = byteLength(source);
  if (size > GMAIL_CLIP_BYTES) {
    add(issue("gmail-clip", "gmail", "high", `Email is ${(size / 1024).toFixed(1)} KB (Gmail clips at ~102 KB)`, undefined, `The HTML is ${(size / 1024).toFixed(1)} KB.`, "Gmail hides everything after ~102 KB behind “[Message clipped]”, often including the footer and unsubscribe link.", "Remove comments and unused CSS, minify, and simplify markup."));
  } else if (size > 80 * 1024) {
    add(issue("size-near-clip", "size", "medium", `Email is ${(size / 1024).toFixed(1)} KB (close to Gmail’s limit)`, undefined, "The HTML is close to Gmail's clipping limit.", "Personalisation and tracking links added by your ESP increase size further at send time.", "Aim for under 80 KB before ESP processing."));
  }
  for (const s of scan.styles) {
    const bytes = byteLength(s.content);
    if (bytes > 16 * 1024) add(issue("gmail-style-size", "gmail", "medium", `<style> block is ${(bytes / 1024).toFixed(1)} KB`, s.line, "Gmail is reported to drop <style> blocks larger than ~16 KB.", "If Gmail discards the block, all embedded and responsive styles are lost.", "Split or trim the CSS and inline critical styles."));
  }
  const links = scan.tags.filter((t) => t.kind === "open" && t.name === "link" && /stylesheet/i.test(attr(t, "rel") ?? ""));
  for (const l of links) add(issue("external-css", "gmail", "medium", "External stylesheet", l.line, "<link rel=\"stylesheet\"> is used.", "Gmail, Outlook and many webmail clients ignore external stylesheets.", "Embed the CSS in a <style> block and inline critical styles."));

  const styleAttrs = scan.tags.filter((t) => t.kind === "open" && attr(t, "style")).length;
  const embedded = scan.styles.reduce((s, b) => s + b.content.length, 0);
  if (embedded > 1500 && styleAttrs < 5) {
    add(issue("not-inlined", "css", "medium", "Styles are not inlined", scan.styles[0]?.line, `Almost all CSS is in <style> blocks (${styleAttrs} inline style attributes).`, "Some clients (e.g. Gmail with non-Google accounts, some Outlook apps and older Android clients) strip <style> blocks, leaving the email unstyled.", "Inline critical layout and typography styles; keep <style> for media queries and dark mode."));
  }
  // malformed inline style
  for (const t of scan.tags) {
    const style = t.kind === "open" ? attr(t, "style") : null;
    if (!style) continue;
    const decls = style.split(";").map((d) => d.trim()).filter(Boolean);
    const bad = decls.find((d) => !/^[-a-zA-Z]+\s*:\s*\S/.test(d));
    if (bad) add(issue("inline-css-syntax", "css", "medium", "Malformed inline CSS", t.line, `Could not parse “${bad.slice(0, 60)}”.`, "Clients discard invalid declarations, and some (e.g. Gmail) discard the entire style attribute.", "Fix the declaration syntax: property: value; separated by semicolons."));
  }
  // Outlook: div max-width layouts without ghost tables
  const usesMaxWidthDiv = scan.tags.some((t) => t.kind === "open" && t.name === "div" && /max-width/i.test(attr(t, "style") ?? ""));
  const hasMso = scan.comments.some((c) => /\[if\s+[^\]]*mso/i.test(c.text));
  if (usesMaxWidthDiv && !hasMso) {
    const t = scan.tags.find((x) => x.kind === "open" && x.name === "div" && /max-width/i.test(attr(x, "style") ?? ""));
    add(issue("outlook-ghost-table", "outlook", "high", "max-width layout without Outlook ghost tables", t?.line, "A <div> relies on max-width but there are no <!--[if mso]> conditional tables.", "Outlook for Windows ignores max-width, so the container expands to full width.", "Wrap the container in an MSO-only fixed-width table.", `<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->\n<div style="max-width:600px; margin:0 auto;">…</div>\n<!--[if mso]></td></tr></table><![endif]-->`));
  }
  // Outlook: CSS background images without VML
  const bgCss = scan.tags.find((t) => t.kind === "open" && /background(-image)?\s*:[^;]*url\(/i.test(attr(t, "style") ?? ""));
  if (bgCss && !/<v:(rect|fill|image)/i.test(source)) {
    add(issue("outlook-bg-image", "outlook", "medium", "CSS background image without VML fallback", bgCss.line, "A background image is set with CSS only.", "Outlook for Windows does not support CSS background images; the image will not appear.", "Add a VML <v:rect> fallback inside MSO conditionals and a solid background-color.", `<!--[if gte mso 9]>\n<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:300px;">\n<v:fill type="frame" src="https://cdn.example.com/bg.jpg" color="#333333" />\n<v:textbox inset="0,0,0,0">\n<![endif]-->\n…content…\n<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->`));
  }
  // Outlook: padded <a> buttons
  const button = scan.tags.find((t) => t.kind === "open" && t.name === "a" && /padding\s*:/i.test(attr(t, "style") ?? "") && /display\s*:\s*inline-block/i.test(attr(t, "style") ?? ""));
  if (button && !/<v:roundrect/i.test(source) && !/mso-padding-alt/i.test(source)) {
    add(issue("outlook-button", "outlook", "medium", "Padded link button will collapse in Outlook", button.line, "An <a> uses padding with display:inline-block.", "Outlook for Windows ignores padding on <a>, so only the text is clickable and the button shape disappears.", "Use a bulletproof button: a padded <td> with bgcolor, or a VML roundrect for Outlook.", `<!--[if mso]>\n<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://example.com" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#4f46e5">\n<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Shop now</center>\n</v:roundrect>\n<![endif]-->\n<!--[if !mso]><!-- -->\n<a href="https://example.com" style="background:#4f46e5;border-radius:4px;color:#ffffff;display:inline-block;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:200px;">Shop now</a>\n<!--<![endif]-->`));
  }
  if (scan.scripts.length) {
    add(issue("script", "html", "high", "<script> in email", scan.scripts[0].line, "The email contains <script>.", "No major email client runs JavaScript; scripts are stripped and can trigger spam filters.", "Remove scripts. Use AMP for Email or links to a web page for interactivity."));
  }
  const forms = scan.tags.filter((t) => t.kind === "open" && t.name === "form");
  if (forms.length) add(issue("form", "rendering", "medium", "<form> in email", forms[0].line, "The email contains a form.", "Forms are unsupported or disabled in Gmail, Outlook and many others.", "Link to a hosted form instead, or provide a fallback link."));

  // Large comments / unnecessary code
  const commentBytes = scan.comments.filter((c) => !/\[if|\[endif|<!\[endif/i.test(c.text)).reduce((s, c) => s + c.text.length, 0);
  if (commentBytes > 2048) add(issue("comments", "size", "low", `${(commentBytes / 1024).toFixed(1)} KB of HTML comments`, scan.comments[0]?.line, "Developer comments add weight to the message.", "Extra bytes push you towards Gmail clipping and slow loading.", "Strip non-conditional comments before sending."));
}
