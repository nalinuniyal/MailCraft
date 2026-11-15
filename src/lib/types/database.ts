/* Hand-maintained to mirror supabase/migrations. Regenerate with
 * `npx supabase gen types typescript --project-id <id>` once linked. */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type VersionSource = "manual" | "autosave" | "ai" | "restore" | "upload" | "template" | "create";
export type ReportKind = "validation" | "compatibility" | "ai" | "qa";

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne?: boolean; referencedRelation: string; referencedColumns: string[] };
type Table<Row, Insert, Update = Partial<Insert>, R extends Rel[] = []> = { Row: Row; Insert: Insert; Update: Update; Relationships: R };

export type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string }
export type PreferencesRow = {
  user_id: string;
  theme: "dark" | "light" | "system";
  editor_font_size: number;
  editor_word_wrap: boolean;
  editor_minimap: boolean;
  autosave: boolean;
  default_viewport: "desktop" | "tablet" | "mobile";
  ai_model: string | null;
  created_at: string;
  updated_at: string;
}
export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  html: string;
  subject: string | null;
  preheader: string | null;
  tags: string[];
  source_template_id: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}
export type VersionRow = {
  id: string;
  project_id: string;
  user_id: string;
  version_number: number;
  html: string;
  message: string | null;
  source: VersionSource;
  size_bytes: number;
  created_at: string;
}
export type CategoryRow = { id: string; slug: string; name: string; description: string | null; sort_order: number }
export type TemplateRow = {
  id: string;
  user_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  html: string;
  tags: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
export type ComponentRow = {
  id: string;
  user_id: string | null;
  kind: string;
  name: string;
  description: string | null;
  html: string;
  tags: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}
export type ReportRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  version_id: string | null;
  kind: ReportKind;
  title: string;
  score: number | null;
  counts: Json;
  issues: Json;
  sections: Json;
  summary: string | null;
  html_hash: string | null;
  model: string | null;
  created_at: string;
}
export type ActivityRow = { id: number; user_id: string; project_id: string | null; action: string; details: Json; created_at: string }

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, { id: string; display_name?: string | null; avatar_url?: string | null }>;
      user_preferences: Table<PreferencesRow, Partial<PreferencesRow> & { user_id: string }>;
      projects: Table<ProjectRow, { name: string; html?: string; description?: string | null; subject?: string | null; preheader?: string | null; tags?: string[]; source_template_id?: string | null; last_opened_at?: string | null; user_id?: string }>;
      email_versions: Table<VersionRow, { project_id: string; html: string; message?: string | null; source?: VersionSource; user_id?: string }>;
      template_categories: Table<CategoryRow, Omit<CategoryRow, "id"> & { id?: string }>;
      email_templates: Table<TemplateRow, { name: string; html: string; description?: string | null; category_id?: string | null; tags?: string[]; user_id?: string }, Partial<TemplateRow>, [
        { foreignKeyName: "email_templates_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "template_categories"; referencedColumns: ["id"] },
      ]>;
      saved_components: Table<ComponentRow, { kind: string; name: string; html: string; description?: string | null; tags?: string[]; user_id?: string }>;
      analysis_reports: Table<ReportRow, { kind: ReportKind; title: string; project_id?: string | null; version_id?: string | null; score?: number | null; counts?: Json; issues?: Json; sections?: Json; summary?: string | null; html_hash?: string | null; model?: string | null; user_id?: string }, Partial<ReportRow>, [
        { foreignKeyName: "analysis_reports_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
      ]>;
      activity_log: Table<ActivityRow, { action: string; project_id?: string | null; details?: Json; user_id?: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: { Args: { p_bucket: string; p_limit: number; p_window_seconds: number }; Returns: { allowed: boolean; remaining: number; reset_at: string }[] };
      dashboard_stats: { Args: Record<string, never>; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
