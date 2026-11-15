import { describe, expect, it } from "vitest";
import { TEMPLATES, CATEGORIES } from "../scripts/seed/templates.mjs";
import { COMPONENTS } from "../scripts/seed/components.mjs";
import { validateEmail } from "@/lib/email/validate";

type T = { slug: string; name: string; category: string; html: string };
type C = { slug: string; html: string };

describe("seed data", () => {
  it("has 11 categories and every template uses one", () => {
    expect(CATEGORIES).toHaveLength(11);
    for (const t of TEMPLATES as T[]) expect(CATEGORIES.map((c: { slug: string }) => c.slug)).toContain(t.category);
  });

  it.each((TEMPLATES as T[]).map((t) => [t.slug, t] as const))("template %s has no critical or high validation issues", (_slug, t) => {
    const issues = validateEmail(t.html).filter((i) => i.severity === "critical" || i.severity === "high");
    expect(issues.map((i) => `${i.ruleId}: ${i.title} (L${i.line})`)).toEqual([]);
  });

  it("component placeholders are well formed", () => {
    for (const c of COMPONENTS as C[]) {
      const opens = c.html.match(/\{\{/g)?.length ?? 0;
      const valid = c.html.match(/\{\{[a-z0-9_]+\|[^{}]*\}\}/g)?.length ?? 0;
      expect({ slug: c.slug, valid }).toEqual({ slug: c.slug, valid: opens });
    }
  });
});

import { parsePlaceholders, fillPlaceholders } from "@/lib/library/placeholders";

describe("component placeholders", () => {
  const html = `<a href="{{url|https://example.com}}" style="color:{{text_color|#ffffff}}; width:{{width|220}}px">{{label|Get started}}</a><b>{{label|ignored}}</b>`;
  it("parses unique keys with kinds", () => {
    expect(parsePlaceholders(html).map((p) => [p.key, p.kind, p.defaultValue])).toEqual([
      ["url", "url", "https://example.com"],
      ["text_color", "color", "#ffffff"],
      ["width", "number", "220"],
      ["label", "text", "Get started"],
    ]);
  });
  it("fills values, falls back to defaults and escapes markup", () => {
    const out = fillPlaceholders(html, { label: `<script>x</script> & "more"` });
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain("&lt;script&gt;x&lt;/script&gt; &amp; &quot;more&quot;");
    expect(out).not.toContain("{{");
  });
  it("keeps AMPscript personalization strings intact", () => {
    expect(fillPlaceholders(`<a href="{{u|x}}">`, { u: "%%unsub_center_url%%" })).toBe('<a href="%%unsub_center_url%%">');
  });
});

import { lintAmpscript } from "@/lib/sfmc/lint";
import { renderSubscriberPreview } from "@/lib/sfmc/preview";
import { validateEmail as validate } from "@/lib/email/validate";

describe("AMPscript lint", () => {
  const ids = (s: string) => lintAmpscript(s).map((i) => i.ruleId);
  it("accepts well-formed AMPscript", () => {
    expect(ids(`%%[ VAR @a, @b SET @a = AttributeValue("FirstName") IF Empty(@a) THEN SET @a = "there" ENDIF SET @b = Concat("Hi ", @a) ]%%<p>%%=v(@b)=%%</p>`)).toEqual([]);
  });
  it("flags unclosed blocks, curly quotes, unbalanced IF and unknown functions", () => {
    expect(ids(`%%[ SET @a = “x” ]%%`)).toContain("ampscript-smart-quotes");
    expect(ids(`%%[ IF @x == 1 THEN SET @y = 2 ]%%`)).toContain("ampscript-unbalanced");
    expect(ids(`%%[ SET @y = AtributeValue("x") ]%%`)).toContain("ampscript-unknown-function");
    expect(ids(`<p>%%= v(@missing) =%%</p>`)).toContain("ampscript-unset-variable");
    expect(ids(`%%[ SET @a = 1 `)).toEqual(["ampscript-unclosed"]);
  });
  it("reports correct line numbers", () => {
    const issue = lintAmpscript(`<p>a</p>\n<p>b</p>\n%%[ SET @y = Nope(1) ]%%`)[0];
    expect(issue.line).toBe(3);
  });
  it("is part of email validation when AMPscript is present", () => {
    expect(validate(`<!DOCTYPE html><html lang="en"><head><title>x</title></head><body>%%[ IF 1 ]%%</body></html>`).some((i) => i.category === "ampscript")).toBe(true);
  });
});

describe("subscriber preview", () => {
  it("substitutes personalization strings and simple variables but does not execute logic", () => {
    const src = `%%[ SET @first = AttributeValue("FirstName") IF Empty(@first) THEN SET @first = "there" ENDIF ]%%<p>Hi %%=v(@first)=%%, %%LastName%% <a href="%%unsub_center_url%%">x</a> %%=Format(Now(),"d")=%% %%Unknown%%</p>`;
    const r = renderSubscriberPreview(src, { FirstName: "Sam <b>", LastName: "Lee", unsub_center_url: "https://u" });
    expect(r.html).toBe(`<p>Hi Sam &lt;b&gt;, Lee <a href="https://u">x</a> [AMPscript: Format(Now(),&quot;d&quot;)] %%Unknown%%</p>`);
    expect(r.removedBlocks).toBe(1);
    expect(r.unresolved).toEqual([`Format(Now(),"d")`]);
    expect(r.missingFields).toContain("Unknown");
  });
});

import { AMPSCRIPT_SNIPPETS } from "@/lib/sfmc/snippets";
describe("AMPscript snippets", () => {
  it.each(AMPSCRIPT_SNIPPETS.map((s) => [s.id, s.code] as const))("%s passes the linter", (_id, code) => {
    expect(lintAmpscript(code).map((i) => `${i.ruleId}: ${i.title}`)).toEqual([]);
  });
});
