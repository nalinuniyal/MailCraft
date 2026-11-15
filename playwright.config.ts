import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They need a running Supabase (local stack: `bash e2e/stack/up.sh`,
 * or `supabase start`) with migrations and seed applied, and the app env in .env.local.
 *
 * By default Playwright starts the production server (`npm run build` first).
 * Set E2E_BASE_URL to test an already running app (dev server or a preview deploy).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "off", viewport: { width: 1600, height: 1000 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 1000 } } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start -- -p 3100", url: `${baseURL}/api/health`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
