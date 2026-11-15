import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { z } from "zod";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ArrowLeft, Lightbulb, Code2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IssueList } from "@/components/analysis/issue-list";
import { CompatSourceNote, ClientSummaryGrid } from "@/components/analysis/compat-table";
import { SupportBadge } from "@/components/analysis/severity";
import { ReportActions } from "@/components/reports/report-actions";
import type { Issue } from "@/lib/email/types";
import type { QaReport } from "@/lib/email/qa";
import type { SupportLevel } from "@/lib/email/caniemail";

export const metadata: Metadata = { title: "Report" };

const STATUS = {
  pass: { icon: CheckCircle2, cls: "text-success", label: "Pass" },
  warn: { icon: AlertTriangle, cls: "text-warning", label: "Warnings" },
  fail: { icon: XCircle, cls: "text-sev-critical", label: "Fail" },
  "not-run": { icon: MinusCircle, cls: "text-muted-foreground", label: "Not run" },
} as const;

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("analysis_reports").select("id, title, kind, score, counts, issues, sections, summary, created_at, model, project_id, projects(name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const issues = (data.issues as unknown as Issue[]) ?? [];
  const sections = (data.sections ?? {}) as unknown as Partial<QaReport>;
  const counts = (data.counts ?? {}) as Record<string, number>;
  const project = (data as unknown as { projects: { name: string } | null }).projects;

  return (
    <div className="mx-auto grid max-w-5xl gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/reports" className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-xs"><ArrowLeft className="size-3" /> Reports</Link>
          <h1 className="text-xl font-semibold tracking-tight">{data.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{format(new Date(data.created_at), "d MMM yyyy, HH:mm")} · {project?.name ?? "Ad-hoc check"}{data.model ? ` · ${data.model}` : ""}</p>
        </div>
        <div className="flex gap-2">
          {data.project_id && <Button asChild variant="outline"><Link href={`/studio/${data.project_id}`}><Code2 /> Open in studio</Link></Button>}
          <ReportActions id={data.id} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        {data.score != null && (
          <div className="bg-card flex flex-col items-center justify-center rounded-xl border p-5">
            <div className="text-4xl font-semibold tabular-nums">{data.score}</div>
            <div className="text-muted-foreground text-xs">QA score / 100</div>
          </div>
        )}
        <div className="bg-card grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-4">
          {(["critical", "high", "medium", "low"] as const).map((s) => (
            <div key={s}><Badge variant={s}>{s}</Badge><div className="mt-1 text-2xl font-semibold tabular-nums">{counts[s] ?? 0}</div></div>
          ))}
          <p className="text-muted-foreground col-span-full text-[11px]">Score = 100 − (15 × critical + 7 × high + 3 × medium + 1 × low), floored at 0.</p>
        </div>
      </div>

      {sections.sections && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Checks</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {sections.sections.map((s) => {
              const st = STATUS[s.status];
              return (
                <div key={s.key} className="flex items-start gap-3 rounded-md border px-3 py-2.5">
                  <st.icon className={`mt-0.5 size-4 shrink-0 ${st.cls}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.title} <span className={`ml-1 text-xs ${st.cls}`}>{st.label}</span></p>
                    <p className="text-muted-foreground text-xs">{s.summary}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {sections.suggestions && sections.suggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="text-warning size-4" /> Suggested improvements</CardTitle></CardHeader>
          <CardContent><ul className="grid list-disc gap-1.5 pl-5 text-sm">{sections.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></CardContent>
        </Card>
      )}

      {sections.compatibility && (
        <Card>
          <CardHeader><CardTitle className="text-sm">CSS & HTML compatibility</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <ClientSummaryGrid rows={sections.compatibility.clientSummary} />
            <div className="flex flex-wrap gap-1.5">
              {sections.compatibility.features.filter((f) => f.overall !== "supported").map((f) => (
                <a key={f.slug} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs"><SupportBadge level={f.overall as SupportLevel} /> {f.title}</a>
              ))}
            </div>
            <CompatSourceNote source={sections.compatibility.source} />
          </CardContent>
        </Card>
      )}

      {sections.links && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Link & image checks</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-xs">
              {sections.links.map((l) => (
                <li key={l.url} className="flex items-center gap-2 py-1.5">
                  {l.ok ? <CheckCircle2 className="text-success size-3.5 shrink-0" /> : <XCircle className="text-sev-critical size-3.5 shrink-0" />}
                  <Badge variant="outline">{l.kind}</Badge>
                  <span className="min-w-0 flex-1 truncate font-mono">{l.url}</span>
                  <span className="text-muted-foreground">{l.status ?? l.error}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.kind === "ai" && data.summary && (
        <Card><CardHeader><CardTitle className="text-sm">AI summary</CardTitle></CardHeader><CardContent className="text-sm">{data.summary}</CardContent></Card>
      )}

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">Outstanding issues ({issues.length})</h2>
        <IssueList issues={issues} />
      </section>
    </div>
  );
}
