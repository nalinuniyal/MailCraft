import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { isAiConfigured } from "@/lib/ai/anthropic";

export async function generateMetadata({ params }: PageProps<"/studio/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) return { title: "Code Studio" };
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  return { title: data?.name ?? "Code Studio" };
}

export default async function StudioPage({ params }: PageProps<"/studio/[projectId]">) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: project }, { data: prefs }] = await Promise.all([
    supabase.from("projects").select("id, name, html, updated_at").eq("id", projectId).maybeSingle(),
    supabase.from("user_preferences").select("editor_font_size, editor_word_wrap, editor_minimap, autosave, default_viewport").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!project) notFound();
  // Track "recently opened" without blocking render on failure.
  await supabase.from("projects").update({ last_opened_at: new Date().toISOString() }).eq("id", projectId);
  return (
    <StudioWorkspace
      key={project.id}
      project={project}
      aiConfigured={isAiConfigured()}
      prefs={prefs ?? { editor_font_size: 13, editor_word_wrap: false, editor_minimap: true, autosave: true, default_viewport: "desktop" }}
    />
  );
}
