import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SfmcToolkit } from "@/components/sfmc/sfmc-toolkit";

export const metadata: Metadata = { title: "SFMC Toolkit" };

export default async function SfmcPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id, name").order("updated_at", { ascending: false }).limit(100);
  return (
    <div className="mx-auto grid max-w-7xl gap-5 p-4 md:p-6">
      <PageHeader title="Salesforce Marketing Cloud toolkit" description="AMPscript snippets, personalization strings, a sample-subscriber preview and static AMPscript checks. MailCraft does not run AMPscript or connect to Marketing Cloud." />
      <SfmcToolkit projects={projects ?? []} />
    </div>
  );
}
