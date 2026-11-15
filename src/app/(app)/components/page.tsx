import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ComponentLibrary } from "@/components/library/component-library";
import { loadComponents } from "@/lib/data/library";

export const metadata: Metadata = { title: "Components" };

export default async function ComponentsPage() {
  const user = await requireUser();
  const components = await loadComponents(user.id);
  return (
    <div className="mx-auto grid max-w-7xl gap-5 p-4 md:p-6">
      <PageHeader title="Component library" description="Tested, email-safe building blocks. Customize the fields, then copy the HTML or insert it from the Code Studio." />
      <ComponentLibrary components={components} />
    </div>
  );
}
