import { keyLevel, type CompatibilityResult } from "./compat";
import type { LinkStatus } from "./link-check-types";
import { countIssues, scoreIssues, type Issue, type IssueCategory, type IssueCounts } from "./types";

export interface QaSection {
  key: "html" | "css" | "responsive" | "accessibility" | "images" | "links" | "ai";
  title: string;
  status: "pass" | "warn" | "fail" | "not-run";
  summary: string;
  issueIds: string[];
  counts: IssueCounts;
}

export interface QaReport {
  title: string;
  score: number;
  counts: IssueCounts & { compat_unsupported: number; compat_partial: number; links_broken: number };
  sections: QaSection[];
  issues: Issue[];
  suggestions: string[];
  compatibility: Pick<CompatibilityResult, "summary" | "keySummary" | "clientSummary" | "source"> & { features: { slug: string; title: string; overall: string; supportPct: number | null; url: string; lines: number[] }[] };
  links: LinkStatus[] | null;
  ai: { model: string; summary: string; issueCount: number; reportId: string } | null;
  sizeBytes: number;
  generatedAt: string;
}

const SECTION_CATS: Record<QaSection["key"], IssueCategory[]> = {
  html: ["html", "size", "rendering", "ampscript"],
  css: ["css", "compatibility", "outlook", "gmail", "dark-mode"],
  responsive: ["responsive"],
  accessibility: ["accessibility"],
  images: ["images"],
  links: ["links"],
  ai: [],
};
const SECTION_TITLES: Record<QaSection["key"], string> = {
  html: "HTML validation", css: "CSS compatibility", responsive: "Responsiveness", accessibility: "Accessibility", images: "Image checks", links: "Link checks", ai: "AI analysis",
};

export function linkIssues(results: LinkStatus[]): Issue[] {
  return results.filter((r) => !r.ok).map((r, i) => ({
    id: `link-${i}`,
    ruleId: r.kind === "image" ? "image-unreachable" : "link-unreachable",
    category: r.kind === "image" ? "images" : "links",
    severity: r.kind === "image" ? "high" : r.status === 404 || r.status === 410 ? "high" : "medium",
    title: r.kind === "image" ? `Image could not be loaded${r.status ? ` (HTTP ${r.status})` : ""}` : `Link check failed${r.status ? ` (HTTP ${r.status})` : ""}`,
    description: `${r.url}${r.error ? ` — ${r.error}` : ""}`,
    snippet: r.url,
    whyItMatters: r.kind === "image" ? "Recipients will see a broken image placeholder." : "Recipients clicking this link will hit an error page. (Some sites block automated checks; verify manually.)",
    recommendation: r.kind === "image" ? "Upload the image to a public https host and update src." : "Fix or replace the URL, then re-run the link check.",
    source: "link-check",
  }));
}

export function buildQaReport(input: {
  title: string;
  html: string;
  validation: Issue[];
  compat: CompatibilityResult;
  links: LinkStatus[] | null;
  ai: { model: string; summary: string; issues: Issue[]; reportId: string } | null;
}): QaReport {
  const issues: Issue[] = [...input.validation, ...input.compat.issues, ...(input.links ? linkIssues(input.links) : []), ...(input.ai?.issues ?? [])];
  const sections: QaSection[] = (Object.keys(SECTION_TITLES) as QaSection["key"][]).map((key) => {
    const own = key === "ai" ? input.ai?.issues ?? [] : issues.filter((i) => i.source !== "ai" && SECTION_CATS[key].includes(i.category));
    const counts = countIssues(own);
    const notRun = (key === "links" && !input.links) || (key === "ai" && !input.ai);
    const status: QaSection["status"] = notRun ? "not-run" : counts.critical || counts.high ? "fail" : counts.medium || counts.low ? "warn" : "pass";
    let summary: string;
    if (notRun) summary = key === "links" ? "Link check was not run for this report." : "AI analysis was not run for this version.";
    else if (key === "css") summary = `${input.compat.features.length} features detected · ${input.compat.keySummary.unsupported} unsupported in at least one key client · ${input.compat.keySummary.partial} partially supported.`;
    else if (key === "links" && input.links) summary = `${input.links.length} URLs checked · ${input.links.filter((l) => !l.ok).length} failed.`;
    else if (key === "ai" && input.ai) summary = input.ai.summary;
    else summary = own.length ? `${own.length} issue${own.length === 1 ? "" : "s"} found.` : "No issues found.";
    return { key, title: SECTION_TITLES[key], status, summary, issueIds: own.map((i) => i.id), counts };
  });

  const counts = countIssues(issues);
  const suggestions = buildSuggestions(issues, input.compat);
  return {
    title: input.title,
    score: scoreIssues(issues),
    counts: {
      ...counts,
      compat_unsupported: input.compat.keySummary.unsupported,
      compat_partial: input.compat.keySummary.partial,
      links_broken: input.links?.filter((l) => !l.ok).length ?? 0,
    },
    sections,
    issues,
    suggestions,
    compatibility: {
      summary: input.compat.summary,
      keySummary: input.compat.keySummary,
      clientSummary: input.compat.clientSummary,
      source: input.compat.source,
      features: input.compat.features.map((f) => ({ slug: f.slug, title: f.title, overall: keyLevel(f), supportPct: f.supportPct, url: f.url, lines: f.occurrences.map((o) => o.line) })),
    },
    links: input.links,
    ai: input.ai ? { model: input.ai.model, summary: input.ai.summary, issueCount: input.ai.issues.length, reportId: input.ai.reportId } : null,
    sizeBytes: new TextEncoder().encode(input.html).length,
    generatedAt: new Date().toISOString(),
  };
}

function buildSuggestions(issues: Issue[], compat: CompatibilityResult): string[] {
  const ids = new Set(issues.map((i) => i.ruleId));
  const s: string[] = [];
  if (ids.has("not-responsive") || ids.has("viewport")) s.push("Adopt a fluid-hybrid layout (width:100%; max-width:600px) with MSO ghost tables, and add a viewport meta tag.");
  if (ids.has("img-alt")) s.push("Add alt text to every image so the email still communicates with images blocked.");
  if (ids.has("img-width")) s.push("Give every image an HTML width attribute so Outlook for Windows renders it at the intended size.");
  if (ids.has("not-inlined")) s.push("Inline critical CSS with a build step (e.g. juice) and keep <style> for media queries and dark mode.");
  if (ids.has("outlook-button") || ids.has("outlook-bg-image") || ids.has("outlook-ghost-table")) s.push("Add Outlook-specific fallbacks (VML buttons/backgrounds, ghost tables) inside <!--[if mso]> conditionals.");
  if (ids.has("color-scheme")) s.push("Declare color-scheme and provide @media (prefers-color-scheme: dark) styles to control dark-mode rendering.");
  if (ids.has("gmail-clip") || ids.has("size-near-clip")) s.push("Reduce HTML size below 80 KB: strip comments, unused CSS and redundant attributes.");
  if (compat.features.some((f) => f.slug === "css-display-flex" || f.slug === "css-display-grid")) s.push("Replace flexbox/grid layout with tables for consistent rendering across Outlook and older clients.");
  if (ids.has("table-role")) s.push("Add role=\"presentation\" to layout tables to improve screen-reader output.");
  if (!s.length && issues.length) s.push("Work through the outstanding issues from Critical to Low, then re-run this report.");
  if (!issues.length) s.push("No automated issues found. Test in real clients (e.g. Litmus / Email on Acid) before sending.");
  return s;
}
