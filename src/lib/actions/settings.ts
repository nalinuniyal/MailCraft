"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "./projects";

const Prefs = z.object({
  theme: z.enum(["dark", "light", "system"]),
  editor_font_size: z.number().int().min(10).max(24),
  editor_word_wrap: z.boolean(),
  editor_minimap: z.boolean(),
  autosave: z.boolean(),
  default_viewport: z.enum(["desktop", "tablet", "mobile"]),
});

export async function savePreferences(input: z.input<typeof Prefs>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = Prefs.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, ...parsed.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function saveProfile(input: { display_name: string }): Promise<ActionResult> {
  const user = await requireUser();
  const name = z.string().trim().max(80, "Name must be 80 characters or fewer.").safeParse(input.display_name);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: name.data || null }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function changePassword(input: { password: string; confirm: string }): Promise<ActionResult> {
  await requireUser();
  const pw = z.string().min(8, "Password must be at least 8 characters.").max(128).safeParse(input.password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message };
  if (input.password !== input.confirm) return { ok: false, error: "Passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

/** Everything the user owns, as JSON (projects with versions, own templates and components, reports). */
export async function exportMyData(): Promise<ActionResult<{ json: string }>> {
  await requireUser();
  const supabase = await createClient();
  const [projects, versions, templates, components, reports] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("email_versions").select("project_id, version_number, html, message, source, created_at").order("version_number"),
    supabase.from("email_templates").select("*").eq("is_system", false),
    supabase.from("saved_components").select("*").eq("is_system", false),
    supabase.from("analysis_reports").select("*"),
  ]);
  const err = [projects, versions, templates, components, reports].find((r) => r.error)?.error;
  if (err) return { ok: false, error: err.message };
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), projects: projects.data, versions: versions.data, templates: templates.data, components: components.data, reports: reports.data }, null, 2);
  return { ok: true, data: { json } };
}
