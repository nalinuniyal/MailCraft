/**
 * Client preview profiles.
 *
 * IMPORTANT: these are SIMULATIONS. They apply a viewport and a small number of
 * well-documented, deterministic client behaviours (e.g. Gmail clipping at
 * ~102 KB, Outlook conditional-comment targeting). They do NOT reproduce the
 * real rendering engines (e.g. Outlook for Windows' Word engine). Genuine
 * client screenshots require a RenderingProvider such as Litmus or Email on Acid
 * (see ./providers.ts).
 */
import { GMAIL_CLIP_BYTES } from "@/lib/email/limits";
import { byteLength } from "@/lib/utils";

export type ClientProfileId = "none" | "gmail" | "outlook-desktop" | "outlook-web" | "apple-mail" | "yahoo";

/** Can I Email client keys used to pull warnings for each profile. */
export type CaniemailClientRef = { family: string; platform: string };

export interface ClientProfile {
  id: ClientProfileId;
  label: string;
  shortLabel: string;
  description: string;
  defaultWidth: number;
  caniemail: CaniemailClientRef[];
  simulated: string[];
  notSimulated: string[];
  transform?: (html: string) => { html: string; notes: string[] };
}

function stripMsoHidden(html: string) {
  // Show content targeted at Outlook (<!--[if mso]>...) and hide the
  // "not mso" downlevel-revealed blocks, as Outlook for Windows does.
  let out = html.replace(/<!--\[if\s+(?:[^\]]*\bmso\b[^\]]*|gte?\s+mso\s+\d+|lte?\s+mso\s+\d+)\]>([\s\S]*?)<!\[endif\]-->/gi, (m, inner: string) =>
    /\[if\s+!mso/i.test(m) ? m : inner,
  );
  out = out.replace(/<!--\[if\s+!mso\]>\s*<!-->([\s\S]*?)<!--\s*<!\[endif\]-->/gi, "");
  return out;
}

function gmailClip(html: string) {
  const notes: string[] = [];
  const size = byteLength(html);
  let out = html.replace(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi, () => {
    notes.push("Removed <link rel=\"stylesheet\"> (Gmail does not load external stylesheets).");
    return "";
  });
  if (size > GMAIL_CLIP_BYTES) {
    // Clip by bytes, approximately like Gmail's "[Message clipped]".
    const enc = new TextEncoder().encode(out);
    out = new TextDecoder().decode(enc.slice(0, GMAIL_CLIP_BYTES)) +
      `<div style="font:13px Arial,sans-serif;color:#5f6368;padding:16px">[Message clipped]&nbsp; <u>View entire message</u></div>`;
    notes.push(`HTML is ${(size / 1024).toFixed(1)} KB; Gmail clips messages over ~102 KB.`);
  }
  return { html: out, notes };
}

export const CLIENT_PROFILES: ClientProfile[] = [
  {
    id: "none",
    label: "Browser (no client profile)",
    shortLabel: "Browser",
    description: "Plain browser rendering of your sanitized HTML.",
    defaultWidth: 800,
    caniemail: [],
    simulated: ["Chromium rendering of the HTML"],
    notSimulated: ["Any email client behaviour"],
  },
  {
    id: "gmail",
    label: "Gmail (webmail) – simulation",
    shortLabel: "Gmail",
    description: "Viewport plus Gmail clipping and external-stylesheet removal.",
    defaultWidth: 800,
    caniemail: [{ family: "gmail", platform: "desktop-webmail" }, { family: "gmail", platform: "ios" }, { family: "gmail", platform: "android" }],
    simulated: ["~102 KB message clipping", "Removal of <link> stylesheets", "Can I Email support warnings"],
    notSimulated: ["Gmail's CSS sanitiser and class renaming", "Non-Google-account (GANGA) behaviour", "Gmail app dark mode"],
    transform: gmailClip,
  },
  {
    id: "outlook-desktop",
    label: "Outlook for Windows – simulation",
    shortLabel: "Outlook Desktop",
    description: "Shows Outlook-targeted conditional content. Does not emulate the Word rendering engine.",
    defaultWidth: 800,
    caniemail: [{ family: "outlook", platform: "windows" }],
    simulated: ["<!--[if mso]> content shown, <!--[if !mso]><!--> content hidden", "Can I Email support warnings"],
    notSimulated: ["Word rendering engine (box model, padding, max-width, background images, etc.)", "VML rendering (shown as unknown elements)", "DPI scaling"],
    transform: (html) => ({ html: stripMsoHidden(html), notes: ["Conditional comments resolved as Outlook for Windows would. Layout is still rendered by Chromium."] }),
  },
  {
    id: "outlook-web",
    label: "Outlook.com / Outlook on the web – simulation",
    shortLabel: "Outlook Web",
    description: "Viewport plus Can I Email warnings for Outlook.com.",
    defaultWidth: 800,
    caniemail: [{ family: "outlook", platform: "outlook-com" }],
    simulated: ["Can I Email support warnings"],
    notSimulated: ["Outlook.com CSS rewriting", "Forced dark mode colour transforms"],
  },
  {
    id: "apple-mail",
    label: "Apple Mail – simulation",
    shortLabel: "Apple Mail",
    description: "WebKit-based client; browser rendering is the closest approximation here.",
    defaultWidth: 800,
    caniemail: [{ family: "apple-mail", platform: "macos" }, { family: "apple-mail", platform: "ios" }],
    simulated: ["Can I Email support warnings", "prefers-color-scheme dark (when dark simulation is on)"],
    notSimulated: ["WebKit vs Chromium differences", "iOS auto-scaling and data detectors"],
  },
  {
    id: "yahoo",
    label: "Yahoo Mail – simulation",
    shortLabel: "Yahoo",
    description: "Viewport plus Can I Email warnings for Yahoo Mail.",
    defaultWidth: 800,
    caniemail: [{ family: "yahoo", platform: "desktop-webmail" }, { family: "yahoo", platform: "ios" }, { family: "yahoo", platform: "android" }],
    simulated: ["Can I Email support warnings"],
    notSimulated: ["Yahoo's CSS rewriting and class prefixing"],
  },
];

export function getProfile(id: ClientProfileId) {
  return CLIENT_PROFILES.find((p) => p.id === id) ?? CLIENT_PROFILES[0];
}

export const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: 800 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 375 },
] as const;
export type ViewportId = (typeof VIEWPORTS)[number]["id"] | "custom";
