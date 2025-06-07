import { solanaService } from '@/services/solanaService';

// Initialize Solana service (consider moving this to a global initializer if multiple routes use it)
const context = { config: process.env as Record<string, string>, logger: console };
solanaService.initialize(context);

export async function POST(request: Request) {
  try {
    const { publicKey } = await request.json();

    if (!publicKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Public key is required' }), { status: 400 });
    }

    const balance = await solanaService.getBalance(publicKey);
    return new Response(JSON.stringify({ ok: true, data: balance }), { status: 200 });
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), { status: 500 });
  }
} 