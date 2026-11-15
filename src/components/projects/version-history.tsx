"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { Download, Eye, GitCompare, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HtmlDiff } from "@/components/editor/html-diff";
import { HtmlThumb } from "@/components/library/html-thumb";
import { SOURCE_LABEL } from "@/components/studio/versions-panel";
import { createClient } from "@/lib/supabase/client";
import { restoreVersion } from "@/lib/actions/projects";
import { downloadText } from "@/lib/download";
import { formatBytes, slugify, cn } from "@/lib/utils";
import type { VersionRow } from "@/lib/types/database";

type Meta = Pick<VersionRow, "id" | "version_number" | "message" | "source" | "size_bytes" | "created_at">;

export function VersionHistory({ projectId, projectName, versions, initialA, initialB }: { projectId: string; projectName: string; versions: Meta[]; initialA?: string; initialB?: string }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const valid = (id?: string) => (id && versions.some((v) => v.id === id) ? id : undefined);
  const [b, setB] = React.useState<string | undefined>(valid(initialB) ?? versions[0]?.id);
  const [a, setA] = React.useState<string | undefined>(valid(initialA) ?? versions[1]?.id ?? versions[0]?.id);
  const [mode, setMode] = React.useState<"diff" | "preview">("diff");
  const [cache, setCache] = React.useState<Record<string, string>>({});
  const [confirm, setConfirm] = React.useState<Meta | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const byId = (id?: string) => versions.find((v) => v.id === id);

  React.useEffect(() => {
    const missing = [a, b].filter((id): id is string => !!id && !(id in cache));
    if (missing.length === 0) return;
    let cancelled = false;
    void createClient().from("email_versions").select("id, html").in("id", missing).then(({ data, error }) => {
      if (cancelled) return;
      if (error) return void toast.error(error.message);
      setCache((c) => ({ ...c, ...Object.fromEntries((data ?? []).map((r) => [r.id, r.html])) }));
    });
    return () => {
      cancelled = true;
    };
  }, [a, b, cache]);

  React.useEffect(() => {
    if (a && b) window.history.replaceState(null, "", `?a=${a}&b=${b}`);
  }, [a, b]);

  async function restore(v: Meta) {
    setRestoring(true);
    const res = await restoreVersion(projectId, v.id);
    setRestoring(false);
    setConfirm(null);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Restored v${v.version_number} as v${res.data.versionNumber}`, { action: { label: "Open in studio", onClick: () => router.push(`/studio/${projectId}`) } });
    router.refresh();
  }

  if (versions.length === 0) return <p className="text-muted-foreground text-sm">No versions yet.</p>;
  const va = byId(a), vb = byId(b);
  const ready = a && b && a in cache && b in cache;

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[300px_1fr]">
      <ol className="bg-card scrollbar-thin grid max-h-[70vh] content-start divide-y overflow-y-auto rounded-xl border" data-testid="version-list">
        {versions.map((v) => (
          <li key={v.id} className={cn("grid gap-1 px-3 py-2.5", (v.id === a || v.id === b) && "bg-primary/5")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">v{v.version_number} {v.id === versions[0].id && <Badge variant="secondary" className="ml-1">Latest</Badge>}</span>
              <span className="text-muted-foreground text-[11px]">{formatBytes(v.size_bytes)}</span>
            </div>
            <p className="text-muted-foreground truncate text-xs">{v.message ?? SOURCE_LABEL[v.source] ?? v.source} · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</p>
            <div className="flex flex-wrap gap-1">
              <Button size="xs" variant={v.id === a ? "secondary" : "ghost"} onClick={() => setA(v.id)} aria-pressed={v.id === a}>Base</Button>
              <Button size="xs" variant={v.id === b ? "secondary" : "ghost"} onClick={() => setB(v.id)} aria-pressed={v.id === b}>Compare</Button>
              {v.id !== versions[0].id && <Button size="xs" variant="ghost" onClick={() => setConfirm(v)} data-testid={`restore-v${v.version_number}`}><RotateCcw /> Restore</Button>}
            </div>
          </li>
        ))}
      </ol>
      <div className="bg-card grid min-h-[60vh] grid-rows-[auto_1fr] overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          <VersionSelect versions={versions} value={a} onChange={setA} label="Base" />
          <GitCompare className="text-muted-foreground size-4" />
          <VersionSelect versions={versions} value={b} onChange={setB} label="Compare" />
          <div className="bg-muted ml-auto inline-flex rounded-md p-0.5 text-xs">
            <button onClick={() => setMode("diff")} className={cn("flex items-center gap-1 rounded px-2.5 py-1", mode === "diff" ? "bg-background shadow-sm" : "text-muted-foreground")}><GitCompare className="size-3.5" /> Diff</button>
            <button onClick={() => setMode("preview")} className={cn("flex items-center gap-1 rounded px-2.5 py-1", mode === "preview" ? "bg-background shadow-sm" : "text-muted-foreground")}><Eye className="size-3.5" /> Preview</button>
          </div>
          {vb && b && b in cache && <Button size="xs" variant="outline" onClick={() => downloadText(`${slugify(projectName)}-v${vb.version_number}.html`, cache[b])}><Download /> v{vb.version_number}</Button>}
        </div>
        {!ready ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading versions…</div>
        ) : mode === "diff" ? (
          <div className="min-h-[60vh]" data-testid="version-diff">
            {a === b && <p className="text-muted-foreground border-b px-3 py-1.5 text-xs">Same version selected on both sides.</p>}
            <HtmlDiff original={cache[a!]} modified={cache[b!]} theme={resolvedTheme === "light" ? "vs" : "vs-dark"} />
          </div>
        ) : (
          <div className="grid gap-px md:grid-cols-2">
            {[va, vb].map((v, i) => (
              <div key={i} className="grid content-start">
                <p className="text-muted-foreground border-b px-3 py-1.5 text-xs">v{v?.version_number}</p>
                <HtmlThumb html={cache[(i === 0 ? a : b)!]} width={640} height={1400} scale={0.7} title={`Version ${v?.version_number}`} />
              </div>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{confirm?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>The email&apos;s current HTML is replaced with this version and saved as a new version. Every existing version stays in the history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={restoring} onClick={(e) => { e.preventDefault(); if (confirm) void restore(confirm); }} data-testid="confirm-restore">{restoring && <Loader2 className="animate-spin" />} Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VersionSelect({ versions, value, onChange, label }: { versions: Meta[]; value?: string; onChange: (id: string) => void; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-56" aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        {versions.map((v) => <SelectItem key={v.id} value={v.id}>{label}: v{v.version_number} · {v.message ?? SOURCE_LABEL[v.source] ?? v.source}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
