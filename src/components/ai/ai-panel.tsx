"use client";
import * as React from "react";
import { Bot, KeyRound, Loader2, MessageSquare, RefreshCw, Send, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { IssueList } from "@/components/analysis/issue-list";
import { PatchReviewDialog, type PatchReview } from "./patch-review-dialog";
import type { Patch } from "@/lib/ai/patches";
import type { AiIssue, ChatMessage } from "@/lib/ai/schemas";
import type { Issue } from "@/lib/email/types";
import type { CodeEditorHandle } from "@/components/editor/code-editor";
import type { VersionSource } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Persist = (opts: { createVersion: boolean; source?: Extract<VersionSource, "manual" | "autosave" | "ai" | "restore">; message?: string; quiet?: boolean }) => Promise<boolean>;

async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? `Request failed (${res.status}).` };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

/** Shared review + apply flow used by the AI tab and the "Fix with AI" buttons. */
export function useAiReview({ html, applyExternal, persist }: { html: string; applyExternal: (html: string, label: string) => void; persist: Persist }) {
  const [review, setReview] = React.useState<PatchReview | null>(null);
  const [fixingId, setFixingId] = React.useState<string | null>(null);

  const apply = React.useCallback(
    async (next: string, applied: Patch[]) => {
      const before = html;
      const title = review?.title ?? "AI change";
      setReview(null);
      applyExternal(next, "ai");
      const ok = await persist({ createVersion: true, source: "ai", message: `AI: ${title}`.slice(0, 280), quiet: true });
      toast.success(`Applied ${applied.length} AI change${applied.length === 1 ? "" : "s"}${ok ? " and saved a version" : ""}`, {
        action: {
          label: "Undo",
          onClick: () => {
            applyExternal(before, "undo-ai");
            void persist({ createVersion: true, source: "restore", message: "Undid AI change", quiet: true });
          },
        },
      });
    },
    [html, review, applyExternal, persist],
  );

  const fixIssue = React.useCallback(
    async (issue: Issue) => {
      setFixingId(issue.id);
      const res = await postJson<{ explanation: string; patches: Patch[]; model: string }>("/api/ai/fix", {
        html,
        issue: { title: issue.title, description: issue.description, recommendation: issue.recommendation, line: issue.line, snippet: issue.snippet?.slice(0, 4000) },
      });
      setFixingId(null);
      if (!res.ok) return void toast.error(res.error);
      setReview({ title: `Fix: ${issue.title}`, explanation: res.data.explanation, patches: res.data.patches, model: res.data.model });
    },
    [html],
  );

  const dialog = <PatchReviewDialog review={review} html={html} onClose={() => setReview(null)} onApply={apply} />;
  return { review, setReview, fixIssue, fixingId, dialog };
}

export type AiReview = ReturnType<typeof useAiReview>;

export function AiNotConfigured() {
  return (
    <EmptyState
      icon={KeyRound}
      title="AI isn't configured yet"
      description="Add ANTHROPIC_API_KEY to the server environment to enable Claude analysis, fixes and the assistant. The key stays on the server and is never sent to the browser."
      className="m-3"
    />
  );
}

type AnalysisResult = { reportId: string | null; createdAt: string; model: string; summary: string; issues: AiIssue[]; html: string };

