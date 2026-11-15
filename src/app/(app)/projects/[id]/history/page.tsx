import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft, Code2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { VersionHistory } from "@/components/projects/version-history";

export const metadata: Metadata = { title: "Version history" };

export default async function HistoryPage({ params, searchParams }: PageProps<"/projects/[id]/history">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const [{ data: project }, { data: versions, error }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("email_versions").select("id, version_number, message, source, size_bytes, created_at").eq("project_id", id).order("version_number", { ascending: false }).limit(500),
  ]);
  if (!project) notFound();
  if (error) throw new Error(error.message);
  return (
    <div className="mx-auto grid h-full max-w-7xl grid-rows-[auto_1fr] gap-4 p-4 md:p-6">
      <div className="grid gap-2">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"><ChevronLeft className="size-3" /> Projects</Link>
        <PageHeader
          title={`Version history · ${project.name}`}
          description="Every save is an immutable version. Compare any two, preview them, or restore one. Restoring adds a new version; nothing is deleted."
          actions={<Button asChild variant="outline"><Link href={`/studio/${project.id}`}><Code2 /> Open in studio</Link></Button>}
        />
      </div>
      <VersionHistory projectId={project.id} projectName={project.name} versions={versions ?? []} initialA={typeof sp.a === "string" ? sp.a : undefined} initialB={typeof sp.b === "string" ? sp.b : undefined} />
    </div>
  );
}
