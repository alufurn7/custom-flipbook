import { defineConfig } from "@playwright/test";

const includeFirefox = process.env.PAPERFOLD_FIREFOX === "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 15_000,
  globalSetup: "./e2e/global-setup.ts",
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
    ...(includeFirefox ? [{ name: "firefox", use: { browserName: "firefox" as const } }] : [])
  ],
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  }
});
