"use client";
import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { RotateCcw, Loader2, History, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatBytes } from "@/lib/utils";
import type { VersionRow } from "@/lib/types/database";

type VersionMeta = Pick<VersionRow, "id" | "version_number" | "message" | "source" | "size_bytes" | "created_at">;

export const SOURCE_LABEL: Record<string, string> = { manual: "Saved", autosave: "Autosave", ai: "AI change", restore: "Restored", upload: "Upload", template: "Template", create: "Created" };

export function VersionsPanel({ projectId, onRestore, refreshKey }: { projectId: string; onRestore: (html: string, version: number) => Promise<void> | void; refreshKey?: unknown }) {
  const [versions, setVersions] = React.useState<VersionMeta[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<VersionMeta | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("email_versions")
      .select("id, version_number, message, source, size_bytes, created_at")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    else setVersions(data);
  }, [projectId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / when refreshKey changes
    void load();
  }, [load, refreshKey]);

  async function restore(v: VersionMeta) {
    setRestoring(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("email_versions").select("html").eq("id", v.id).single();
    if (error || !data) {
      toast.error(error?.message ?? "Version not found");
    } else {
      await onRestore(data.html, v.version_number);
      await load();
    }
    setRestoring(false);
    setConfirm(null);
  }

  if (error) return <p className="text-destructive p-4 text-sm">{error}</p>;
  if (!versions) return <div className="grid gap-2 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (versions.length === 0) return <EmptyState className="m-3" icon={History} title="No versions yet" description="Press Save (⌘S) to record a version." />;

  return (
    <div className="grid gap-1 p-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-muted-foreground text-xs">{versions.length} version{versions.length === 1 ? "" : "s"}</p>
        <Button asChild size="xs" variant="ghost"><Link href={`/projects/${projectId}/history`}><GitCompare /> Compare</Link></Button>
      </div>
      {versions.map((v, i) => (
        <div key={v.id} className="hover:bg-muted/50 group flex items-center gap-2 rounded-md px-2 py-2">
          <span className="bg-muted w-9 shrink-0 rounded py-0.5 text-center font-mono text-[11px]">v{v.version_number}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{v.message || SOURCE_LABEL[v.source]}</p>
            <p className="text-muted-foreground text-[11px]">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })} · {formatBytes(v.size_bytes)}</p>
          </div>
          {i === 0 ? <Badge variant="secondary">Latest</Badge> : (
            <Button size="xs" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setConfirm(v)}><RotateCcw /> Restore</Button>
          )}
        </div>
      ))}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {confirm?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>The editor will load this version and save it as a new version. Nothing is deleted, so you can go back at any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={restoring} onClick={(e) => { e.preventDefault(); if (confirm) void restore(confirm); }}>
              {restoring && <Loader2 className="animate-spin" />} Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
