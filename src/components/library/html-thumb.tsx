"use client";
import * as React from "react";
import { buildPreviewDocument } from "@/lib/rendering/preview";
import { cn } from "@/lib/utils";

/** Wraps a component fragment (table rows etc.) in a 600px email shell for previewing. */
export function wrapFragment(html: string) {
  const trimmed = html.trim();
  if (/^<!doctype|^<html/i.test(trimmed)) return html;
  const inner = /^<tr[\s>]/i.test(trimmed) ? `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; background:#ffffff;">${html}</table>` : html;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0; padding:16px; background:#f4f4f7;"><div style="max-width:600px; margin:0 auto; background:#ffffff;">${inner}</div></body></html>`;
}

/**
 * Scaled, sandboxed, script-free preview. The document goes through the same
 * sanitizer and CSP as the studio preview; the frame gets no permissions at all.
 */
export function HtmlThumb({ html, width = 600, height = 760, scale = 0.42, className, title = "Preview", interactive = false }: { html: string; width?: number; height?: number; scale?: number; className?: string; title?: string; interactive?: boolean }) {
  const doc = React.useMemo(() => buildPreviewDocument(html, { profile: "none", dark: "off", blockRemoteImages: false }).doc, [html]);
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisible(true), io.disconnect()), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-white", className)} style={{ height: height * scale }}>
      {visible && (
        <iframe
          title={title}
          sandbox={interactive ? "allow-popups allow-popups-to-escape-sandbox" : ""}
          referrerPolicy="no-referrer"
          srcDoc={doc}
          tabIndex={interactive ? 0 : -1}
          aria-hidden={!interactive}
          className={cn("absolute top-0 left-1/2 origin-top border-0 bg-white", !interactive && "pointer-events-none")}
          style={{ width, height, transform: `translateX(-50%) scale(${scale})` }}
        />
      )}
    </div>
  );
}
