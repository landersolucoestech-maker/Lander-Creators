import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./visual-tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 } }
    }
  ]
});
