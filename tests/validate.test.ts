import { describe, expect, it } from "vitest";
import { validateEmail } from "@/lib/email/validate";
import { analyzeCompatibility } from "@/lib/email/compat";
import { BLANK_EMAIL } from "@/lib/email/starter";

const ids = (html: string) => validateEmail(html).map((i) => i.ruleId);

describe("validateEmail", () => {
  it("accepts the blank starter with only advisory issues", () => {
    const issues = validateEmail(BLANK_EMAIL);
    expect(issues.filter((i) => i.severity === "critical" || i.severity === "high")).toEqual([]);
  });

  it("reports missing closing tags with the opening line", () => {
    const html = "<table>\n<tr>\n<td>\n<div>text\n</td></tr></table>";
    const missing = validateEmail(html).find((i) => i.ruleId === "missing-close");
    expect(missing?.line).toBe(4);
    expect(missing?.severity).toBe("critical");
  });

  it("reports stray closing tags", () => {
    expect(ids("<div>a</div></span>")).toContain("stray-close");
  });

  it("reports invalid table nesting", () => {
    const issues = validateEmail("<div><td>x</td></div>");
    expect(issues.some((i) => i.ruleId === "invalid-nesting" && i.line === 1)).toBe(true);
  });

  it("flags images: alt, relative src, width", () => {
    const r = ids('<img src="images/logo.png">');
    expect(r).toEqual(expect.arrayContaining(["img-alt", "img-src-relative", "img-width"]));
  });

  it("flags placeholder, relative and javascript links", () => {
    const r = ids('<a href="#">a</a><a href="/about">b</a><a href="javascript:void(0)">c</a>');
    expect(r).toEqual(expect.arrayContaining(["link-placeholder", "link-relative", "link-javascript"]));
  });

  it("does not flag personalization or ESP merge tags as broken links", () => {
    expect(ids('<a href="%%=RedirectTo(@url)=%%">a</a><a href="{{unsubscribe}}">b</a>')).not.toContain("link-relative");
  });

  it("flags fixed-width, non-responsive layouts", () => {
    const r = ids('<table width="800"><tr><td>x</td></tr></table>');
    expect(r).toEqual(expect.arrayContaining(["fixed-width-wide", "not-responsive", "viewport"]));
  });

  it("flags Gmail clipping for large emails", () => {
    expect(ids(`<p>${"x".repeat(110 * 1024)}</p>`)).toContain("gmail-clip");
  });

  it("flags max-width layouts without Outlook ghost tables", () => {
    expect(ids('<div style="max-width:600px;margin:0 auto">x</div>')).toContain("outlook-ghost-table");
    expect(ids('<!--[if mso]><table><tr><td><![endif]--><div style="max-width:600px">x</div><!--[if mso]></td></tr></table><![endif]-->')).not.toContain("outlook-ghost-table");
  });

  it("ignores void elements and VML when checking closing tags", () => {
    const html = '<p>a<br>b</p><img src="https://x.test/a.png" alt="" width="1"><!--[if mso]><v:roundrect><w:anchorlock/></v:roundrect><![endif]-->';
    expect(ids(html)).not.toContain("missing-close");
  });
});

describe("analyzeCompatibility", () => {
  it("detects flexbox and maps it to Can I Email with Outlook unsupported", () => {
    const res = analyzeCompatibility('<style>.a{display:flex;gap:8px}</style><div class="a">x</div>');
    const flex = res.features.find((f) => f.slug === "css-display-flex");
    expect(flex).toBeDefined();
    expect(flex!.clients.find((c) => c.label === "Outlook Windows")?.level).toBe("unsupported");
    expect(res.issues.some((i) => i.ruleId === "caniemail:css-display-flex")).toBe(true);
    expect(res.source.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("detects media queries, prefers-color-scheme and inline styles with line numbers", () => {
    const html = '<style>\n@media (prefers-color-scheme: dark) { .x { color: #fff } }\n</style>\n<p style="border-radius:4px; position:absolute">x</p>';
    const res = analyzeCompatibility(html);
    const slugs = res.features.map((f) => f.slug);
    expect(slugs).toEqual(expect.arrayContaining(["css-at-media", "css-at-media-prefers-color-scheme", "css-border-radius", "css-position"]));
    expect(res.features.find((f) => f.slug === "css-position")!.occurrences[0].line).toBe(4);
    expect(res.features.find((f) => f.slug === "css-at-media-prefers-color-scheme")!.occurrences[0].line).toBe(2);
  });

  it("detects HTML features like svg, video and background attribute", () => {
    const slugs = analyzeCompatibility('<td background="https://x/a.jpg"><svg></svg><video></video></td>').features.map((f) => f.slug);
    expect(slugs).toEqual(expect.arrayContaining(["html-background", "html-svg", "html-video"]));
  });
});
