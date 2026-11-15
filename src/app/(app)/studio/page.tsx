import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** /studio opens the most recently edited email, or the new-email flow. */
export default async function StudioIndex() {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  redirect(data ? `/studio/${data.id}` : "/projects?new=1");
}
