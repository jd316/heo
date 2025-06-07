import { test, expect } from '@playwright/test';

// Full end-to-end smoke test for HEO 2.0 UI flow
// This test mocks backend responses to verify each page and user action.

test.describe('HEO 2.0 end-to-end UI Flow', () => {
  test('Complete journey from hypothesis to FAIR packaging and DKG query', async ({ page }) => {
    // Hypothesis Generation
    await page.route('**/api/heo/generate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 'h1', text: 'Test Hypothesis', novelty_score: 0.42 }] }),
      })
    );
    await page.goto('/hypothesis');
    await page.waitForSelector('input[placeholder="Enter research question"]', { timeout: 30000 });
    await page.fill('input[placeholder="Enter research question"]', 'Test question');
    await page.click('button:has-text("Generate")');
    await expect(page.locator('text=Test Hypothesis')).toBeVisible();

    // Protocol Templates
    await page.route('**/api/heo/protocol/templates', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'p1', name: 'Test Protocol', description: 'Desc' }]),
      })
    );
    await page.route('**/api/heo/execute-protocol', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'i1', status: 'initialized' } }),
      })
    );
    await page.goto('/protocol');
    await page.waitForSelector('text=Test Protocol');
    await page.click('li:has-text("Test Protocol")');
    await page.click('button:has-text("Initialize Protocol")');
    await expect(page.locator('text=Instance Created')).toBeVisible();

    // Validation
    await page.route('**/api/heo/validate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { isValid: true, warnings: [] } }),
      })
    );
    await page.goto('/validation');
    await page.fill('textarea[placeholder="Paste ExperimentResultInput JSON here"]', '{}');
    await page.click('button:has-text("Validate")');
    await expect(page.locator('text="isValid": true')).toBeVisible();

    // Proof Generation & Anchoring
    await page.route('**/api/heo/proof/generate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { proof: 'p1' } }),
      })
    );
    await page.goto('/proof');
    await page.fill('input[placeholder="Protocol Instance ID"]', 'i1');
    await page.fill('textarea[placeholder="Raw Data JSON"]', '{}');
    await page.click('button:has-text("Generate Proof")');
    await expect(page.locator('text="proof":')).toBeVisible();

    // FAIR Packaging
    await page.route('**/api/heo/fair', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { cid: 'c1' } }),
      })
    );
    await page.goto('/fair');
    await page.fill('textarea[placeholder="Paste FAIR package input JSON here"]', '{}');
    await page.click('button:has-text("Package FAIR JSON-LD")');
    await expect(page.locator('text="cid":')).toBeVisible();

    // Knowledge Graph Explorer
    await page.route('**/api/dkg/query', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { foo: 'bar' } }),
      })
    );
    await page.goto('/dkg');
    await page.fill('input[placeholder="Enter your research topic or question..."]', 'ABC');
    await page.click('button:has-text("Search Knowledge Graph")');
    await expect(page.locator('text="foo":')).toBeVisible();
  });
}); 