import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./storybook-e2e",
  testMatch: /storybook-visual\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "../playwright-report-storybook", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:6006",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "../output/playwright-storybook",
  webServer: {
    command: "npx http-server storybook-static -p 6006 -c-1 --silent",
    url: "http://127.0.0.1:6006",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
