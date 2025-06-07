'use client';
import { useState } from 'react';

// Define type for FAIR service result
interface FairResult {
  cid: string;
  jsonLd: string;
}

export default function FairPage() {
  const [body, setBody] = useState<string>(`{
  "protocol_instance_id": "",
  "protocol_template_id": "",
  "raw_data_cid": "",
  "solana_tx_uri": "",
  "metadata": {}
}`);
  const [result, setResult] = useState<FairResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(body);
      const res = await fetch('/api/heo/fair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || JSON.stringify(json.errors));
      } else {
        setResult(json.data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">FAIR JSON-LD Packaging</h1>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="fairBody" className="block font-medium">Input JSON</label>
        <textarea
          id="fairBody"
          className="w-full border p-2 rounded h-60"
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={loading}
          placeholder="Paste FAIR package input JSON here"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Packaging…' : 'Package FAIR JSON-LD'}
        </button>
      </form>
      {error && <p className="text-red-600">Error: {error}</p>}
      {result && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
} 