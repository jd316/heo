import { test, expect } from '@playwright/test';

test.describe('Hypothesis Generation Flow', () => {
  test('should generate hypotheses from a query', async ({ page }) => {
    // Mock hypothesis generation endpoint
    await page.route('**/api/heo/generate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 'h1', text: 'Mock Hypothesis', novelty_score: 0.42 }] }),
      })
    );
    // Navigate to the hypothesis page
    await page.goto('/hypothesis');
    await page.waitForSelector('input[placeholder="Enter research question"]', { timeout: 30000 });

    // Enter a sample query
    const input = page.getByPlaceholder('Enter research question');
    await input.fill('CRISPR mechanism');

    // Submit the form
    const button = page.getByRole('button', { name: 'Generate' });
    await button.click();

    // Wait for results
    const item = page.locator('text=Hypothesis:');
    await expect(item).toBeVisible({ timeout: 30 * 1000 });

    // Verify at least one hypothesis is rendered
    const hypotheses = page.locator('div.border.p-4');
    const count = await hypotheses.count();
    expect(count).toBeGreaterThan(0);
  });
}); 