import { test, expect } from "@playwright/test";
import { editorValue, signUp, watchErrors } from "./helpers";

test("templates: browse, filter and start a project from a template", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page);
  await page.goto("/templates");
  await expect(page.locator("[data-testid=template-card]").first()).toBeVisible();
  const all = await page.locator("[data-testid=template-card]").count();
  expect(all).toBeGreaterThanOrEqual(12);
  await expect(page.locator("[data-testid=template-card] iframe").first()).toHaveAttribute("sandbox", "");

  await page.locator('[data-testid=template-card]:has-text("Order confirmation") [data-testid=use-template]').click();
  await page.fill("#tpl-name", "E2E order confirmation");
  await page.click("[data-testid=confirm-use-template]");
  await page.waitForURL("**/studio/**");
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
  expect(await editorValue(page)).toContain("<table");
  expect(errors).toEqual([]);
});

test("components and SFMC toolkit render", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page);
  await page.goto("/components");
  await expect(page.locator("[data-testid=component-list] li").first()).toBeVisible();
  expect(await page.locator("[data-testid=component-list] li").count()).toBeGreaterThanOrEqual(15);

  await page.goto("/sfmc");
  await expect(page.locator("[data-testid=sfmc-preview-note]")).toContainText(/not executed|substitut/i);
  await page.fill("[data-testid=sub-FirstName]", "Priya");
  await expect(page.frameLocator('iframe[title="Subscriber preview"]').locator("body")).toContainText("Priya");
  expect(errors).toEqual([]);
});

test("settings: save profile and export data", async ({ page }) => {
  await signUp(page);
  await page.goto("/settings");
  await page.fill("#s-name", "E2E Person");
  await page.click("[data-testid=save-profile]");
  await expect(page.getByText("Profile saved")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.click("[data-testid=export-data]");
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^mailcraft-export-.*\.json$/);
});
