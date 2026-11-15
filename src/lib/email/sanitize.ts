import { parseDocument } from "htmlparser2";
import render from "dom-serializer";
import { type ChildNode, type Element, isTag, isComment } from "domhandler";

/**
 * Email-aware sanitizer for preview rendering.
 *
 * Removes anything that can execute script or navigate the host page, while
 * preserving what email developers rely on: tables, inline/embedded CSS,
 * MSO conditional comments, VML (v:*, o:*), and personalization strings.
 *
 * This is one layer of defence. Previews are ALSO rendered in an iframe with a
 * restrictive `sandbox` (no allow-scripts / allow-same-origin) and a CSP meta
 * tag, so a sanitizer miss still cannot run script in the app's origin.
 */

const BLOCKED_ELEMENTS = new Set([
  "script", "iframe", "frame", "frameset", "object", "embed", "applet", "base", "portal", "noscript", "template",
]);

const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "background", "poster", "xlink:href", "data", "srcset", "lowsrc", "dynsrc", "ping", "cite"]);

const DANGEROUS_URL = /^\s*(?:javascript|vbscript|livescript|mocha)\s*:|^\s*data\s*:\s*(?:text\/html|application\/(?:xhtml|x-javascript|javascript)|image\/svg\+xml)/i;

export type SanitizeReport = { removedElements: string[]; removedAttributes: string[] };

function stripControlChars(value: string) {
  // Browsers ignore tabs/newlines/control chars inside schemes ("java\tscript:").
  return value.replace(/[\u0000- \u007f-\u009f]+/g, "");
}

export function isDangerousUrl(value: string): boolean {
  return DANGEROUS_URL.test(stripControlChars(decodeEntitiesLoose(value)));
}

function decodeEntitiesLoose(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;|&newline;/gi, "");
}

function sanitizeElement(el: Element, report: SanitizeReport) {
  for (const name of Object.keys(el.attribs)) {
    const lower = name.toLowerCase();
    const value = el.attribs[name] ?? "";
    if (lower.startsWith("on")) {
      delete el.attribs[name];
      report.removedAttributes.push(`${el.name}[${lower}]`);
      continue;
    }
    if (lower === "srcdoc") {
      delete el.attribs[name];
      report.removedAttributes.push(`${el.name}[srcdoc]`);
      continue;
    }
    if (URL_ATTRIBUTES.has(lower)) {
      const candidates = lower === "srcset" ? value.split(",").map((s) => s.trim().split(/\s+/)[0] ?? "") : [value];
      if (candidates.some(isDangerousUrl)) {
        delete el.attribs[name];
        report.removedAttributes.push(`${el.name}[${lower}]`);
      }
    }
    if (lower === "style" && /expression\s*\(|javascript\s*:|-moz-binding|behavior\s*:/i.test(value)) {
      delete el.attribs[name];
      report.removedAttributes.push(`${el.name}[style]`);
    }
  }
  if (el.name === "meta" && /refresh/i.test(el.attribs["http-equiv"] ?? "")) return false;
  if (el.name === "link" && /\b(?:import|prefetch|preload|modulepreload|serviceworker)\b/i.test(el.attribs.rel ?? "")) return false;
  return true;
}

function walk(nodes: ChildNode[], report: SanitizeReport) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (isTag(node)) {
      const name = node.name.toLowerCase();
      const local = name.includes(":") ? name.split(":").pop()! : name;
      if (BLOCKED_ELEMENTS.has(name) || BLOCKED_ELEMENTS.has(local) || !sanitizeElement(node, report)) {
        report.removedElements.push(name);
        nodes.splice(i, 1);
        continue;
      }
      walk(node.children, report);
    } else if (isComment(node)) {
      // Keep MSO conditionals; they're inert in browsers.
      continue;
    } else if ("children" in node && Array.isArray((node as { children?: ChildNode[] }).children)) {
      walk((node as unknown as { children: ChildNode[] }).children, report);
    }
  }
}

export function sanitizeEmailHtml(html: string): { html: string; report: SanitizeReport } {
  const report: SanitizeReport = { removedElements: [], removedAttributes: [] };
  const doc = parseDocument(html, { lowerCaseAttributeNames: false, lowerCaseTags: false, recognizeSelfClosing: true, decodeEntities: false });
  walk(doc.children, report);
  const out = render(doc, { decodeEntities: false, encodeEntities: false, selfClosingTags: false, emptyAttrs: true });
  return { html: out, report };
}
