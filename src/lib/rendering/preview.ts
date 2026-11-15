import { sanitizeEmailHtml, type SanitizeReport } from "@/lib/email/sanitize";
import { getProfile, type ClientProfileId } from "./profiles";

export type DarkMode = "off" | "media" | "invert";

export interface PreviewOptions {
  profile: ClientProfileId;
  dark: DarkMode;
  blockRemoteImages: boolean;
}

const INVERT_CSS = `html{filter:invert(1) hue-rotate(180deg)!important;background:#fff!important}
img,video,picture,[style*="background-image"],[background]{filter:invert(1) hue-rotate(180deg)!important}`;

/**
 * Builds the srcdoc for the sandboxed preview iframe:
 * sanitize → client-profile transform → inject CSP + link target + simulation CSS.
 */
export function buildPreviewDocument(source: string, opts: PreviewOptions): { doc: string; notes: string[]; report: SanitizeReport } {
  const profile = getProfile(opts.profile);
  const notes: string[] = [];
  let html = source;
  if (profile.transform) {
    const t = profile.transform(html);
    html = t.html;
    notes.push(...t.notes);
  }
  const { html: clean, report } = sanitizeEmailHtml(html);

  const img = opts.blockRemoteImages ? "img-src data: blob:;" : "img-src * data: blob:;";
  const csp = `default-src 'none'; style-src * 'unsafe-inline'; font-src * data:; ${img} media-src * data:; script-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const head = [
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<base target="_blank">`,
    opts.dark === "invert" ? `<style data-mailcraft-sim>${INVERT_CSS}</style>` : "",
  ].join("");
  if (opts.dark === "invert") notes.push("Forced dark mode is approximated with a colour inversion; real clients use their own algorithms.");
  if (opts.blockRemoteImages) notes.push("Remote images are blocked, as many clients do by default.");

  let doc: string;
  if (/<head[^>]*>/i.test(clean)) doc = clean.replace(/<head([^>]*)>/i, `<head$1>${head}`);
  else if (/<html[^>]*>/i.test(clean)) doc = clean.replace(/<html([^>]*)>/i, `<html$1><head>${head}</head>`);
  else doc = `<!DOCTYPE html><html><head><meta charset="utf-8">${head}</head><body>${clean}</body></html>`;
  return { doc, notes, report };
}
