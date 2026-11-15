"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { HtmlDiff } from "@/components/editor/html-diff";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { applyPatches, PATCH_FAILURE_LABEL, type Patch } from "@/lib/ai/patches";
import { cn } from "@/lib/utils";

export interface PatchReview {
  title: string;
  explanation?: string;
  patches: Patch[];
  model?: string;
}

/**
 * Nothing Claude proposes reaches the editor until the user approves it here.
 * Each patch can be toggled; the diff shows exactly what Apply will change.
 */
export function PatchReviewDialog({ review, html, onClose, onApply }: { review: PatchReview | null; html: string; onClose: () => void; onApply: (next: string, applied: Patch[]) => void }) {
  const { resolvedTheme } = useTheme();
  const [selected, setSelected] = React.useState<boolean[]>([]);
  const [lastReview, setLastReview] = React.useState<PatchReview | null>(null);
  if (review !== lastReview) {
    setLastReview(review);
    setSelected(review ? review.patches.map(() => true) : []);
  }

  const chosen = React.useMemo(() => (review ? review.patches.filter((_, i) => selected[i]) : []), [review, selected]);
  const result = React.useMemo(() => applyPatches(html, chosen), [html, chosen]);
  const status = React.useMemo(() => {
    if (!review) return [];
    const all = applyPatches(html, review.patches);
    return review.patches.map((p) => all.failed.find((f) => f.patch === p)?.reason ?? null);
  }, [html, review]);

  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(90vh,860px)] w-[min(96vw,1280px)] max-w-none flex-col gap-3 sm:max-w-none" data-testid="patch-review">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary size-4" /> {review?.title ?? "Review changes"}</DialogTitle>
          <DialogDescription>
            Review Claude&apos;s proposed edits. Nothing changes until you apply them, and you can undo afterwards.
            {review?.model && <span className="text-muted-foreground/80"> · {review.model}</span>}
          </DialogDescription>
        </DialogHeader>
        {review?.explanation && <p className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">{review.explanation}</p>}
        {review && review.patches.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Claude did not propose any code changes for this.</p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[280px_1fr]">
            <ul className="scrollbar-thin grid content-start gap-1.5 overflow-y-auto pr-1">
              {review?.patches.map((p, i) => {
                const failed = status[i];
                return (
                  <li key={i}>
                    <label className={cn("flex cursor-pointer gap-2 rounded-md border p-2 text-xs", failed ? "border-warning/40 cursor-not-allowed opacity-80" : selected[i] ? "border-primary/50 bg-primary/5" : "")}>
                      <input
                        type="checkbox"
                        className="accent-primary mt-0.5"
                        disabled={!!failed}
                        checked={!failed && !!selected[i]}
                        onChange={(e) => setSelected((s) => s.map((v, j) => (j === i ? e.target.checked : v)))}
                        data-testid={`patch-toggle-${i}`}
                      />
                      <span className="grid gap-1">
                        <span className="font-medium">{p.description || `Change ${i + 1}`}</span>
                        {failed && <span className="text-warning flex items-center gap-1"><AlertTriangle className="size-3" /> Can&apos;t apply: {PATCH_FAILURE_LABEL[failed]}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="min-h-[300px] overflow-hidden rounded-md border">
              <HtmlDiff original={html} modified={result.html} theme={resolvedTheme === "light" ? "vs" : "vs-dark"} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(result.html, result.applied)} disabled={result.applied.length === 0} data-testid="apply-patches">
            <Check /> Apply {result.applied.length} change{result.applied.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
