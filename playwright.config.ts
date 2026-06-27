import { defineConfig, devices } from "@playwright/test";

// E2E + visual-parity config. Independent of the Storybook vitest browser
// project (that uses @vitest/browser-playwright); this drives the real app via
// @playwright/test against a production build for deterministic screenshots.
// Dedicated port (not the dev server's 3000) so E2E never collides with a
// running `next dev` and always compares prod-vs-prod.
const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  expect: {
    toHaveScreenshot: {
      // Tolerate sub-pixel anti-aliasing/font rendering, fail on real changes.
      threshold: 0.2,
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // A production build gives stable screenshots (no dev overlay / lazy compile).
  // Locally the running server is reused if one is already up on the port.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
