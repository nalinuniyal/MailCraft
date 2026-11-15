import { ALLOWED_UPLOAD_EXTENSIONS, MAX_HTML_BYTES } from "./limits";

export type UploadCheck = { ok: true; html: string; name: string } | { ok: false; error: string };

/** Validates an uploaded file's type, size and content before it reaches the editor. */
export async function readEmailFile(file: File): Promise<UploadCheck> {
  const lower = file.name.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { ok: false, error: `Only ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")} files are supported.` };
  }
  if (file.type && !["text/html", "text/plain", "application/xhtml+xml"].includes(file.type)) {
    return { ok: false, error: `Unsupported file type “${file.type}”.` };
  }
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_HTML_BYTES) return { ok: false, error: "The file is larger than 1 MB." };
  const text = await file.text();
  return checkHtmlText(text, file.name.replace(/\.(html?|txt)$/i, ""));
}

export function checkHtmlText(text: string, name = "Pasted email"): UploadCheck {
  if (!text.trim()) return { ok: false, error: "No HTML found." };
  if (new TextEncoder().encode(text).length > MAX_HTML_BYTES) return { ok: false, error: "HTML is larger than 1 MB." };
  if (text.includes("\u0000")) return { ok: false, error: "This looks like a binary file, not HTML." };
  if (!/<[a-z!][^>]*>/i.test(text)) return { ok: false, error: "This doesn’t look like HTML (no tags found)." };
  return { ok: true, html: text, name: name.slice(0, 120) || "Uploaded email" };
}
