import { GET } from '../route';

describe('GET /api/health', () => {
  it('returns status ok and appropriate fields', async () => {
    const res = await GET();
    // NextResponse has a json() method
    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('environment');
  });
}); 