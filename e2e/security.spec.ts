import { test, expect } from "@playwright/test";
import path from "node:path";
import { signUp, uploadProject, watchErrors } from "./helpers";

test("responses carry a nonce-based CSP and security headers", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("APIs reject anonymous callers", async ({ request }) => {
  for (const url of ["/api/analyze", "/api/ai/analyze", "/api/links/check"]) {
    const res = await request.post(url, { data: { html: "<p>x</p>" } });
    expect(res.status(), url).toBe(401);
  }
});

test("uploaded email HTML cannot run script in the app or the preview", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page);
  await uploadProject(page, path.join(__dirname, "fixtures/hostile.html"));
  const frame = page.locator('iframe[title="Email preview"]').first();
  await expect(frame).toHaveAttribute("sandbox", "allow-popups allow-popups-to-escape-sandbox");
  await expect(page.frameLocator('iframe[title="Email preview"]').first().locator("#hello")).toHaveText("Hello from a hostile email");
  const srcdoc = (await frame.getAttribute("srcdoc")) ?? "";
  expect(srcdoc).not.toMatch(/<script/i);
  expect(srcdoc).not.toMatch(/onerror=/i);
  expect(srcdoc).not.toMatch(/javascript:/i);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: string }).__pwned)).toBeUndefined();
  // The source itself is kept as written: sanitizing is for rendering, not for rewriting the user's file.
  expect(errors.filter((e) => /Content Security Policy/.test(e))).toEqual([]);
});

test("AI routes say plainly when no key is configured", async ({ page, request }) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(health.ai === "configured", "An Anthropic key is configured in this environment.");
  await signUp(page);
  const res = await page.request.post("/api/ai/analyze", { data: { html: "<p>Hello</p>" } });
  expect(res.status()).toBe(503);
  expect((await res.json()).code).toBe("ai_not_configured");
});
