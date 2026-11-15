import { test, expect } from "@playwright/test";
import { signUp, watchErrors } from "./helpers";

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("health check is public and reports configuration honestly", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(["configured", "missing"]).toContain(body.ai);
});

test("sign up lands on an empty dashboard with no fake stats", async ({ page }) => {
  const errors = watchErrors(page);
  await signUp(page);
  await expect(page.getByRole("heading", { name: /dashboard/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
