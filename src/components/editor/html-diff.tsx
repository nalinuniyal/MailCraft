"use client";
import * as React from "react";
import { DiffEditor, loader, type DiffOnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

loader.config({ paths: { vs: "/monaco/vs" } });

/* @monaco-editor/react disposes the models before the diff widget lets go of
 * them on unmount, which throws. Keep the models and dispose them ourselves. */
export function HtmlDiff({ original, modified, theme, sideBySide = true }: { original: string; modified: string; theme: string; sideBySide?: boolean }) {
  const ref = React.useRef<Parameters<DiffOnMount>[0] | null>(null);
  React.useEffect(
    () => () => {
      const ed = ref.current;
      const models = ed?.getModel();
      ed?.setModel(null);
      models?.original.dispose();
      models?.modified.dispose();
    },
    [],
  );
  return (
    <DiffEditor
      original={original}
      modified={modified}
      language="html"
      theme={theme}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      onMount={(ed) => {
        ref.current = ed;
      }}
      loading={<Loader2 className="text-muted-foreground size-5 animate-spin" />}
      options={{ readOnly: true, originalEditable: false, renderSideBySide: sideBySide, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on", diffWordWrap: "on", hideUnchangedRegions: { enabled: true } }}
    />
  );
}
