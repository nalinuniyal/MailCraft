/* Live check against the configured AI provider. Skipped unless LIVE_AI=1,
 * because it spends real tokens: LIVE_AI=1 npx vitest run tests/live */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { setGlobalDispatcher, EnvHttpProxyAgent } from "undici";
import { callStructured } from "@/lib/ai/client";
import { aiProviderInfo } from "@/lib/ai/provider";
import { ANALYZE_SYSTEM, FIX_SYSTEM, ASSIST_SYSTEM, emailBlock } from "@/lib/ai/prompts";
import { AiAnalysisSchema, AI_ANALYSIS_JSON_SCHEMA, AiFixSchema, AI_FIX_JSON_SCHEMA, AiAssistSchema, AI_ASSIST_JSON_SCHEMA, toIssues } from "@/lib/ai/schemas";
import { applyPatches, lineOf } from "@/lib/ai/patches";

const html = readFileSync("e2e/fixtures/broken.html", "utf8");
const log = (k: string, v: unknown) => console.log(`\n=== ${k}\n${typeof v === "string" ? v : JSON.stringify(v, null, 2)}`);

describe.skipIf(process.env.LIVE_AI !== "1")("live provider", () => {
  beforeAll(() => { if (process.env.HTTPS_PROXY) setGlobalDispatcher(new EnvHttpProxyAgent()); });
  let issues: ReturnType<typeof toIssues> = [];

  it("provider", () => { log("provider", aiProviderInfo()); expect(aiProviderInfo()).not.toBeNull(); });

  it("analyze", async () => {
    const t = Date.now();
    const r = await callStructured({ task: "analyze", system: ANALYZE_SYSTEM, messages: [{ role: "user", content: `${emailBlock(html)}\n\nAnalyze this email.` }], jsonSchema: AI_ANALYSIS_JSON_SCHEMA, schema: AiAnalysisSchema, effort: "high" });
    issues = toIssues(r.data, (s) => lineOf(html, s));
    log("analyze", { ms: Date.now() - t, model: r.model, usage: r.usage, summary: r.data.summary, n: issues.length, withFix: issues.filter((i) => i.fix).length, issues: issues.map((i) => ({ sev: i.severity, title: i.title, line: i.line, fix: !!i.fix })) });
    const withFix = issues.filter((i) => i.fix);
    const res = applyPatches(html, withFix.map((i) => i.fix!));
    log("apply inline fixes", { applied: res.applied.length, failed: res.failed.map((f) => f.reason) });
    expect(issues.length).toBeGreaterThan(0);
  }, 180_000);

  it("fix", async () => {
    const issue = issues[0] ?? { title: "Missing alt text", description: "Images lack alt attributes" };
    const r = await callStructured({ task: "analyze", system: FIX_SYSTEM, messages: [{ role: "user", content: `${emailBlock(html)}\n\n<issue>\nIssue: ${issue.title}\nDetails: ${issue.description}\n</issue>\n\nFix this issue.` }], jsonSchema: AI_FIX_JSON_SCHEMA, schema: AiFixSchema, effort: "medium" });
    const res = applyPatches(html, r.data.patches);
    log("fix", { issue: issue.title, data: r.data, applied: res.applied.length, failed: res.failed.map((f) => f.reason), changed: res.html !== html });
    expect(res.applied.length).toBeGreaterThan(0);
  }, 180_000);

  it("assist", async () => {
    const r = await callStructured({ task: "assist", system: ASSIST_SYSTEM, messages: [{ role: "user", content: `${emailBlock(html)}\n\nMake the main CTA button bulletproof for Outlook.` }], jsonSchema: AI_ASSIST_JSON_SCHEMA, schema: AiAssistSchema, effort: "medium" });
    const res = applyPatches(html, r.data.patches ?? []);
    log("assist", { reply: r.data, applied: res.applied.length, failed: res.failed.map((f) => f.reason) });
    expect(r.data).toBeTruthy();
  }, 180_000);
});
