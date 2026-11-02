import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 4173);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Menguji hasil ekspor statis yang sama dengan yang dideploy.
  webServer: {
    command: "node scripts/serve.mjs",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(port) },
  },
});
