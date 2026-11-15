import { z } from "zod";
import { requireApiUser } from "@/lib/api";
import { reportToHtml, reportToMarkdown, type StoredReport } from "@/lib/email/report-export";
import { slugify } from "@/lib/utils";

export async function GET(req: Request, ctx: RouteContext<"/api/reports/[id]/download">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Not found" }, { status: 404 });
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("analysis_reports").select("id, title, kind, score, created_at, model, summary, issues, sections, counts, projects(name)").eq("id", id).maybeSingle();
  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
  const r = { ...(data as unknown as StoredReport), projectName: (data as unknown as { projects: { name: string } | null }).projects?.name ?? null };
  const format = new URL(req.url).searchParams.get("format") ?? "html";
  const base = slugify(r.title);
  if (format === "json") return new Response(JSON.stringify(r, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${base}.json"` } });
  if (format === "md") return new Response(reportToMarkdown(r), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${base}.md"` } });
  return new Response(reportToHtml(r), { headers: { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="${base}.html"`, "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
