"use client";
import * as React from "react";
import Link from "next/link";
import { Group, Panel, Separator } from "react-resizable-panels";
import { toast } from "sonner";
import {
  Save, Wand2, Download, Copy, Upload, Search, Undo2, Redo2, Eye, EyeOff, ChevronLeft, MoreHorizontal, FoldVertical, UnfoldVertical,
  Loader2, CheckCircle2, CircleDot, AlertCircle, History, FileDown, PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CodeEditor, type CodeEditorHandle, type EditorMarker } from "@/components/editor/code-editor";
import { EmailPreview, DEFAULT_PREVIEW, type PreviewState } from "@/components/preview/email-preview";
import { ProjectTitle } from "./project-title";
import { useProjectSave } from "./use-save";
import { StudioInspector, type InspectorTab } from "./studio-inspector";
import { formatHtml } from "@/lib/email/format";
import { readEmailFile } from "@/lib/email/upload";
import { downloadText } from "@/lib/download";
import { byteLength, formatBytes, slugify, cn } from "@/lib/utils";
import { GMAIL_CLIP_BYTES } from "@/lib/email/limits";
import type { PreferencesRow } from "@/lib/types/database";

export interface StudioProject {
  id: string;
  name: string;
  html: string;
  updated_at: string;
}

const ANALYSIS_ENABLED = false;