export function AiPanel({ configured, html, projectId, editorRef, ai, onReveal }: { configured: boolean; html: string; projectId: string; editorRef: React.RefObject<CodeEditorHandle | null>; ai: AiReview; onReveal: (line: number) => void }) {
  const [mode, setMode] = React.useState<"review" | "chat">("review");
  if (!configured) return <AiNotConfigured />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b p-2">
        {([["review", "Review", Sparkles], ["chat", "Assistant", MessageSquare]] as const).map(([m, label, Icon]) => (
          <Button key={m} size="xs" variant={mode === m ? "secondary" : "ghost"} onClick={() => setMode(m)} data-testid={`ai-mode-${m}`}><Icon /> {label}</Button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <div className={cn("h-full overflow-y-auto scrollbar-thin", mode !== "review" && "hidden")}><AiAnalysisView html={html} projectId={projectId} ai={ai} onReveal={onReveal} /></div>
        <div className={cn("h-full", mode !== "chat" && "hidden")}><AiChatView html={html} editorRef={editorRef} ai={ai} /></div>
      </div>
    </div>
  );
}

function AiAnalysisView({ html, projectId, ai, onReveal }: { html: string; projectId: string; ai: AiReview; onReveal: (line: number) => void }) {
  const [result, setResult] = React.useState<AnalysisResult | null>(null);
  const [running, setRunning] = React.useState(false);
  const stale = result && result.html !== html;
  const fixes = (result?.issues ?? []).flatMap((i) => (i.fix ? [i.fix] : []));

  async function run() {
    setRunning(true);
    const sent = html;
    const res = await postJson<Omit<AnalysisResult, "html">>("/api/ai/analyze", { html: sent, projectId });
    setRunning(false);
    if (!res.ok) return void toast.error(res.error);
    setResult({ ...res.data, html: sent });
    toast.success(`AI analysis complete: ${res.data.issues.length} findings`);
  }

  return (
    <div className="grid gap-3 p-3">
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" onClick={run} disabled={running} data-testid="ai-analyze">
          {running ? <Loader2 className="animate-spin" /> : result ? <RefreshCw /> : <Sparkles />} {result ? "Re-run AI analysis" : "Run AI analysis"}
        </Button>
        {fixes.length > 1 && (
          <Button size="xs" variant="outline" disabled={!!stale} onClick={() => ai.setReview({ title: `Apply ${fixes.length} AI fixes`, patches: fixes, model: result?.model })} data-testid="ai-fix-all">
            <Wand2 /> Review all {fixes.length} fixes
          </Button>
        )}
      </div>
      {running && <p className="text-muted-foreground text-xs">Claude is reviewing the email. This usually takes 20–60 seconds.</p>}
      {!result && !running && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Claude reviews the whole email for rendering risks, dark-mode and accessibility problems, and proposes fixes. Results are saved to this project and included in QA reports for the same version. Suggested fixes are only applied after you review them.
        </p>
      )}
      {result && (
        <>
          <div className="bg-muted/40 rounded-md border p-3 text-sm" data-testid="ai-summary">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium"><Bot className="size-3.5" /> Summary <span className="text-muted-foreground font-normal">· {result.model} · {new Date(result.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p>
            <p className="whitespace-pre-wrap">{result.summary}</p>
          </div>
          {stale && <p className="text-warning text-xs">The email changed since this analysis. Re-run it before applying fixes; individual fixes are re-checked against the current code when you review them.</p>}
          <IssueList
            issues={result.issues}
            onReveal={onReveal}
            renderActions={(i) => {
              const fix = (i as AiIssue).fix;
              return fix ? (
                <Button size="xs" variant="outline" onClick={() => ai.setReview({ title: i.title, explanation: i.recommendation, patches: [fix], model: result.model })}><Wand2 /> Review fix</Button>
              ) : null;
            }}
            empty={<p className="text-muted-foreground py-6 text-center text-sm">Claude found no issues for this filter.</p>}
          />
        </>
      )}
    </div>
  );
}

type ChatEntry = ChatMessage & { patches?: Patch[]; model?: string };

function AiChatView({ html, editorRef, ai }: { html: string; editorRef: React.RefObject<CodeEditorHandle | null>; ai: AiReview }) {
  const [entries, setEntries] = React.useState<ChatEntry[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [useSelection, setUseSelection] = React.useState(true);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries, sending]);

  async function send(text = input) {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatEntry[] = [...entries, { role: "user", content }];
    setEntries(next);
    setInput("");
    setSending(true);
    const selection = useSelection ? editorRef.current?.getSelectionText() || undefined : undefined;
    const res = await postJson<{ reply: string; patches: Patch[]; model: string }>("/api/ai/assist", {
      html,
      selection: selection?.slice(0, 20_000),
      messages: next.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 8000) })),
    });
    setSending(false);
    if (!res.ok) {
      toast.error(res.error);
      setEntries(entries);
      setInput(content);
      return;
    }
    setEntries([...next, { role: "assistant", content: res.data.reply, patches: res.data.patches, model: res.data.model }]);
  }

  const suggestions = ["Make this email dark-mode safe", "Convert the layout to a responsive fluid-hybrid structure", "Add an Outlook-safe bulletproof button", "Explain what this email does in Outlook for Windows"];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3" data-testid="ai-chat-log">
        {entries.length === 0 && (
          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs">Ask Claude about this email. It can explain code and propose edits, which you review before anything changes.</p>
            {suggestions.map((s) => (
              <button key={s} onClick={() => void send(s)} className="hover:bg-muted rounded-md border px-2.5 py-1.5 text-left text-xs">{s}</button>
            ))}
          </div>
        )}
        {entries.map((e, i) => (
          <div key={i} className={cn("rounded-lg px-3 py-2 text-sm", e.role === "user" ? "bg-primary/10 ml-6" : "bg-muted/60 mr-2")}>
            <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wide uppercase">{e.role === "user" ? "You" : `Claude${e.model ? ` · ${e.model}` : ""}`}</p>
            <div className="break-words whitespace-pre-wrap">{e.content}</div>
            {e.patches && e.patches.length > 0 && (
              <Button size="xs" className="mt-2" onClick={() => ai.setReview({ title: "Assistant changes", explanation: undefined, patches: e.patches!, model: e.model })} data-testid="ai-chat-review">
                <Wand2 /> Review {e.patches.length} proposed change{e.patches.length === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        ))}
        {sending && <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2 className="size-3.5 animate-spin" /> Claude is thinking…</p>}
        <div ref={endRef} />
      </div>
      <form className="grid gap-1.5 border-t p-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ask about this email or request a change…"
          className="min-h-16 resize-none text-sm"
          maxLength={8000}
          data-testid="ai-chat-input"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <input type="checkbox" className="accent-primary" checked={useSelection} onChange={(e) => setUseSelection(e.target.checked)} /> Include editor selection
          </label>
          <div className="flex gap-1">
            {entries.length > 0 && <Button type="button" size="xs" variant="ghost" onClick={() => setEntries([])} disabled={sending}>Clear</Button>}
            <Button type="submit" size="xs" disabled={sending || !input.trim()}><Send /> Send</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
