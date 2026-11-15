import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { FolderKanban, LayoutTemplate, FileCheck2, AlertTriangle, History, ArrowRight, Mail, Activity } from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ACTIVITY_LABELS } from "@/lib/activity";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { stats, recent, reports, activity, days } = await getDashboardData();

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your email projects, analysis and recent work at a glance.</p>
      </div>

      <QuickActions />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Email projects" value={stats.projects} icon={FolderKanban} href="/projects" />
        <StatCard label="Saved templates" value={stats.templates} icon={LayoutTemplate} href="/templates?owner=mine" hint="Your own templates" />
        <StatCard label="Saved versions" value={stats.versions} icon={History} />
        <StatCard label="Analysis reports" value={stats.reports} icon={FileCheck2} href="/reports" />
        <StatCard label="Compatibility issues" value={stats.compat_issues} icon={AlertTriangle} tone="warning" hint={`${stats.open_issues} total issues in latest reports`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Recently edited</CardTitle>
            <CardAction><Button asChild variant="ghost" size="xs"><Link href="/projects">All projects <ArrowRight /></Link></Button></CardAction>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={Mail} title="No emails yet" description="Create a blank email, upload HTML or start from a template using the quick actions above." />
            ) : (
              <ul className="divide-y">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link href={`/studio/${p.id}`} className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5">
                      <span className="bg-muted flex size-8 items-center justify-center rounded-md"><Mail className="text-muted-foreground size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="text-muted-foreground block text-xs">Edited {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })} · {formatBytes(p.size)}</span>
                      </span>
                      <ArrowRight className="text-muted-foreground size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Project activity</CardTitle></CardHeader>
          <CardContent><ActivityChart days={days} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent analysis reports</CardTitle>
            <CardAction><Button asChild variant="ghost" size="xs"><Link href="/reports">All reports <ArrowRight /></Link></Button></CardAction>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <EmptyState icon={FileCheck2} title="No reports yet" description="Run Analyze or generate a QA report from the Code Studio." />
            ) : (
              <ul className="divide-y">
                {reports.map((r) => {
                  const c = r.counts ?? {};
                  return (
                    <li key={r.id}>
                      <Link href={`/reports/${r.id}`} className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="text-muted-foreground block text-xs">{r.projects?.name ?? "Ad-hoc check"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                        </span>
                        <span className="flex gap-1">
                          {c.critical ? <Badge variant="critical">{c.critical} critical</Badge> : null}
                          {c.high ? <Badge variant="high">{c.high} high</Badge> : null}
                          {r.score !== null && <Badge variant="outline">{r.score}/100</Badge>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Latest activity</CardTitle></CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState icon={Activity} title="Nothing yet" description="Your saves, uploads, reports and AI changes will appear here." />
            ) : (
              <ol className="relative grid gap-3 border-l pl-4">
                {activity.map((a) => {
                  const d = (a.details ?? {}) as Record<string, unknown>;
                  return (
                    <li key={a.id} className="text-sm">
                      <span className="bg-primary absolute -left-[4.5px] mt-1.5 size-2 rounded-full" />
                      <span className="font-medium">{ACTIVITY_LABELS[a.action] ?? a.action}</span>
                      {typeof d.name === "string" && <span className="text-muted-foreground"> · {d.name}</span>}
                      {typeof d.version === "number" && <span className="text-muted-foreground"> · v{d.version}</span>}
                      <span className="text-muted-foreground block text-xs">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
