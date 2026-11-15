import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { FileCheck2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "QA reports" };

const KIND_LABEL: Record<string, string> = { qa: "QA report", ai: "AI analysis", compatibility: "Compatibility", validation: "Validation" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("analysis_reports").select("id, title, kind, score, counts, created_at, model, projects(id, name)").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const reports = (data ?? []) as unknown as { id: string; title: string; kind: string; score: number | null; counts: Record<string, number>; created_at: string; model: string | null; projects: { id: string; name: string } | null }[];
  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 md:p-6">
      <PageHeader title="QA reports" description="Saved QA reports and AI analyses. Generate new ones from the Code Studio or Compatibility checker." actions={<Button asChild variant="outline"><Link href="/compatibility">New compatibility check</Link></Button>} />
      {reports.length === 0 ? (
        <EmptyState icon={FileCheck2} title="No reports yet" description="Open an email in the Code Studio and click “QA report” in the Issues panel." action={<Button asChild><Link href="/studio">Open Code Studio</Link></Button>} />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <ul className="divide-y">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">{r.kind === "ai" ? <Sparkles className="text-primary size-4" /> : <FileCheck2 className="text-muted-foreground size-4" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="text-muted-foreground block text-xs">{KIND_LABEL[r.kind] ?? r.kind} · {r.projects?.name ?? "Ad-hoc"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}{r.model ? ` · ${r.model}` : ""}</span>
                  </span>
                  <span className="hidden gap-1 sm:flex">
                    {r.counts?.critical ? <Badge variant="critical">{r.counts.critical} critical</Badge> : null}
                    {r.counts?.high ? <Badge variant="high">{r.counts.high} high</Badge> : null}
                    {r.counts?.medium ? <Badge variant="medium">{r.counts.medium} medium</Badge> : null}
                  </span>
                  {r.score != null && <Badge variant={r.score >= 80 ? "success" : r.score >= 50 ? "warning" : "critical"} className="tabular-nums">{r.score}/100</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
