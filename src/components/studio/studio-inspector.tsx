"use client";
import * as React from "react";
import { History } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VersionsPanel } from "./versions-panel";
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
}

export function StudioInspector(props: InspectorProps) {
  const { projectId, tab, onTabChange, applyExternal, persist } = props;
  const [versionsKey, setVersionsKey] = React.useState(0);

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
          <TabsTrigger value="versions" className="text-xs"><History /> Versions</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="versions" className="min-h-0 overflow-y-auto scrollbar-thin">
        <VersionsPanel projectId={projectId} onRestore={restore} refreshKey={versionsKey} />
      </TabsContent>
    </Tabs>
  );
}
