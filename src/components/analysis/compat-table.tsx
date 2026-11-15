"use client";
import * as React from "react";
import { ExternalLink, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FeatureUsage, CompatibilityResult } from "@/lib/email/compat";
import { KEY_CLIENTS, type SupportLevel } from "@/lib/email/caniemail";
import { SUPPORT_META, SupportIcon } from "./severity";
import { cn } from "@/lib/utils";

export function CompatSourceNote({ source, className }: { source: CompatibilityResult["source"]; className?: string }) {
  return (
    <p className={cn("text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed", className)}>
      <Database className="mt-0.5 size-3 shrink-0" />
      <span>
        Data: <a href={source.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{source.name}</a> via {source.package} · last updated {source.lastUpdated.slice(0, 10)} · {source.featureCount} features tracked. Support reflects Can I Email&apos;s published test results, not live rendering of your email.
      </span>
    </p>
  );
}

export function SupportLegend() {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-3 text-[11px]">
      {(Object.keys(SUPPORT_META) as SupportLevel[]).map((l) => (
        <span key={l} className="flex items-center gap-1"><SupportIcon level={l} className="size-3.5" /> {SUPPORT_META[l].label}</span>
      ))}
    </div>
  );
}

export function CompatFeatureTable({ features, onReveal, compact = false }: { features: FeatureUsage[]; onReveal?: (line: number) => void; compact?: boolean }) {
  const clients = compact ? KEY_CLIENTS.filter((c) => ["apple-mail:ios", "gmail:desktop-webmail", "gmail:android", "outlook:windows", "outlook:outlook-com", "yahoo:desktop-webmail"].includes(`${c.family}:${c.platform}`)) : KEY_CLIENTS;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="sticky left-0 z-10 bg-muted/90 px-2 py-2 text-left font-medium">Feature</th>
            {clients.map((c) => (
              <th key={c.label} className="px-1 py-2 font-normal">
                <span className="text-muted-foreground block w-10 text-center text-[10px] leading-tight" title={c.label}>{c.label.replace("Apple Mail", "Apple").replace("Outlook", "OL").replace(" Windows", " Win")}</span>
              </th>
            ))}
            {!compact && <th className="px-2 py-2 text-right font-medium">All</th>}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.slug} className="hover:bg-muted/30 border-t">
              <td className="bg-card sticky left-0 z-10 px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <a href={f.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-2 hover:underline">{f.title}</a>
                  <ExternalLink className="text-muted-foreground size-3" />
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-1 font-mono text-[10px]">
                  {f.occurrences.slice(0, 4).map((o) =>
                    onReveal ? (
                      <button key={o.line} type="button" onClick={() => onReveal(o.line)} className="hover:text-primary" title={o.context}>L{o.line}</button>
                    ) : (
                      <span key={o.line} title={o.context}>L{o.line}</span>
                    ),
                  )}
                  {f.occurrences.length > 4 && <span>+{f.occurrences.length - 4}</span>}
                </div>
              </td>
              {clients.map((c) => {
                const s = f.clients.find((x) => x.family === c.family && x.platform === c.platform)!;
                return (
                  <td key={c.label} className="px-1 py-1.5 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex"><SupportIcon level={s.level} /></span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-left">
                        <p className="font-medium">{c.label}: {SUPPORT_META[s.level].label}</p>
                        {Object.keys(s.versions).length > 0 && <p className="mt-0.5 font-mono text-[10px]">{Object.entries(s.versions).map(([v, r]) => `${v}: ${r}`).join(" · ")}</p>}
                        {s.notes.map((n) => <p key={n} className="mt-0.5">{n}</p>)}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                );
              })}
              {!compact && <td className="px-2 py-1.5 text-right tabular-nums">{f.supportPct == null ? "–" : `${f.supportPct}%`}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientSummaryGrid({ rows }: { rows: CompatibilityResult["clientSummary"] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const total = r.supported + r.partial + r.unsupported + r.unknown || 1;
        return (
          <div key={r.label} className="bg-card rounded-lg border p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{r.label}</span>
              {r.unsupported > 0 ? <span className="text-sev-critical">{r.unsupported} unsupported</span> : r.partial > 0 ? <span className="text-warning">{r.partial} partial</span> : <span className="text-success">No blockers</span>}
            </div>
            <div className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full" aria-hidden>
              <div className="bg-success" style={{ width: `${(r.supported / total) * 100}%` }} />
              <div className="bg-warning" style={{ width: `${(r.partial / total) * 100}%` }} />
              <div className="bg-sev-critical" style={{ width: `${(r.unsupported / total) * 100}%` }} />
              <div className="bg-muted-foreground/30" style={{ width: `${(r.unknown / total) * 100}%` }} />
            </div>
            <p className="text-muted-foreground mt-1.5 text-[11px]">{r.supported} supported · {r.partial} partial · {r.unsupported} unsupported · {r.unknown} untested</p>
          </div>
        );
      })}
    </div>
  );
}
