import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";

export type ActivityAction =
  | "project.created" | "project.uploaded" | "project.renamed" | "project.duplicated" | "project.deleted"
  | "project.saved" | "version.restored" | "ai.applied" | "report.created" | "template.saved" | "template.cloned"
  | "component.saved";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  action: ActivityAction,
  projectId: string | null,
  details: Record<string, Json> = {},
) {
  // Activity is best-effort: failure to log must never fail the user's action.
  await supabase.from("activity_log").insert({ action, project_id: projectId, details }).then(
    () => undefined,
    () => undefined,
  );
}

export const ACTIVITY_LABELS: Record<string, string> = {
  "project.created": "Created email",
  "project.uploaded": "Uploaded HTML",
  "project.renamed": "Renamed email",
  "project.duplicated": "Duplicated email",
  "project.deleted": "Deleted email",
  "project.saved": "Saved version",
  "version.restored": "Restored version",
  "ai.applied": "Applied AI changes",
  "report.created": "Generated report",
  "template.saved": "Saved template",
  "template.cloned": "Created from template",
  "component.saved": "Saved component",
};
