import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5174);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 8000);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `cd ../backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: `VITE_API_BASE_URL=http://127.0.0.1:${backendPort} npm run dev -- --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