function hasAmpscript(html: string) {
  return /%%\[|%%=/.test(html);
}

export function StudioWorkspace({ project, prefs }: { project: StudioProject; prefs: Pick<PreferencesRow, "editor_font_size" | "editor_word_wrap" | "editor_minimap" | "autosave" | "default_viewport"> }) {
  const editor = React.useRef<CodeEditorHandle>(null);
  const [name, setName] = React.useState(project.name);
  const [html, setHtml] = React.useState(project.html);
  const [preview, setPreview] = React.useState<PreviewState>({ ...DEFAULT_PREVIEW, viewport: prefs.default_viewport });
  const [showPreview, setShowPreview] = React.useState(true);
  const [showInspector, setShowInspector] = React.useState(true);
  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>("issues");
  const [markers, setMarkers] = React.useState<EditorMarker[]>([]);
  const [pendingUpload, setPendingUpload] = React.useState<{ name: string; html: string } | null>(null);
  const [versionDialog, setVersionDialog] = React.useState(false);
  const [versionMsg, setVersionMsg] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const [formatting, setFormatting] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const language = React.useMemo(() => (hasAmpscript(project.html) ? "html-ampscript" : "html"), [project.html]);

  const { status, onChange: trackChange, persist } = useProjectSave(project.id, project.html, prefs.autosave);

  const onChange = React.useCallback((v: string) => {
    setHtml(v);
    trackChange(v);
  }, [trackChange]);

  const save = React.useCallback((message?: string) => void persist({ createVersion: true, source: "manual", message }), [persist]);

  // ⌘S anywhere in the studio (Monaco handles it itself when focused).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && !(e.target as HTMLElement | null)?.closest?.(".monaco-editor")) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const format = React.useCallback(async () => {
    setFormatting(true);
    try {
      const formatted = await formatHtml(editor.current?.getValue() ?? html);
      editor.current?.replaceAll(formatted, "format");
      toast.success("Formatted. Press Undo to revert.");
    } catch (e) {
      toast.error(`Could not format: ${(e as Error).message.split("\n")[0]}`);
    } finally {
      setFormatting(false);
    }
  }, [html]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(editor.current?.getValue() ?? html);
      toast.success("Source copied to clipboard");
    } catch {
      toast.error("Clipboard access was denied by the browser.");
    }
  };

  const download = () => {
    downloadText(`${slugify(name)}.html`, editor.current?.getValue() ?? html);
  };

  async function handleFile(file: File) {
    const res = await readEmailFile(file);
    if (!res.ok) return toast.error(res.error);
    setPendingUpload({ name: file.name, html: res.html });
  }

  /** Applies a full-document change coming from outside the editor (AI, restore, components). */
  const applyExternal = React.useCallback((next: string, label: string) => {
    editor.current?.replaceAll(next, label);
  }, []);

  const bytes = byteLength(html);
  const lines = React.useMemo(() => html.split("\n").length, [html]);

  const StatusIcon = status.state === "saving" ? Loader2 : status.state === "dirty" ? CircleDot : status.state === "error" ? AlertCircle : CheckCircle2;
  const statusText =
    status.state === "saving" ? "Saving…" : status.state === "dirty" ? "Unsaved changes" : status.state === "error" ? "Save failed" : status.at ? `Saved ${status.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "All changes saved";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5 md:px-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to projects"><Link href="/projects"><ChevronLeft /></Link></Button>
        <ProjectTitle id={project.id} name={name} onRenamed={setName} />
        <span className={cn("text-muted-foreground ml-1 hidden items-center gap-1 text-xs sm:flex", status.state === "error" && "text-destructive", status.state === "dirty" && "text-warning")} data-testid="save-status">
          <StatusIcon className={cn("size-3.5", status.state === "saving" && "animate-spin")} /> {statusText}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <ToolbarButton label="Undo" shortcut="⌘Z" onClick={() => editor.current?.undo()} icon={Undo2} />
          <ToolbarButton label="Redo" shortcut="⇧⌘Z" onClick={() => editor.current?.redo()} icon={Redo2} />
          <ToolbarButton label="Find & replace" shortcut="⌘H" onClick={() => editor.current?.findReplace()} icon={Search} />
          <div className="bg-border mx-1 hidden h-5 w-px sm:block" />
          <Button size="sm" variant="ghost" onClick={format} disabled={formatting}>
            {formatting ? <Loader2 className="animate-spin" /> : <Wand2 />} <span className="hidden lg:inline">Format</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPreview((s) => !s)} aria-pressed={showPreview}>
            {showPreview ? <EyeOff /> : <Eye />} <span className="hidden lg:inline">Preview</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={download}><Download /> <span className="hidden lg:inline">Download</span></Button>
          <StudioActionsSlot editorRef={editor} html={html} onOpenInspector={(tab) => { setInspectorTab(tab); setShowInspector(true); }} />
          <Button size="sm" onClick={() => save()} disabled={status.state === "saving"} data-testid="save-button">
            {status.state === "saving" ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => { setVersionMsg(""); setVersionDialog(true); }}><History /> Save version with message…</DropdownMenuItem>
              <DropdownMenuItem onSelect={copy}><Copy /> Copy source</DropdownMenuItem>
              <DropdownMenuItem onSelect={download}><FileDown /> Download .html</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileInput.current?.click()}><Upload /> Replace with uploaded file…</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => editor.current?.find()}><Search /> Find<DropdownMenuShortcut>⌘F</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.current?.foldAll()}><FoldVertical /> Fold all</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.current?.unfoldAll()}><UnfoldVertical /> Unfold all</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href={`/projects/${project.id}/history`}><History /> Version history</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarButton label={showInspector ? "Hide inspector" : "Show inspector"} onClick={() => setShowInspector((s) => !s)} icon={showInspector ? PanelRightClose : PanelRightOpen} />
          <input ref={fileInput} type="file" accept=".html,.htm,.txt,text/html,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* Workspace */}
      <Group orientation="horizontal" className="min-h-0 flex-1" id="studio-layout">
        <Panel id="editor" defaultSize="45" minSize="20">
          <div
            className="relative h-full"
            onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
            onDrop={(e) => {
              if (!e.dataTransfer.files?.length) return;
              e.preventDefault();
              setDragging(false);
              void handleFile(e.dataTransfer.files[0]);
            }}
          >
            <CodeEditor
              ref={editor}
              value={project.html}
              onChange={onChange}
              language={language}
              fontSize={prefs.editor_font_size}
              wordWrap={prefs.editor_word_wrap}
              minimap={prefs.editor_minimap}
              markers={markers}
              onSave={() => save()}
              onFormat={format}
              className="h-full"
            />
            {dragging && (
              <div className="bg-primary/10 border-primary pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-lg border-2 border-dashed">
                <p className="bg-background rounded-md px-3 py-2 text-sm font-medium shadow">Drop HTML file to load it</p>
              </div>
            )}
          </div>
        </Panel>
        {showPreview && (
          <>
            <Separator className="bg-border hover:bg-primary/50 data-[separator=active]:bg-primary w-px transition-colors" />
            <Panel id="preview" defaultSize="35" minSize="20">
              <EmailPreview html={html} state={preview} onStateChange={setPreview} />
            </Panel>
          </>
        )}
        {showInspector && (
          <>
            <Separator className="bg-border hover:bg-primary/50 data-[separator=active]:bg-primary w-px transition-colors" />
            <Panel id="inspector" defaultSize="25" minSize="18">
              <StudioInspector
                projectId={project.id}
                projectName={name}
                html={html}
                tab={inspectorTab}
                onTabChange={setInspectorTab}
                onMarkers={setMarkers}
                onRevealLine={(l, c) => editor.current?.revealLine(l, c)}
                editorRef={editor}
                applyExternal={applyExternal}
                persist={persist}
              />
            </Panel>
          </>
        )}
      </Group>

      {/* Status bar */}
      <div className="text-muted-foreground flex items-center gap-3 border-t px-3 py-1 font-mono text-[10px]">
        <span>{language === "html-ampscript" ? "HTML + AMPscript" : "HTML"}</span>
        <span>{lines} lines</span>
        <span className={cn(bytes > GMAIL_CLIP_BYTES && "text-warning")}>{formatBytes(bytes)}{bytes > GMAIL_CLIP_BYTES ? " · over Gmail’s 102 KB clip limit" : ""}</span>
        {status.version ? <span>v{status.version}</span> : null}
        <span className="ml-auto hidden sm:inline">⌘S save · ⇧⌥F format · ⌘F find · ⌘H replace</span>
      </div>

      <AlertDialog open={!!pendingUpload} onOpenChange={(o) => !o && setPendingUpload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the current code?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingUpload?.name}” ({formatBytes(byteLength(pendingUpload?.html ?? ""))}) will replace the editor contents. You can undo this with ⌘Z, and saved versions are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingUpload) { applyExternal(pendingUpload.html, "upload"); toast.success("File loaded. Save to keep it as a version."); } setPendingUpload(null); }}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={versionDialog} onOpenChange={setVersionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save version</DialogTitle></DialogHeader>
          <Input autoFocus value={versionMsg} onChange={(e) => setVersionMsg(e.target.value)} maxLength={300} placeholder="e.g. Fixed Outlook button alignment" onKeyDown={(e) => { if (e.key === "Enter") { save(versionMsg); setVersionDialog(false); } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialog(false)}>Cancel</Button>
            <Button onClick={() => { save(versionMsg); setVersionDialog(false); }}><Save /> Save version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarButton({ label, shortcut, onClick, icon: Icon }: { label: string; shortcut?: string; onClick: () => void; icon: React.ComponentType }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" onClick={onClick} aria-label={label}><Icon /></Button>
      </TooltipTrigger>
      <TooltipContent>{label}{shortcut ? ` · ${shortcut}` : ""}</TooltipContent>
    </Tooltip>
  );
}

/** Analyze / AI Fix buttons; they open the matching inspector tab. */
function StudioActionsSlot({ onOpenInspector }: { editorRef: React.RefObject<CodeEditorHandle | null>; html: string; onOpenInspector: (tab: InspectorTab) => void }) {
  if (!ANALYSIS_ENABLED) return null;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => onOpenInspector("issues")} data-testid="analyze-button">
        <Search /> <span className="hidden md:inline">Analyze</span>
      </Button>
      <Button size="sm" variant="outline" onClick={() => onOpenInspector("ai")} data-testid="ai-fix-button">
        <Wand2 /> <span className="hidden md:inline">AI Fix</span>
      </Button>
    </>
  );
}
