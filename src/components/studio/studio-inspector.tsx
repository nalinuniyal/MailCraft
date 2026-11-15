"use client";
import * as React from "react";
import { History, ListChecks, Loader2, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiPanel, useAiReview } from "@/components/ai/ai-panel";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VersionsPanel } from "./versions-panel";
import { useAnalysis, IssuesTab, CompatTab } from "./analysis-panel";
import { countIssues } from "@/lib/email/types";
import type { CodeEditorHandle, EditorMarker } from "@/components/editor/code-editor";
import type { VersionSource } from "@/lib/types/database";

export type InspectorTab = "issues" | "compat" | "ai" | "versions";

type Persist = (opts: { createVersion: boolean; source?: Extract<VersionSource, "manual" | "autosave" | "ai" | "restore">; message?: string; quiet?: boolean }) => Promise<boolean>;

export interface InspectorProps {
  projectId: string;
  projectName: string;
  html: string;
  tab: InspectorTab;
  onTabChange: (t: InspectorTab) => void;
  onMarkers: (m: EditorMarker[]) => void;
  onRevealLine: (line: number, column?: number) => void;
  editorRef: React.RefObject<CodeEditorHandle | null>;
  applyExternal: (html: string, label: string) => void;
  persist: Persist;
  /** Incremented by the toolbar's Analyze button to trigger a full analysis. */
  analyzeNonce: number;
  aiConfigured: boolean;
}

export function StudioInspector(props: InspectorProps) {
  const { projectId, tab, onTabChange, applyExternal, persist, html, onMarkers, onRevealLine } = props;
  const [versionsKey, setVersionsKey] = React.useState(0);
  const analysis = useAnalysis(html, onMarkers);
  const counts = countIssues(analysis.issues);
  const urgent = counts.critical + counts.high;
  const { analyze } = analysis;
  const ai = useAiReview({ html, applyExternal, persist });
  React.useEffect(() => {
    if (props.analyzeNonce > 0) void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on explicit Analyze clicks
  }, [props.analyzeNonce]);

  const restore = async (html: string, version: number) => {
    applyExternal(html, "restore");
    const ok = await persist({ createVersion: true, source: "restore", message: `Restored v${version}`, quiet: true });
    if (ok) toast.success(`Restored version ${version}`);
    setVersionsKey((k) => k + 1);
  };

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as InspectorTab)} className="h-full gap-0">
      <div className="border-b px-2 py-1.5">
        <TabsList className="h-8 w-full">
          <TabsTrigger value="issues" className="text-xs" data-testid="tab-issues">
            <ListChecks /> Issues
            {analysis.issues.length > 0 && <span className={urgent ? "bg-sev-critical/20 text-sev-critical rounded px-1 text-[10px] tabular-nums" : "bg-muted rounded px-1 text-[10px] tabular-nums"}>{analysis.issues.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="compat" className="text-xs"><ShieldCheck /> Compat</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs" data-testid="tab-ai"><Sparkles /> AI</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs"><History /> Versions</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="issues" className="min-h-0 overflow-y-auto scrollbar-thin">
        <IssuesTab
          analysis={analysis}
          html={html}
          projectId={projectId}
          onReveal={(l) => onRevealLine(l)}
          renderActions={props.aiConfigured ? (i) => (
            <Button size="xs" variant="outline" disabled={!!ai.fixingId} onClick={() => void ai.fixIssue(i)} data-testid="fix-with-ai">
              {ai.fixingId === i.id ? <Loader2 className="animate-spin" /> : <Wand2 />} Fix with AI
            </Button>
          ) : undefined}
        />
      </TabsContent>
      <TabsContent value="compat" className="min-h-0 overflow-y-auto scrollbar-thin">
        <CompatTab analysis={analysis} html={html} onReveal={(l) => onRevealLine(l)} />
      </TabsContent>
      <TabsContent value="ai" className="min-h-0" forceMount hidden={tab !== "ai"}>
        <AiPanel configured={props.aiConfigured} html={html} projectId={projectId} editorRef={props.editorRef} ai={ai} onReveal={(l) => onRevealLine(l)} />
      </TabsContent>
      <TabsContent value="versions" className="min-h-0 overflow-y-auto scrollbar-thin">
        <VersionsPanel projectId={projectId} onRestore={restore} refreshKey={versionsKey} />
      </TabsContent>
      {ai.dialog}
    </Tabs>
  );
}
