import { expect, type Page } from "@playwright/test";

/** Collects page errors and CSP violations so a test can assert there were none. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    const t = m.text();
    // Remote demo images (placehold.co) may be blocked in sandboxed CI networks.
    if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|placehold\.co/.test(t)) errors.push(t);
  });
  return errors;
}

/** Signs up a fresh user (email confirmation must be off in the test project) and lands on the dashboard. */
export async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
  return email;
}

/** Uploads an HTML file from the projects page and opens it in the studio. */
export async function uploadProject(page: Page, file: string) {
  await page.goto("/projects");
  await page.getByRole("button", { name: "Upload" }).click();
  await page.setInputFiles("input[type=file]", file);
  await page.getByRole("button", { name: "Create & open" }).click();
  await page.waitForURL("**/studio/**");
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
}

export const editorValue = (page: Page) =>
  page.evaluate(() => (window as unknown as { monaco: { editor: { getEditors(): { getValue(): string }[] } } }).monaco.editor.getEditors()[0].getValue());

export const setEditorValue = (page: Page, value: string) =>
  page.evaluate((v) => (window as unknown as { monaco: { editor: { getEditors(): { setValue(s: string): void }[] } } }).monaco.editor.getEditors()[0].setValue(v), value);
