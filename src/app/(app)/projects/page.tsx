import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { Mail, FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ProjectsToolbar } from "@/components/projects/projects-toolbar";
import { ProjectActions } from "@/components/projects/project-actions";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const sort = sp.sort === "name" ? "name" : sp.sort === "created" ? "created_at" : "updated_at";
  const supabase = await createClient();
  let query = supabase.from("projects").select("id, name, description, updated_at, created_at, tags, email_versions(count), analysis_reports(score, created_at)").order(sort, { ascending: sort === "name" }).limit(200);
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const projects = (data ?? []) as unknown as {
    id: string; name: string; description: string | null; updated_at: string; created_at: string; tags: string[];
    email_versions: { count: number }[]; analysis_reports: { score: number | null; created_at: string }[];
  }[];

  return (
    <div className="mx-auto grid max-w-6xl gap-5 p-4 md:p-6">
      <PageHeader title="Projects" description="Every email you're developing, with its versions and reports." />
      <ProjectsToolbar initialOpen={sp.new === "1"} />
      {projects.length === 0 ? (
        <EmptyState icon={q ? Mail : FolderKanban} title={q ? "No matching emails" : "No emails yet"} description={q ? `Nothing matches “${q}”.` : "Create a blank email, upload HTML or start from a template."} />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <ul className="divide-y">
            {projects.map((p) => {
              const latest = [...p.analysis_reports].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
              return (
                <li key={p.id} className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md"><Mail className="text-muted-foreground size-4" /></span>
                  <Link href={`/studio/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      Edited {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })} · {p.email_versions[0]?.count ?? 0} versions
                      {p.description ? ` · ${p.description}` : ""}
                    </span>
                  </Link>
                  {latest?.score != null && <Badge variant={latest.score >= 80 ? "success" : latest.score >= 50 ? "warning" : "critical"}>QA {latest.score}</Badge>}
                  {p.tags.slice(0, 2).map((t) => <Badge key={t} variant="outline" className="hidden md:inline-flex">{t}</Badge>)}
                  <ProjectActions id={p.id} name={p.name} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
