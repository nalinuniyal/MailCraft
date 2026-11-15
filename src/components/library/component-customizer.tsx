"use client";
import * as React from "react";
import { Check, Copy, CornerDownLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HtmlThumb, wrapFragment } from "./html-thumb";
import { fillPlaceholders, parsePlaceholders } from "@/lib/library/placeholders";
import type { ComponentRow } from "@/lib/types/database";

export type LibraryComponent = Pick<ComponentRow, "id" | "kind" | "name" | "description" | "html" | "tags" | "is_system" | "updated_at"> & { own: boolean };

/** Fields for each {{placeholder}}, live sandboxed preview and the final HTML. */
export function ComponentCustomizer({ component, onInsert, compact = false }: { component: LibraryComponent; onInsert?: (html: string) => void; compact?: boolean }) {
  const fields = React.useMemo(() => parsePlaceholders(component.html), [component.html]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const html = React.useMemo(() => fillPlaceholders(component.html, values), [component.html, values]);
  const [copied, setCopied] = React.useState(false);
  const isHead = component.kind === "head";

  async function copy() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    toast.success("HTML copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-4">
      {!isHead && (
        <div className="overflow-hidden rounded-md border">
          <HtmlThumb html={wrapFragment(html)} width={640} height={compact ? 380 : 640} scale={compact ? 0.66 : 0.75} title={`${component.name} preview`} />
        </div>
      )}
      {fields.length > 0 && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Customize</h3>
            <Button size="xs" variant="ghost" onClick={() => setValues({})} disabled={Object.keys(values).length === 0}><RotateCcw /> Reset</Button>
          </div>
          <div className={compact ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
            {fields.map((f) => {
              const id = `ph-${component.id}-${f.key}`;
              const value = values[f.key] ?? f.defaultValue;
              const set = (v: string) => setValues((s) => ({ ...s, [f.key]: v }));
              return (
                <div key={f.key} className={f.kind === "long" ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}>
                  <Label htmlFor={id} className="text-xs">{f.label}</Label>
                  {f.kind === "color" ? (
                    <div className="flex gap-2">
                      <input type="color" aria-label={`${f.label} picker`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => set(e.target.value)} className="h-9 w-10 cursor-pointer rounded border bg-transparent p-0.5" />
                      <Input id={id} value={value} onChange={(e) => set(e.target.value)} className="font-mono text-xs" />
                    </div>
                  ) : f.kind === "long" ? (
                    <Textarea id={id} value={value} onChange={(e) => set(e.target.value)} rows={2} />
                  ) : (
                    <Input id={id} value={value} type={f.kind === "number" ? "number" : "text"} inputMode={f.kind === "url" ? "url" : undefined} onChange={(e) => set(e.target.value)} className={f.kind === "url" ? "font-mono text-xs" : undefined} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <details className="group rounded-md border" open={isHead}>
        <summary className="text-muted-foreground cursor-pointer px-3 py-2 text-xs">HTML ({html.split("\n").length} lines)</summary>
        <pre className="bg-muted/40 scrollbar-thin max-h-64 overflow-auto border-t p-3 font-mono text-[11px] leading-relaxed whitespace-pre">{html}</pre>
      </details>
      <div className="flex flex-wrap gap-2">
        {onInsert && <Button onClick={() => onInsert(html)} data-testid="insert-component"><CornerDownLeft /> Insert at cursor</Button>}
        <Button variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />} Copy HTML</Button>
      </div>
      {onInsert && !isHead && <p className="text-muted-foreground text-[11px]">Rows (<code>&lt;tr&gt;</code>) belong inside your 600px container table. Place the cursor there first.</p>}
      {onInsert && isHead && <p className="text-muted-foreground text-[11px]">Place the cursor inside <code>&lt;head&gt;</code> before inserting.</p>}
    </div>
  );
}
