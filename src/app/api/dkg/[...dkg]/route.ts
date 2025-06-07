import { dkgService } from '@/services/dkgService';

// Initialize DKG client using environment variables
const context = { config: process.env as Record<string, string>, logger: console };
dkgService.initialize(context);

export async function GET(request: Request, { params }: { params: { dkg: string[] } }) {
  const [action, subaction, ...rest] = params.dkg || [];
  try {
    switch (action) {
      case 'node-info': {
        const info = await dkgService.nodeInfo();
        return new Response(JSON.stringify({ ok: true, data: info }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      case 'asset':
        if (subaction === 'get' && rest.length === 1) {
          const ual = rest[0];
          const url = new URL(request.url);
          const contentType = (url.searchParams.get('contentType') as 'all' | 'public' | 'private') || 'all';
          const asset = await dkgService.getAsset(ual, contentType);
          return new Response(JSON.stringify({ ok: true, data: asset }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        break;
      case 'allowance': {
        const allowance = await dkgService.getCurrentAllowance();
        return new Response(JSON.stringify({ ok: true, data: allowance }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      default:
        return new Response(JSON.stringify({ ok: false, error: `Unsupported GET action: ${action}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ ok: false, error: 'Invalid GET parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request, { params }: { params: { dkg: string[] } }) {
  const [action, subaction] = params.dkg || [];
  const body = await request.json();
  try {
    switch (action) {
      case 'query': {
        const result = await dkgService.query(body.sparql);
        return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'asset':
        if (subaction === 'create') {
          const result = await dkgService.createAsset(body.content, body.options);
          return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        break;
      case 'bid-suggestion': {
        const result = await dkgService.getBidSuggestion(body.content, body.options);
        return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'format-graph': {
        const result = await dkgService.formatGraph(body.content);
        return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'triples-number': {
        const result = await dkgService.getTriplesNumber(body.content);
        return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'chunks-number': {
        const result = await dkgService.getChunksNumber(body.content);
        return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      case 'allowance':
        if (subaction === 'increase') {
          const result = await dkgService.increaseAllowance(body.amount);
          return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (subaction === 'decrease') {
          const result = await dkgService.decreaseAllowance(body.amount);
          return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (subaction === 'set') {
          const result = await dkgService.setAllowance(body.amount);
          return new Response(JSON.stringify({ ok: true, data: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        break;
      default:
        return new Response(JSON.stringify({ ok: false, error: `Unsupported POST action: ${action}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ ok: false, error: 'Invalid POST parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 