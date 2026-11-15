"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/email/validate";
import { analyzeCompatibility } from "@/lib/email/compat";
import { buildQaReport, type QaReport } from "@/lib/email/qa";
import { logActivity } from "@/lib/activity";
import { MAX_HTML_BYTES } from "@/lib/email/limits";
import { sha256 } from "@/lib/utils";
import type { Issue } from "@/lib/email/types";
import type { Json } from "@/lib/types/database";

const LinkResult = z.object({ url: z.string().max(2048), kind: z.enum(["link", "image"]), ok: z.boolean(), status: z.number().nullable(), finalUrl: z.string().max(2048).optional(), error: z.string().max(300).optional(), ms: z.number() });
const Input = z.object({
  projectId: z.uuid().nullable(),
  html: z.string().min(1).max(MAX_HTML_BYTES),
  title: z.string().trim().min(1).max(200).optional(),
  links: z.array(LinkResult).max(60).nullable().optional(),
});

/** Generates and persists a QA report. Validation & compatibility are recomputed server-side. */
export async function createQaReport(input: z.input<typeof Input>): Promise<{ ok: true; id: string; report: QaReport } | { ok: false; error: string }> {
  await requireUser();
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { projectId, html, links } = parsed.data;
  const supabase = await createClient();

  let projectName = "Ad-hoc email";
  let versionId: string | null = null;
  if (projectId) {
    const { data: p } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
    if (!p) return { ok: false, error: "Project not found" };
    projectName = p.name;
    const { data: v } = await supabase.from("email_versions").select("id, html").eq("project_id", projectId).order("version_number", { ascending: false }).limit(1).maybeSingle();
    if (v && v.html === html) versionId = v.id;
  }
  const htmlHash = await sha256(html);

  // Include the latest AI analysis only if it was run on exactly this HTML.
  let ai: Parameters<typeof buildQaReport>[0]["ai"] = null;
  if (projectId) {
    const { data: aiReport } = await supabase.from("analysis_reports").select("id, model, summary, issues").eq("project_id", projectId).eq("kind", "ai").eq("html_hash", htmlHash).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (aiReport) ai = { model: aiReport.model ?? "claude", summary: aiReport.summary ?? "", issues: (aiReport.issues as unknown as Issue[]) ?? [], reportId: aiReport.id };
  }

  const report = buildQaReport({
    title: parsed.data.title ?? `QA report · ${projectName}`,
    html,
    validation: validateEmail(html),
    compat: analyzeCompatibility(html),
    links: links ?? null,
    ai,
  });

  const { data, error } = await supabase
    .from("analysis_reports")
    .insert({
      project_id: projectId,
      version_id: versionId,
      kind: "qa",
      title: report.title,
      score: report.score,
      counts: report.counts as unknown as Json,
      issues: report.issues as unknown as Json,
      sections: { sections: report.sections, suggestions: report.suggestions, compatibility: report.compatibility, links: report.links, ai: report.ai, sizeBytes: report.sizeBytes, generatedAt: report.generatedAt } as unknown as Json,
      summary: `Score ${report.score}/100 · ${report.counts.critical} critical, ${report.counts.high} high, ${report.counts.medium} medium, ${report.counts.low} low`,
      html_hash: htmlHash,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save report" };
  await logActivity(supabase, "report.created", projectId, { name: report.title, score: report.score });
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id, report };
}

export async function deleteReport(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id" };
  const supabase = await createClient();
  const { error } = await supabase.from("analysis_reports").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { ok: true };
}
