"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { BLANK_EMAIL } from "@/lib/email/starter";
import { MAX_HTML_BYTES } from "@/lib/email/limits";
import { byteLength } from "@/lib/utils";
import type { VersionSource } from "@/lib/types/database";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const nameSchema = z.string().trim().min(1, "Name is required.").max(120, "Name must be 120 characters or fewer.");
const htmlSchema = z.string().refine((s) => byteLength(s) <= MAX_HTML_BYTES, "HTML must be 1 MB or smaller.");

export async function createProject(input: {
  name: string;
  html?: string;
  description?: string;
  source?: Extract<VersionSource, "create" | "upload" | "template">;
  templateId?: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const name = nameSchema.safeParse(input.name);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  const html = htmlSchema.safeParse(input.html ?? BLANK_EMAIL);
  if (!html.success) return { ok: false, error: html.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name: name.data, html: html.data, description: input.description?.slice(0, 1000) ?? null, source_template_id: input.templateId ?? null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create project." };

  const source = input.source ?? "create";
  await supabase.from("email_versions").insert({ project_id: data.id, html: html.data, source, message: source === "upload" ? "Uploaded HTML" : source === "template" ? "Created from template" : "Initial version" });
  await logActivity(supabase, source === "upload" ? "project.uploaded" : source === "template" ? "template.cloned" : "project.created", data.id, { name: name.data });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, data: { id: data.id } };
}

export async function renameProject(id: string, newName: string): Promise<ActionResult> {
  await requireUser();
  const name = nameSchema.safeParse(newName);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  const supabase = await createClient();
  const { error, count } = await supabase.from("projects").update({ name: name.data }, { count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Project not found." };
  await logActivity(supabase, "project.renamed", id, { name: name.data });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath(`/studio/${id}`);
  return { ok: true, data: undefined };
}

export async function duplicateProject(id: string): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const supabase = await createClient();
  const { data: original, error } = await supabase.from("projects").select("name, html, description, subject, preheader, tags").eq("id", id).single();
  if (error || !original) return { ok: false, error: "Project not found." };
  const copyName = `${original.name} (copy)`.slice(0, 120);
  const { data, error: insertError } = await supabase
    .from("projects")
    .insert({ ...original, name: copyName })
    .select("id")
    .single();
  if (insertError || !data) return { ok: false, error: insertError?.message ?? "Could not duplicate." };
  await supabase.from("email_versions").insert({ project_id: data.id, html: original.html, source: "create", message: `Duplicated from “${original.name}”` });
  await logActivity(supabase, "project.duplicated", data.id, { from: id, name: copyName });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id } };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  const { error, count } = await supabase.from("projects").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Project not found." };
  await logActivity(supabase, "project.deleted", null, { name: project?.name ?? "" });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

/** Saves the working HTML and (optionally) records an immutable version. */
export async function saveProject(input: {
  id: string;
  html: string;
  message?: string;
  source?: Extract<VersionSource, "manual" | "autosave" | "ai" | "restore">;
  createVersion?: boolean;
}): Promise<ActionResult<{ versionNumber: number | null; updatedAt: string }>> {
  await requireUser();
  const html = htmlSchema.safeParse(input.html);
  if (!html.success) return { ok: false, error: html.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ html: html.data }).eq("id", input.id).select("updated_at").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Project not found." };

  let versionNumber: number | null = null;
  if (input.createVersion !== false) {
    const { data: v, error: vErr } = await supabase
      .from("email_versions")
      .insert({ project_id: input.id, html: html.data, source: input.source ?? "manual", message: input.message?.slice(0, 300) || null })
      .select("version_number")
      .single();
    if (vErr) return { ok: false, error: vErr.message };
    versionNumber = v.version_number;
    if (input.source !== "autosave") {
      await logActivity(supabase, input.source === "ai" ? "ai.applied" : input.source === "restore" ? "version.restored" : "project.saved", input.id, { version: versionNumber });
    }
  }
  revalidatePath("/dashboard");
  return { ok: true, data: { versionNumber, updatedAt: data.updated_at } };
}

export async function updateProjectMeta(id: string, meta: { subject?: string | null; preheader?: string | null; description?: string | null; tags?: string[] }): Promise<ActionResult> {
  await requireUser();
  const schema = z.object({
    subject: z.string().max(250).nullable().optional(),
    preheader: z.string().max(250).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  });
  const parsed = schema.safeParse(meta);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/projects");
  return { ok: true, data: undefined };
}

export async function createAndOpen(formData: FormData) {
  const result = await createProject({ name: String(formData.get("name") || "Untitled email") });
  if (result.ok) redirect(`/studio/${result.data.id}`);
  throw new Error(result.error);
}
