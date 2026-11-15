import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LibraryComponent } from "@/components/library/component-customizer";

export async function loadComponents(userId: string): Promise<LibraryComponent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_components").select("id, user_id, kind, name, description, html, tags, is_system, updated_at").order("is_system").order("kind").order("name").limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ user_id, ...c }) => ({ ...c, own: user_id === userId }));
}

export async function loadCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("template_categories").select("id, slug, name, description").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}
