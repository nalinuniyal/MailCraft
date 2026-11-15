/** Shared limits used by upload validation, server actions and API routes. */
export const MAX_HTML_BYTES = 1024 * 1024; // 1 MB (matches DB check constraint)
export const GMAIL_CLIP_BYTES = 102 * 1024; // Gmail clips messages larger than ~102 KB
export const ALLOWED_UPLOAD_EXTENSIONS = [".html", ".htm", ".txt"] as const;
