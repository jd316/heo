'use client';
import { useState } from 'react';
import type { ValidationStatus } from '@/services/validationService';

export default function ValidationPage() {
  const [body, setBody] = useState(`{
  "protocol_instance_id": "",
  "raw_data": {
    "experiment_id": "",
    "protocol_template_id": "",
    "reagents_used": [],
    "procedure_steps": [],
    "safety_measures_observed": {
      "safety_cabinet_used": false,
      "ppe_kit_used": false
    }
  },
  "metadata": {
    "executed_by": "",
    "execution_timestamp": ""
  }
}`);
  const [result, setResult] = useState<ValidationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const parsed = JSON.parse(body);
      const res = await fetch('/api/heo/validate', {
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
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Validate Experiment Results</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <label htmlFor="validationBody" className="block mb-2 font-medium">Experiment JSON</label>
        <textarea
          id="validationBody"
          placeholder="Paste ExperimentResultInput JSON here"
          className="w-full border rounded p-2 h-64"
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          disabled={loading}
        >{loading ? 'Validating…' : 'Validate'}</button>
      </form>
      {error && <p className="text-red-600 mb-4">Error: {error}</p>}
      {result && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  );
} 