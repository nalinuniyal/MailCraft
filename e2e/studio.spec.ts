import { test, expect } from "@playwright/test";
import path from "node:path";
import { editorValue, setEditorValue, signUp, uploadProject, watchErrors } from "./helpers";

test("studio: edit, analyze, save versions, compare and restore", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page);
  await uploadProject(page, path.join(__dirname, "fixtures/broken.html"));

  // Live validation finds the planted problems.
  await expect(page.locator("[data-testid=issue-card]").first()).toBeVisible({ timeout: 30_000 });
  await page.click("[data-testid=analyze-button]");
  await expect(page.getByText(/Analysis complete/)).toBeVisible();
  expect(await page.locator("[data-testid=issue-card]").count()).toBeGreaterThan(3);

  // Edit and save a second version.
  const original = await editorValue(page);
  await setEditorValue(page, original.replace(">Buy<", ">Buy now<"));
  await expect(page.locator("[data-testid=save-status]")).toHaveText(/Unsaved changes/);
  await page.click("[data-testid=save-button]");
  await expect(page.locator("[data-testid=save-status]")).toHaveText(/Saved|All changes saved/);

  // Version history: compare and restore v1.
  const projectUrl = page.url();
  const projectId = projectUrl.split("/studio/")[1].split(/[/?#]/)[0];
  await page.goto(`/projects/${projectId}/history`);
  await expect(page.locator("[data-testid=version-list] li")).toHaveCount(2);
  await expect(page.locator("[data-testid=version-diff]")).toBeVisible();
  await page.click("[data-testid=restore-v1]");
  await page.click("[data-testid=confirm-restore]");
  await expect(page.locator("[data-testid=version-list] li")).toHaveCount(3);

  await page.goto(projectUrl);
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => editorValue(page)).not.toContain("Buy now");
  expect(errors).toEqual([]);
});

test("compatibility page cites its data source", async ({ page }) => {
  await signUp(page);
  await page.goto("/compatibility?q=flex");
  await expect(page.getByText(/caniemail/i).first()).toBeVisible();
});
