import { defineConfig, devices } from "@playwright/test";

const fullMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === "1";
const existingBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const useProductionServer = process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1";

export default defineConfig({
  testDir: "./tests/playwright",
  outputDir: "./test-results/playwright",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: existingBaseURL ?? "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    ...(fullMatrix
      ? [{ name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true } }]
      : []),
  ],
  webServer: existingBaseURL ? undefined : {
    command: useProductionServer
      ? "npm run start -- --hostname 127.0.0.1 --port 3101"
      : "npm run dev -- --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
