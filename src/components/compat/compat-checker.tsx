"use client";
import * as React from "react";
import { Loader2, ShieldCheck, Upload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompatFeatureTable, CompatSourceNote, SupportLegend, ClientSummaryGrid } from "@/components/analysis/compat-table";
import { IssueList } from "@/components/analysis/issue-list";
import { readEmailFile } from "@/lib/email/upload";
import { createQaReport } from "@/lib/actions/reports";
import { createClient } from "@/lib/supabase/client";
import type { CompatibilityResult } from "@/lib/email/compat";
import type { Issue } from "@/lib/email/types";

export function CompatChecker({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [html, setHtml] = React.useState("");
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ compat: CompatibilityResult; validation: Issue[] } | null>(null);
  const [pending, setPending] = React.useState<null | "analyze" | "report" | "load">(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function loadProject(id: string) {
    setPending("load");
    const { data, error } = await createClient().from("projects").select("html").eq("id", id).single();
    setPending(null);
    if (error) return toast.error(error.message);
    setProjectId(id);
    setHtml(data.html);
    setResult(null);
  }

  async function run() {
    if (!html.trim()) return toast.error("Paste HTML, upload a file or pick a project first.");
    setPending("analyze");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult({ compat: json.compatibility, validation: json.validation });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function saveReport() {
    setPending("report");
    const res = await createQaReport({ projectId, html });
    setPending(null);
    if (!res.ok) return toast.error(res.error);
    router.push(`/reports/${res.id}`);
  }

  const compatIssues = result?.compat.issues ?? [];
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader><CardTitle className="text-sm">Email HTML</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Select value={projectId ?? ""} onValueChange={(v) => void loadProject(v)}>
              <SelectTrigger className="w-64" aria-label="Load from project"><SelectValue placeholder={projects.length ? "Load from a project…" : "No projects yet"} /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Upload file</Button>
            <input ref={fileRef} type="file" accept=".html,.htm,.txt" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const r = await readEmailFile(f);
              if (!r.ok) return toast.error(r.error);
              setHtml(r.html);
              setProjectId(null);
              setResult(null);
            }} />
          </div>
          <Textarea value={html} onChange={(e) => { setHtml(e.target.value); setProjectId(null); }} placeholder="Paste email HTML here…" spellCheck={false} className="h-48 resize-y font-mono text-xs [field-sizing:fixed]" aria-label="Email HTML" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={!!pending}>{pending === "analyze" || pending === "load" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Check compatibility</Button>
            {result && <Button variant="outline" onClick={saveReport} disabled={!!pending}>{pending === "report" ? <Loader2 className="animate-spin" /> : <FileCheck2 />} Save as QA report</Button>}
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["unsupported", "Unsupported in a key client", "text-sev-critical"], ["partial", "Partially supported", "text-warning"], ["supported", "Supported in key clients", "text-success"], ["unknown", "Requires testing", "text-muted-foreground"]] as const).map(([k, l, c]) => (
              <div key={k} className="bg-card rounded-xl border p-4"><div className={`text-2xl font-semibold tabular-nums ${c}`}>{result.compat.keySummary[k]}</div><div className="text-muted-foreground text-xs">{l}</div></div>
            ))}
          </div>
          <section className="grid gap-2">
            <h2 className="text-sm font-semibold">By client</h2>
            <ClientSummaryGrid rows={result.compat.clientSummary} />
          </section>
          <section className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Detected features ({result.compat.features.length})</h2><SupportLegend /></div>
            <CompatFeatureTable features={result.compat.features} />
            {result.compat.untracked.length > 0 && <p className="text-muted-foreground text-xs"><span className="text-foreground font-medium">Requires testing</span> — no Can I Email data for: {result.compat.untracked.map((u) => `${u.name} (L${u.line})`).join(", ")}</p>}
            <CompatSourceNote source={result.compat.source} />
          </section>
          <section className="grid gap-2">
            <h2 className="text-sm font-semibold">Client-specific warnings ({compatIssues.length})</h2>
            <IssueList issues={compatIssues} />
          </section>
        </>
      )}
    </div>
  );
}
