"use client";
import * as React from "react";
import Editor, { loader, type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor as MonacoEditor, IRange } from "monaco-editor";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { registerEmailLanguages } from "@/lib/sfmc/monaco-languages";

// Self-hosted Monaco (copied to /public/monaco by scripts/copy-monaco.mjs); no CDN.
loader.config({ paths: { vs: "/monaco/vs" } });

export type EditorMarker = { line: number; column?: number; endLine?: number; endColumn?: number; message: string; severity: "critical" | "high" | "medium" | "low" };

export interface CodeEditorHandle {
  getValue(): string;
  /** Replaces the whole document as one undoable edit. */
  replaceAll(value: string, label?: string): void;
  /** Applies exact-range edits as a single undo step. */
  applyEdits(edits: { range: IRange; text: string }[]): void;
  insertAtCursor(text: string): void;
  revealLine(line: number, column?: number): void;
  find(): void;
  findReplace(): void;
  undo(): void;
  redo(): void;
  focus(): void;
  foldAll(): void;
  unfoldAll(): void;
  getModel(): MonacoEditor.ITextModel | null;
  /** Text of the current selection, or empty string. */
  getSelectionText(): string;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  fontSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
  readOnly?: boolean;
  markers?: EditorMarker[];
  onSave?: () => void;
  onFormat?: () => void;
  className?: string;
}

const SEVERITY = { critical: 8, high: 8, medium: 4, low: 2 } as const; // MarkerSeverity: Error=8 Warning=4 Info=2

export const CodeEditor = React.forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, onChange, language = "html", fontSize = 13, wordWrap = false, minimap = true, readOnly = false, markers, onSave, onFormat, className },
  ref,
) {
  const { resolvedTheme } = useTheme();
  const editorRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<typeof import("monaco-editor") | null>(null);
  const saveRef = React.useRef(onSave);
  const formatRef = React.useRef(onFormat);
  React.useEffect(() => {
    saveRef.current = onSave;
    formatRef.current = onFormat;
  });

  React.useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() ?? "",
    getSelectionText() {
      const ed = editorRef.current;
      const sel = ed?.getSelection();
      const model = ed?.getModel();
      return sel && model && !sel.isEmpty() ? model.getValueInRange(sel) : "";
    },
    replaceAll(next, label = "replace") {
      const ed = editorRef.current;
      const model = ed?.getModel();
      if (!ed || !model) return;
      ed.pushUndoStop();
      const pos = ed.getPosition();
      ed.executeEdits(label, [{ range: model.getFullModelRange(), text: next, forceMoveMarkers: true }]);
      ed.pushUndoStop();
      // Keep the caret near where it was instead of jumping to the end of the document.
      if (pos) {
        const line = Math.min(pos.lineNumber, model.getLineCount());
        ed.setPosition({ lineNumber: line, column: 1 });
        ed.revealLineInCenterIfOutsideViewport(line);
      }
      ed.setScrollLeft(0);
    },
    applyEdits(edits) {
      const ed = editorRef.current;
      if (!ed) return;
      ed.pushUndoStop();
      ed.executeEdits("mailcraft", edits.map((e) => ({ range: e.range, text: e.text, forceMoveMarkers: true })));
      ed.pushUndoStop();
    },
    insertAtCursor(text) {
      const ed = editorRef.current;
      const sel = ed?.getSelection();
      if (!ed || !sel) return;
      ed.pushUndoStop();
      ed.executeEdits("insert", [{ range: sel, text, forceMoveMarkers: true }]);
      ed.pushUndoStop();
      ed.focus();
    },
    revealLine(line, column = 1) {
      const ed = editorRef.current;
      if (!ed) return;
      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column });
      ed.focus();
    },
    find: () => editorRef.current?.getAction("actions.find")?.run(),
    findReplace: () => editorRef.current?.getAction("editor.action.startFindReplaceAction")?.run(),
    undo: () => editorRef.current?.trigger("toolbar", "undo", null),
    redo: () => editorRef.current?.trigger("toolbar", "redo", null),
    focus: () => editorRef.current?.focus(),
    foldAll: () => editorRef.current?.getAction("editor.foldAll")?.run(),
    unfoldAll: () => editorRef.current?.getAction("editor.unfoldAll")?.run(),
    getModel: () => editorRef.current?.getModel() ?? null,
  }));

  const beforeMount: BeforeMount = (monaco) => {
    registerEmailLanguages(monaco);
    monaco.editor.defineTheme("mailcraft-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "ampscript.delimiter", foreground: "f0a35e", fontStyle: "bold" },
        { token: "ampscript.function", foreground: "c792ea" },
        { token: "ampscript.variable", foreground: "82aaff" },
        { token: "ampscript.personalization", foreground: "ffcb6b" },
      ],
      colors: { "editor.background": "#16171f", "editorGutter.background": "#16171f", "editor.lineHighlightBackground": "#1f2130", "editorLineNumber.foreground": "#4b4f66" },
    });
    monaco.editor.defineTheme("mailcraft-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "ampscript.delimiter", foreground: "b35c00", fontStyle: "bold" },
        { token: "ampscript.function", foreground: "7c3aed" },
        { token: "ampscript.variable", foreground: "1d4ed8" },
        { token: "ampscript.personalization", foreground: "a16207" },
      ],
      colors: {},
    });
  };

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco as unknown as typeof import("monaco-editor");
    // Monaco virtualises scrolling; if the browser natively scrolls its viewport
    // (e.g. to reveal the hidden textarea after a large edit) lines render off-screen.
    const scrollable = ed.getDomNode()?.querySelector<HTMLElement>(".monaco-scrollable-element");
    scrollable?.addEventListener("scroll", () => {
      if (scrollable.scrollLeft) scrollable.scrollLeft = 0;
      if (scrollable.scrollTop) scrollable.scrollTop = 0;
    });
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current?.());
    ed.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => formatRef.current?.());
  };

  React.useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      "mailcraft",
      (markers ?? []).map((m) => {
        const line = Math.min(Math.max(1, m.line), model.getLineCount());
        return {
          startLineNumber: line,
          startColumn: m.column ?? 1,
          endLineNumber: m.endLine ?? line,
          endColumn: m.endColumn ?? model.getLineMaxColumn(Math.min(m.endLine ?? line, model.getLineCount())),
          message: m.message,
          severity: SEVERITY[m.severity],
        };
      }),
    );
  }, [markers]);

  return (
    <div className={className} data-testid="code-editor">
      <Editor
        defaultValue={value}
        language={language}
        theme={resolvedTheme === "light" ? "mailcraft-light" : "mailcraft-dark"}
        beforeMount={beforeMount}
        onMount={onMount}
        onChange={(v) => onChange?.(v ?? "")}
        loading={<div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading editor…</div>}
        options={{
          fontSize,
          fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: false,
          wordWrap: wordWrap ? "on" : "off",
          minimap: { enabled: minimap },
          readOnly,
          lineNumbers: "on",
          folding: true,
          foldingStrategy: "indentation",
          showFoldingControls: "mouseover",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          tabSize: 2,
          smoothScrolling: true,
          padding: { top: 8 },
          stickyScroll: { enabled: true },
          linkedEditing: true,
        }}
      />
    </div>
  );
});
