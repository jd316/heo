'use client';
import { useState } from 'react';

export default function HypothesisPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hypotheses, setHypotheses] = useState<Array<{ id: string; text: string; novelty_score: number }>>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHypotheses([]);

    try {
      const res = await fetch('/api/heo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Generation failed');
      } else {
        setHypotheses(json.data);
      }
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Generate Hypotheses</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          className="flex-grow border rounded px-3 py-2"
          placeholder="Enter research question"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading || !query.trim()}
        >{loading ? 'Generating…' : 'Generate'}</button>
      </form>
      {error && <p className="text-red-600 mb-4">Error: {error}</p>}
      <div className="space-y-4">
        {hypotheses.map(h => (
          <div key={h.id} className="border p-4 rounded shadow-sm">
            <p className="font-medium">Hypothesis:</p>
            <p>{h.text}</p>
            <p className="text-sm text-gray-500">Novelty Score: {h.novelty_score.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </main>
  );
} 