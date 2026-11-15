"use client";
import * as React from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, Link2, FileCheck2, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IssueList } from "@/components/analysis/issue-list";
import { CompatFeatureTable, CompatSourceNote, SupportLegend } from "@/components/analysis/compat-table";
import { validateEmail } from "@/lib/email/validate";
import { extractUrls, type LinkStatus } from "@/lib/email/link-check-types";
import { linkIssues } from "@/lib/email/qa";
import { createQaReport } from "@/lib/actions/reports";
import type { CompatibilityResult } from "@/lib/email/compat";
import type { Issue } from "@/lib/email/types";
import type { EditorMarker } from "@/components/editor/code-editor";

export interface AnalysisState {
  compat: CompatibilityResult | null;
  compatHtml: string | null;
  links: LinkStatus[] | null;
  linksHtml: string | null;
}

const NO_ISSUES: Issue[] = [];

export function useAnalysis(html: string, onMarkers: (m: EditorMarker[]) => void, extraIssues: Issue[] = NO_ISSUES) {
  const [validation, setValidation] = React.useState<Issue[]>(() => validateEmail(html));
  const [state, setState] = React.useState<AnalysisState>({ compat: null, compatHtml: null, links: null, linksHtml: null });
  const [running, setRunning] = React.useState<null | "analyze" | "links" | "report">(null);

  // Live (debounced) deterministic validation as you type.
  React.useEffect(() => {
    const t = setTimeout(() => setValidation(validateEmail(html)), 500);
    return () => clearTimeout(t);
  }, [html]);

  const issues = React.useMemo(() => {
    const list = [...validation];
    if (state.compat && state.compatHtml === html) list.push(...state.compat.issues);
    if (state.links && state.linksHtml === html) list.push(...linkIssues(state.links));
    list.push(...extraIssues);
    return list;
  }, [validation, state, html, extraIssues]);

  React.useEffect(() => {
    onMarkers(issues.filter((i) => i.line).map((i) => ({ line: i.line!, message: `${i.title}\n${i.recommendation}`, severity: i.severity })));
  }, [issues, onMarkers]);

  const analyze = React.useCallback(async () => {
    setRunning("analyze");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setValidation(json.validation);
      setState((s) => ({ ...s, compat: json.compatibility, compatHtml: html }));
      toast.success(`Analysis complete: ${json.validation.length + json.compatibility.issues.length} issues`);
    } catch (e) {
      toast.error(`Analysis failed: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }, [html]);

  const checkLinks = React.useCallback(async () => {
    const items = extractUrls(html);
    if (!items.length) return void toast.info("No absolute http(s) links or images to check.");
    setRunning("links");
    try {
      const res = await fetch("/api/links/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setState((s) => ({ ...s, links: json.results, linksHtml: html }));
      const broken = (json.results as LinkStatus[]).filter((r) => !r.ok).length;
      toast[broken ? "warning" : "success"](`${json.results.length} URLs checked, ${broken} failed`);
    } catch (e) {
      toast.error(`Link check failed: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }, [html]);

  return { issues, validation, state, running, setRunning, analyze, checkLinks };
}

export function IssuesTab({ analysis, html, projectId, onReveal, renderActions }: { analysis: ReturnType<typeof useAnalysis>; html: string; projectId: string; onReveal: (line: number) => void; renderActions?: (i: Issue) => React.ReactNode }) {
  const { issues, state, running, setRunning, analyze, checkLinks } = analysis;
  const [lastReport, setLastReport] = React.useState<string | null>(null);
  const compatStale = state.compat && state.compatHtml !== html;

  async function generateReport() {
    setRunning("report");
    const res = await createQaReport({ projectId, html, links: state.linksHtml === html ? state.links : null });
    setRunning(null);
    if (!res.ok) return void toast.error(res.error);
    setLastReport(res.id);
    toast.success(`QA report saved · score ${res.report.score}/100`, { action: { label: "Open", onClick: () => window.open(`/reports/${res.id}`, "_self") } });
  }

  return (
    <div className="grid gap-3 p-3">
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" onClick={analyze} disabled={!!running} data-testid="run-analysis">
          {running === "analyze" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} {state.compat ? "Re-run analysis" : "Run full analysis"}
        </Button>
        <Button size="xs" variant="outline" onClick={checkLinks} disabled={!!running}>
          {running === "links" ? <Loader2 className="animate-spin" /> : <Link2 />} Check links & images
        </Button>
        <Button size="xs" variant="outline" onClick={generateReport} disabled={!!running} data-testid="generate-report">
          {running === "report" ? <Loader2 className="animate-spin" /> : <FileCheck2 />} QA report
        </Button>
      </div>
      {lastReport && <Link href={`/reports/${lastReport}`} className="text-primary text-xs underline-offset-2 hover:underline">Open the latest QA report →</Link>}
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        HTML checks run live as you type. {state.compat ? (compatStale ? <span className="text-warning">Compatibility results are from an earlier edit. <button className="underline" onClick={analyze}><RefreshCw className="inline size-3" /> refresh</button></span> : "Compatibility results are current.") : "Run full analysis to add Can I Email compatibility results."}
        {state.links && state.linksHtml === html ? ` ${state.links.length} URLs checked.` : ""}
      </p>
      <IssueList
        issues={issues}
        onReveal={onReveal}
        renderActions={renderActions}
        empty={<div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm"><CheckCircle2 className="text-success size-6" /> No issues for this filter.</div>}
      />
    </div>
  );
}

export function CompatTab({ analysis, html, onReveal }: { analysis: ReturnType<typeof useAnalysis>; html: string; onReveal: (line: number) => void }) {
  const { state, running, analyze } = analysis;
  if (!state.compat) {
    return (
      <div className="grid justify-items-center gap-3 p-6 text-center">
        <ShieldCheck className="text-muted-foreground size-6" />
        <p className="text-sm font-medium">Check client compatibility</p>
        <p className="text-muted-foreground text-xs">Detects the HTML and CSS features your email uses and maps them to Can I Email support data.</p>
        <Button size="sm" onClick={analyze} disabled={!!running}>{running === "analyze" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Analyze compatibility</Button>
      </div>
    );
  }
  const c = state.compat;
  return (
    <div className="grid gap-3 p-3">
      {state.compatHtml !== html && <p className="text-warning text-xs">Results are from an earlier version of the code. <button onClick={analyze} className="underline">Refresh</button></p>}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {([["unsupported", "Unsupported"], ["partial", "Partial"], ["supported", "Supported"], ["unknown", "Needs testing"]] as const).map(([k, l]) => (
          <div key={k} className="bg-card rounded-md border p-2"><div className="text-lg font-semibold tabular-nums">{c.keySummary[k]}</div><div className="text-muted-foreground text-[10px]">{l}</div></div>
        ))}
      </div>
      <SupportLegend />
      <CompatFeatureTable features={c.features} onReveal={onReveal} compact />
      {c.untracked.length > 0 && (
        <p className="text-muted-foreground text-[11px]"><span className="font-medium">Requires testing</span> (no Can I Email data): {c.untracked.map((u) => u.name).join(", ")}</p>
      )}
      <CompatSourceNote source={c.source} />
      <Button asChild size="xs" variant="ghost" className="justify-self-start"><Link href="/compatibility">Open full compatibility checker →</Link></Button>
    </div>
  );
}
