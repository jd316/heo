import { test, expect } from '@playwright/test';

test.describe('Solana Service Connectivity', () => {
  test('should successfully fetch SOL balance', async ({ request }) => {
    // Ensure the API endpoint matches your application's route for fetching Solana balance
    // This test assumes you have an endpoint like /api/solana/balance that takes a publicKey in the body
    const testPublicKey = process.env.PUBLIC_KEY || 'YOUR_SOLANA_PUBLIC_KEY_HERE'; // Replace with an actual funded public key on your test network

    // Skip test if PUBLIC_KEY is not set (indicating real setup not configured)
    test.skip(testPublicKey === 'YOUR_SOLANA_PUBLIC_KEY_HERE', 'Solana PUBLIC_KEY not configured in .env');

    const response = await request.post('/api/solana/balance', {
      data: { publicKey: testPublicKey },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(result.ok).toBe(true);
    expect(typeof result.data).toBe('number'); // Expecting the balance to be a number
    expect(result.data).toBeGreaterThanOrEqual(0); // Balance should be non-negative

    console.log(`Successfully fetched balance for ${testPublicKey}: ${result.data} Lamports`);
  });
}); 