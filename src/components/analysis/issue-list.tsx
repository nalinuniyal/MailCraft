"use client";
import * as React from "react";
import { ChevronRight, Copy, Check, CornerDownRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEVERITIES, countIssues, type Issue, type Severity } from "@/lib/email/types";
import { SEVERITY_META, SeverityBadge } from "./severity";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<Issue["source"], string> = { rule: "Rule", caniemail: "Can I Email", ai: "AI", "link-check": "Link check" };

export function SeverityFilter({ issues, value, onChange }: { issues: Pick<Issue, "severity">[]; value: Severity | "all"; onChange: (v: Severity | "all") => void }) {
  const counts = countIssues(issues);
  const opts: (Severity | "all")[] = ["all", ...SEVERITIES];
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Filter by severity">
      {opts.map((o) => {
        const n = o === "all" ? issues.length : counts[o];
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={cn("flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors", value === o ? "bg-accent border-primary/40 text-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            {o !== "all" && React.createElement(SEVERITY_META[o].icon, { className: cn("size-3", SEVERITY_META[o].text) })}
            {o === "all" ? "All" : SEVERITY_META[o].label}
            <span className="tabular-nums opacity-70">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      size="icon-xs"
      variant="ghost"
      aria-label="Copy code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          toast.error("Clipboard unavailable");
        }
      }}
    >
      {done ? <Check /> : <Copy />}
    </Button>
  );
}

export function IssueCard({ issue, onReveal, actions, defaultOpen = false }: { issue: Issue; onReveal?: (line: number) => void; actions?: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="bg-card rounded-lg border" data-testid="issue-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left" aria-expanded={open}>
        <ChevronRight className={cn("text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform", open && "rotate-90")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={issue.severity} />
            {issue.line ? <span className="text-muted-foreground font-mono text-[11px]">L{issue.line}</span> : null}
            <Badge variant="outline" className="text-muted-foreground">{SOURCE_LABEL[issue.source]}</Badge>
          </div>
          <p className="mt-1 text-sm leading-snug font-medium">{issue.title}</p>
        </div>
      </button>
      {open && (
        <div className="grid gap-2.5 border-t px-3 py-3 text-xs leading-relaxed">
          <p>{issue.description}</p>
          {issue.snippet && (
            <div className="flex items-start gap-1">
              <pre className="bg-muted flex-1 overflow-x-auto rounded px-2 py-1.5 font-mono text-[11px] whitespace-pre-wrap break-all">{issue.snippet}</pre>
              {issue.line && onReveal && (
                <Button size="xs" variant="ghost" onClick={() => onReveal(issue.line!)}><CornerDownRight /> Line {issue.line}</Button>
              )}
            </div>
          )}
          <div><p className="text-muted-foreground font-medium">Why it matters</p><p>{issue.whyItMatters}</p></div>
          <div>
            <p className="text-muted-foreground font-medium">Recommended solution</p>
            <p>{linkify(issue.recommendation)}</p>
          </div>
          {issue.suggestedCode && (
            <div>
              <div className="flex items-center justify-between"><p className="text-muted-foreground font-medium">Suggested code</p><CopyButton text={issue.suggestedCode} /></div>
              <pre className="bg-muted max-h-56 overflow-auto rounded px-2 py-1.5 font-mono text-[11px] whitespace-pre">{issue.suggestedCode}</pre>
            </div>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

function linkify(text: string) {
  const parts = text.split(/(https:\/\/www\.caniemail\.com\/[^\s)]+)/g);
  return parts.map((p, i) =>
    /^https:\/\/www\.caniemail\.com\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 underline-offset-2 hover:underline">caniemail.com <ExternalLink className="size-3" /></a>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

export function IssueList({ issues, onReveal, renderActions, empty }: { issues: Issue[]; onReveal?: (line: number) => void; renderActions?: (i: Issue) => React.ReactNode; empty?: React.ReactNode }) {
  const [filter, setFilter] = React.useState<Severity | "all">("all");
  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const shown = issues.filter((i) => filter === "all" || i.severity === filter).sort((a, b) => order[a.severity] - order[b.severity] || (a.line ?? 0) - (b.line ?? 0));
  return (
    <div className="grid gap-2">
      <SeverityFilter issues={issues} value={filter} onChange={setFilter} />
      {shown.length === 0 ? empty ?? <p className="text-muted-foreground py-6 text-center text-sm">No {filter === "all" ? "" : `${filter} `}issues.</p> : shown.map((i) => <IssueCard key={i.id} issue={i} onReveal={onReveal} actions={renderActions?.(i)} />)}
    </div>
  );
}
