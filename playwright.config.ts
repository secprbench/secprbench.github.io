import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '.work/browser-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: '.work/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173/secprbench-results/',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: 'python3 scripts/preview.py --directory dist --port 4173',
    url: 'http://127.0.0.1:4173/secprbench-results/',
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  },
});
