"use server";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "./projects";

/** Loads one of the user's projects for the SFMC tools (RLS limits it to their own). */
export async function getProjectHtml(id: string): Promise<ActionResult<{ html: string; name: string }>> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Project not found." };
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name, html").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Project not found." };
  return { ok: true, data };
}
