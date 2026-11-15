import { describe, expect, it } from "vitest";
import { applyPatches, lineOf } from "@/lib/ai/patches";
import { AiAnalysisSchema, AiAssistSchema, toIssues } from "@/lib/ai/schemas";

const html = `<table>\n<tr><td><img src="a.png"></td></tr>\n<tr><td><img src="b.png"></td></tr>\n</table>`;

describe("applyPatches", () => {
  it("applies a unique patch", () => {
    const r = applyPatches(html, [{ description: "alt", find: '<img src="a.png">', replace: '<img src="a.png" alt="A">' }]);
    expect(r.applied).toHaveLength(1);
    expect(r.html).toContain('alt="A"');
    expect(r.html).toContain('<img src="b.png">');
  });

  it("refuses ambiguous, missing and empty targets without changing the HTML", () => {
    const r = applyPatches(html, [
      { description: "x", find: "<img", replace: "<IMG" },
      { description: "y", find: "<video>", replace: "" },
      { description: "z", find: "", replace: "boom" },
    ]);
    expect(r.applied).toHaveLength(0);
    expect(r.failed.map((f) => f.reason)).toEqual(["ambiguous", "not-found", "empty"]);
    expect(r.html).toBe(html);
  });

  it("applies patches in order against the updated document", () => {
    const r = applyPatches(html, [
      { description: "1", find: '"a.png"', replace: '"c.png"' },
      { description: "2", find: '<img src="c.png">', replace: '<img src="c.png" alt="">' },
    ]);
    expect(r.applied).toHaveLength(2);
    expect(r.html).toContain('<img src="c.png" alt="">');
  });

  it("does not interpret $ patterns in replacements", () => {
    const r = applyPatches("<p>price</p>", [{ description: "", find: "price", replace: "$& $1 $$" }]);
    expect(r.html).toBe("<p>$& $1 $$</p>");
  });
});

describe("AI result mapping", () => {
  it("maps Claude's analysis to issues with line numbers and fixes", () => {
    const parsed = AiAnalysisSchema.parse({
      summary: "Mostly fine.",
      issues: [
        { title: "Missing alt", severity: "high", category: "accessibility", description: "d", why_it_matters: "w", recommendation: "r", snippet: '<img src="b.png">', fix: { description: "add alt", find: '<img src="b.png">', replace: '<img src="b.png" alt="">' } },
        { title: "General", severity: "low", category: "html", description: "d", why_it_matters: "w", recommendation: "r", snippet: "", fix: null },
      ],
    });
    const issues = toIssues(parsed, (s) => lineOf(html, s));
    expect(issues[0]).toMatchObject({ source: "ai", line: 3, severity: "high", fix: { find: '<img src="b.png">' } });
    expect(issues[1].line).toBeUndefined();
    expect(issues[1].fix).toBeUndefined();
  });

  it("rejects responses in the wrong shape", () => {
    expect(AiAssistSchema.safeParse({ reply: "hi" }).success).toBe(false);
    expect(AiAnalysisSchema.safeParse({ summary: "s", issues: [{ title: "t", severity: "urgent" }] }).success).toBe(false);
  });
});
