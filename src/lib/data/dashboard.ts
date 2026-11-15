import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  projects: number;
  templates: number;
  versions: number;
  reports: number;
  open_issues: number;
  compat_issues: number;
};

export async function getDashboardData() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 13 * 24 * 3600 * 1000);
  since.setHours(0, 0, 0, 0);

  const [stats, recent, reports, activity, activityWindow] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase.from("projects").select("id, name, updated_at, html").order("updated_at", { ascending: false }).limit(6),
    supabase.from("analysis_reports").select("id, title, kind, score, counts, created_at, project_id, projects(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("activity_log").select("id, action, details, created_at, project_id").order("created_at", { ascending: false }).limit(8),
    supabase.from("activity_log").select("created_at").gte("created_at", since.toISOString()).limit(5000),
  ]);

  const firstError = stats.error ?? recent.error ?? reports.error ?? activity.error ?? activityWindow.error;
  if (firstError) throw new Error(firstError.message);

  // Bucket real activity into the last 14 local days.
  const days: { date: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  for (const row of activityWindow.data ?? []) {
    const key = row.created_at.slice(0, 10);
    const bucket = days.find((d) => d.date === key);
    if (bucket) bucket.count++;
  }

  return {
    stats: stats.data as unknown as DashboardStats,
    recent: (recent.data ?? []).map((p) => ({ id: p.id, name: p.name, updated_at: p.updated_at, size: new TextEncoder().encode(p.html).length })),
    reports: (reports.data ?? []) as unknown as {
      id: string; title: string; kind: string; score: number | null; counts: Record<string, number>; created_at: string; project_id: string | null; projects: { name: string } | null;
    }[],
    activity: activity.data ?? [],
    days,
  };
}
