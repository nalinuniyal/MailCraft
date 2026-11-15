import type { Metadata } from "next";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { CompatChecker } from "@/components/compat/compat-checker";
import { CompatSourceNote } from "@/components/analysis/compat-table";
import { SupportBadge } from "@/components/analysis/severity";
import { allFeatures, featureSummary, CANIEMAIL_SOURCE, clientSupport, KEY_CLIENTS } from "@/lib/email/caniemail";
import { SupportIcon } from "@/components/analysis/severity";

export const metadata: Metadata = { title: "Compatibility checker" };

export default async function CompatibilityPage({ searchParams }: PageProps<"/compatibility">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 80) : "";
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id, name").order("updated_at", { ascending: false }).limit(100);
  const matches = q ? allFeatures().filter((f) => f.title.toLowerCase().includes(q) || f.slug.includes(q)).slice(0, 30) : [];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 md:p-6">
      <PageHeader title="Email compatibility checker" description="Detect the HTML & CSS features an email uses and see client support from Can I Email." />
      <CompatSourceNote source={CANIEMAIL_SOURCE} />
      <CompatChecker projects={projects ?? []} />

      <section className="grid gap-3 border-t pt-6">
        <h2 className="text-sm font-semibold">Look up a feature</h2>
        <form className="relative max-w-md">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input name="q" defaultValue={q} placeholder="e.g. flex, border-radius, picture, :hover" className="pl-8" aria-label="Search Can I Email features" />
        </form>
        {q && matches.length === 0 && <p className="text-muted-foreground text-sm">No features match “{q}”.</p>}
        <div className="grid gap-2">
          {matches.map((f) => {
            const s = featureSummary(f);
            return (
              <div key={f.slug} className="bg-card rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-sm font-medium underline-offset-2 hover:underline">{f.title}</a>
                  <SupportBadge level={s.overall} />
                  <span className="text-muted-foreground text-xs">{s.pct ?? "–"}% across {s.tested} tested clients · tested {f.lastTestDate}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {KEY_CLIENTS.map((c) => {
                    const cs = clientSupport(f, c.family, c.platform, c.label);
                    return <span key={c.label} className="flex items-center gap-1 text-xs"><SupportIcon level={cs.level} className="size-3.5" /> {c.label}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
