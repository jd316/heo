import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: process.env.NODE_ENV === 'production' ? 'npm run start' : 'npm run dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: process.env.NODE_ENV === 'production',
  },
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30 * 1000,
    ignoreHTTPSErrors: true,
  },
}); 