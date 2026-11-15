import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { createClient, requireUser } from "@/lib/supabase/server";
import { DatabaseSetupRequired, isMissingSchemaError } from "@/components/setup/database-setup-required";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile, error }, cookieStore] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    cookies(),
  ]);
  if (isMissingSchemaError(error)) return <DatabaseSetupRequired />;
  return (
    <AppShell
      initialCollapsed={cookieStore.get("mc_sidebar_collapsed")?.value === "1"}
      user={{ email: user.email, name: profile?.display_name ?? null }}
    >
      {children}
    </AppShell>
  );
}
