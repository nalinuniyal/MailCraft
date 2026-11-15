"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { MAX_HTML_BYTES } from "@/lib/email/limits";
import { byteLength } from "@/lib/utils";
import { createProject, type ActionResult } from "./projects";

const MAX_COMPONENT_BYTES = 256 * 1024;
const name = z.string().trim().min(1, "Name is required.").max(120, "Name must be 120 characters or fewer.");
const description = z.string().trim().max(1000).optional().transform((s) => s || null);
const tags = z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).default([]);
const html = (max: number) => z.string().min(1, "HTML is required.").refine((s) => byteLength(s) <= max, `HTML must be ${Math.round(max / 1024)} KB or smaller.`);

/** Clones a built-in or own template into a new project and returns its id. */
export async function cloneTemplate(templateId: string, projectName?: string): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  if (!z.uuid().safeParse(templateId).success) return { ok: false, error: "Template not found." };
  const supabase = await createClient();
  const { data: t } = await supabase.from("email_templates").select("id, name, html, description").eq("id", templateId).maybeSingle();
  if (!t) return { ok: false, error: "Template not found." };
  return createProject({ name: projectName?.trim() || t.name, html: t.html, description: t.description ?? undefined, source: "template", templateId: t.id });
}

const TemplateInput = z.object({
  name,
  description,
  categoryId: z.uuid().nullable().optional(),
  tags,
  html: html(MAX_HTML_BYTES),
});

export async function saveTemplate(input: z.input<typeof TemplateInput> & { id?: string }): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = TemplateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, description: v.description, category_id: v.categoryId ?? null, tags: v.tags, html: v.html };
  const query = input.id
    ? supabase.from("email_templates").update(row).eq("id", input.id).eq("is_system", false)
    : supabase.from("email_templates").insert(row);
  const { data, error } = await query.select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Template not found." };
  if (!input.id) await logActivity(supabase, "template.saved", null, { name: v.name });
  revalidatePath("/templates");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id } };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  // RLS only allows deleting your own rows; built-ins have no owner.
  const { error, count } = await supabase.from("email_templates").delete({ count: "exact" }).eq("id", id).eq("is_system", false);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Only your own templates can be deleted." };
  revalidatePath("/templates");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

const ComponentInput = z.object({
  kind: z.string().trim().toLowerCase().min(1).max(40),
  name,
  description,
  tags,
  html: html(MAX_COMPONENT_BYTES),
});

export async function saveComponent(input: z.input<typeof ComponentInput> & { id?: string }): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = ComponentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const query = input.id
    ? supabase.from("saved_components").update(parsed.data).eq("id", input.id).eq("is_system", false)
    : supabase.from("saved_components").insert(parsed.data);
  const { data, error } = await query.select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Component not found." };
  if (!input.id) await logActivity(supabase, "component.saved", null, { name: parsed.data.name });
  revalidatePath("/components");
  return { ok: true, data: { id: data.id } };
}

export async function deleteComponent(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase.from("saved_components").delete({ count: "exact" }).eq("id", id).eq("is_system", false);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Only your own components can be deleted." };
  revalidatePath("/components");
  return { ok: true, data: undefined };
}
