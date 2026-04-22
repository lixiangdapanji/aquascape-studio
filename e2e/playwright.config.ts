import { defineConfig, devices } from "@playwright/test";

/**
 * Cross-repo E2E for aquascape-studio.
 *
 * Runs against a deployed environment (dev.efferves.live by default) and
 * exercises the web → api → sim streaming path end-to-end. Not run in
 * per-leaf repo CI — only in the glue repo's CI after all leaves have
 * published new images.
 */
const BASE_URL = process.env.BASE_URL ?? "https://dev.efferves.live";

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
