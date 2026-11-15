import type { Issue } from "./types";
import type { QaReport } from "./qa";

export type StoredReport = {
  id: string; title: string; kind: string; score: number | null; created_at: string; model: string | null; summary: string | null;
  issues: Issue[]; sections: Partial<Omit<QaReport, "issues" | "title" | "score" | "counts">>; counts: Record<string, number>;
  projectName: string | null;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function reportToMarkdown(r: StoredReport): string {
  const lines: string[] = [`# ${r.title}`, "", `Generated ${new Date(r.created_at).toUTCString()}${r.projectName ? ` · ${r.projectName}` : ""}`, ""];
  if (r.score != null) lines.push(`**Score:** ${r.score}/100  `, `**Issues:** ${r.counts.critical ?? 0} critical · ${r.counts.high ?? 0} high · ${r.counts.medium ?? 0} medium · ${r.counts.low ?? 0} low`, "");
  for (const s of r.sections.sections ?? []) lines.push(`## ${s.title} — ${s.status.toUpperCase()}`, "", s.summary, "");
  if (r.sections.compatibility) {
    const c = r.sections.compatibility;
    lines.push("## Compatibility data", "", `Source: ${c.source.name} (${c.source.url}), ${c.source.package}, last updated ${c.source.lastUpdated}, ${c.source.featureCount} features.`, "");
    lines.push("| Feature | Overall | Support | Lines |", "|---|---|---|---|");
    for (const f of c.features) lines.push(`| ${f.title} | ${f.overall} | ${f.supportPct ?? "–"}% | ${f.lines.slice(0, 5).join(", ")} |`);
    lines.push("");
  }
  lines.push("## Outstanding issues", "");
  for (const i of r.issues) {
    lines.push(`### [${i.severity.toUpperCase()}] ${i.title}${i.line ? ` (line ${i.line})` : ""}`, "", i.description, "", `**Why it matters:** ${i.whyItMatters}`, "", `**Fix:** ${i.recommendation}`, "");
    if (i.suggestedCode) lines.push("```html", i.suggestedCode, "```", "");
  }
  if (r.sections.suggestions?.length) lines.push("## Suggested improvements", "", ...r.sections.suggestions.map((s) => `- ${s}`), "");
  lines.push("---", "Previews and compatibility results are based on Can I Email data and automated checks; they are not screenshots from real email clients.");
  return lines.join("\n");
}

export function reportToHtml(r: StoredReport): string {
  const sevColor: Record<string, string> = { critical: "#dc2626", high: "#ea580c", medium: "#ca8a04", low: "#2563eb" };
  const statusColor: Record<string, string> = { pass: "#16a34a", warn: "#ca8a04", fail: "#dc2626", "not-run": "#6b7280" };
  const sections = (r.sections.sections ?? []).map((s) => `<tr><td>${esc(s.title)}</td><td><b style="color:${statusColor[s.status]}">${esc(s.status.toUpperCase())}</b></td><td>${esc(s.summary)}</td></tr>`).join("");
  const issues = r.issues.map((i) => `<div class="issue"><div><span class="sev" style="background:${sevColor[i.severity]}">${esc(i.severity)}</span> <b>${esc(i.title)}</b>${i.line ? ` <span class="muted">line ${i.line}</span>` : ""}</div><p>${esc(i.description)}</p><p><b>Why it matters:</b> ${esc(i.whyItMatters)}</p><p><b>Fix:</b> ${esc(i.recommendation)}</p>${i.suggestedCode ? `<pre>${esc(i.suggestedCode)}</pre>` : ""}</div>`).join("");
  const c = r.sections.compatibility;
  const compat = c ? `<h2>Compatibility</h2><p class="muted">Source: ${esc(c.source.name)} — ${esc(c.source.url)} · ${esc(c.source.package)} · data updated ${esc(c.source.lastUpdated)} · ${c.source.featureCount} features tracked.</p><table><tr><th>Feature</th><th>Overall</th><th>Support</th><th>Lines</th></tr>${c.features.map((f) => `<tr><td><a href="${esc(f.url)}">${esc(f.title)}</a></td><td>${esc(f.overall)}</td><td>${f.supportPct ?? "–"}%</td><td>${esc(f.lines.slice(0, 5).join(", "))}</td></tr>`).join("")}</table>` : "";
  const sugg = r.sections.suggestions?.length ? `<h2>Suggested improvements</h2><ul>${r.sections.suggestions.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
body{font:14px/1.5 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#111827;max-width:900px;margin:40px auto;padding:0 20px}
h1{margin-bottom:4px}.muted{color:#6b7280}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
.score{font-size:40px;font-weight:700}.issue{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin:10px 0}.sev{color:#fff;border-radius:4px;padding:1px 6px;font-size:11px;text-transform:uppercase}
pre{background:#f3f4f6;padding:10px;border-radius:6px;overflow:auto;font-size:12px}</style></head><body>
<h1>${esc(r.title)}</h1><p class="muted">Generated ${esc(new Date(r.created_at).toUTCString())}${r.projectName ? ` · ${esc(r.projectName)}` : ""} · MailCraft AI</p>
${r.score != null ? `<p><span class="score">${r.score}</span>/100 &nbsp; ${r.counts.critical ?? 0} critical · ${r.counts.high ?? 0} high · ${r.counts.medium ?? 0} medium · ${r.counts.low ?? 0} low</p>` : ""}
<h2>Summary</h2><table><tr><th>Check</th><th>Status</th><th>Result</th></tr>${sections}</table>
${compat}<h2>Outstanding issues (${r.issues.length})</h2>${issues || "<p>No issues.</p>"}${sugg}
<p class="muted">Automated checks and Can I Email data; not screenshots from real email clients.</p></body></html>`;
}
