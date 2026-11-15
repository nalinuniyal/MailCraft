import type { Metadata } from "next";
import { createClient, requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateLibrary, type LibraryTemplate } from "@/components/library/template-library";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: categories, error: cErr }, { data: templates, error: tErr }] = await Promise.all([
    supabase.from("template_categories").select("id, slug, name, description, sort_order").order("sort_order"),
    supabase.from("email_templates").select("id, user_id, category_id, name, description, html, tags, is_system, updated_at").order("is_system", { ascending: true }).order("updated_at", { ascending: false }).limit(500),
  ]);
  if (cErr || tErr) throw new Error((cErr ?? tErr)!.message);
  return (
    <div className="mx-auto grid max-w-7xl gap-5 p-4 md:p-6">
      <PageHeader title="Template library" description="Start from a built-in, tested template or one you saved. Using a template creates a new email project; the template itself never changes." />
      <TemplateLibrary categories={categories ?? []} templates={(templates ?? []).map((t) => ({ ...t, own: t.user_id === user.id })) as LibraryTemplate[]} />
    </div>
  );
}
