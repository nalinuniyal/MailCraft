/**
 * AI edits are expressed as exact find/replace patches rather than whole-file
 * rewrites, so the user can review each change and nothing outside the patch
 * is touched. A patch only applies when its `find` text occurs exactly once.
 */
export interface Patch {
  description: string;
  find: string;
  replace: string;
}

export type PatchFailure = { patch: Patch; reason: "not-found" | "ambiguous" | "empty" };

export function applyPatches(html: string, patches: Patch[]): { html: string; applied: Patch[]; failed: PatchFailure[] } {
  let out = html;
  const applied: Patch[] = [];
  const failed: PatchFailure[] = [];
  for (const patch of patches) {
    if (!patch.find) {
      failed.push({ patch, reason: "empty" });
      continue;
    }
    const first = out.indexOf(patch.find);
    if (first === -1) {
      failed.push({ patch, reason: "not-found" });
      continue;
    }
    if (out.indexOf(patch.find, first + 1) !== -1) {
      failed.push({ patch, reason: "ambiguous" });
      continue;
    }
    out = out.slice(0, first) + patch.replace + out.slice(first + patch.find.length);
    applied.push(patch);
  }
  return { html: out, applied, failed };
}

export const PATCH_FAILURE_LABEL: Record<PatchFailure["reason"], string> = {
  "not-found": "The text it targets is no longer in the email.",
  ambiguous: "The text it targets appears more than once.",
  empty: "The suggestion had no target text.",
};

/** 1-based line of the first occurrence of `needle`, if any. */
export function lineOf(html: string, needle: string): number | undefined {
  const idx = needle ? html.indexOf(needle) : -1;
  if (idx < 0) return undefined;
  let line = 1;
  for (let i = 0; i < idx; i++) if (html.charCodeAt(i) === 10) line++;
  return line;
}
