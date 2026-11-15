import type { Metadata } from "next";
import { createClient, requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForms } from "@/components/settings/settings-forms";
import { aiProviderInfo } from "@/lib/ai/client";
import { envInt } from "@/lib/rate-limit";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("theme, editor_font_size, editor_word_wrap, editor_minimap, autosave, default_viewport").eq("user_id", user.id).maybeSingle(),
  ]);
  return (
    <div className="mx-auto grid max-w-3xl gap-5 p-4 md:p-6">
      <PageHeader title="Settings" description="Your profile, editor preferences, account and data." />
      <SettingsForms
        email={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        prefs={prefs ?? { theme: "dark", editor_font_size: 13, editor_word_wrap: false, editor_minimap: true, autosave: true, default_viewport: "desktop" }}
        system={{
          ai: aiProviderInfo(),
          aiPerHour: envInt("AI_RATE_LIMIT_PER_HOUR", 30),
          linksPerHour: envInt("LINK_CHECK_RATE_LIMIT_PER_HOUR", 20),
        }}
      />
    </div>
  );
}
