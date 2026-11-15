import { describe, expect, it } from "vitest";
import { sanitizeEmailHtml, isDangerousUrl } from "@/lib/email/sanitize";

describe("sanitizeEmailHtml", () => {
  it("removes script, iframe, object, embed and base", () => {
    const { html, report } = sanitizeEmailHtml(
      `<p>a</p><script>alert(1)</script><iframe src="x"></iframe><object data="x"></object><embed src="x"><base href="//evil">`,
    );
    expect(html).toBe("<p>a</p>");
    expect(report.removedElements.sort()).toEqual(["base", "embed", "iframe", "object", "script"]);
  });

  it("strips event handlers and javascript: URLs (incl. obfuscated)", () => {
    const { html } = sanitizeEmailHtml(
      `<a href="java&#x09;script:alert(1)" onclick="x()">a</a><img src="x" onerror="alert(1)"><a href=" JaVaScRiPt:alert(1)">b</a><a href="https://ok.test">c</a>`,
    );
    expect(html).not.toMatch(/onclick|onerror|javascript/i);
    expect(html).toContain('href="https://ok.test"');
  });

  it("removes svg script and data:text/html", () => {
    const { html } = sanitizeEmailHtml(`<svg><script>alert(1)</script></svg><a href="data:text/html;base64,xx">x</a>`);
    expect(html).not.toMatch(/script|data:text/i);
  });

  it("removes meta refresh but keeps other meta", () => {
    const { html } = sanitizeEmailHtml(`<head><meta http-equiv="refresh" content="0;url=//evil"><meta name="viewport" content="width=device-width"></head>`);
    expect(html).not.toContain("refresh");
    expect(html).toContain("viewport");
  });

  it("preserves MSO conditional comments, VML and personalization strings", () => {
    const src = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" arcsize="10%" fillcolor="#556270"><w:anchorlock/><center>Go</center></v:roundrect><![endif]--><p>Hi %%FirstName%%</p><td style="mso-line-height-rule:exactly;">x</td>`;
    const { html } = sanitizeEmailHtml(src);
    expect(html).toContain("<!--[if mso]>");
    expect(html).toContain("v:roundrect");
    expect(html).toContain("%%FirstName%%");
    expect(html).toContain("mso-line-height-rule:exactly");
  });

  it("strips CSS expression() styles", () => {
    expect(sanitizeEmailHtml(`<div style="width: expression(alert(1))">x</div>`).html).toBe("<div>x</div>");
  });
});

describe("isDangerousUrl", () => {
  it.each(["javascript:alert(1)", "  vbscript:x", "JAVA\nSCRIPT:x", "data:text/html,<script>", "data:image/svg+xml,<svg>"])("flags %s", (u) => {
    expect(isDangerousUrl(u)).toBe(true);
  });
  it.each(["https://example.com", "mailto:a@b.c", "tel:123", "data:image/png;base64,xx", "#top", "%%=RedirectTo(@url)=%%"])("allows %s", (u) => {
    expect(isDangerousUrl(u)).toBe(false);
  });
});
