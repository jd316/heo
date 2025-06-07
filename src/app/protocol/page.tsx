'use client';
import { useEffect, useState } from 'react';

interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
}

interface ProtocolInstance {
  id: string;
  template_id: string;
  status: string;
  solana_protocol_account_pda?: string;
  solana_init_transaction_id?: string;
}

export default function ProtocolPage() {
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [selected, setSelected] = useState<ProtocolTemplate | null>(null);
  const [instance, setInstance] = useState<ProtocolInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/heo/protocol/templates');
        const data: ProtocolTemplate[] = await res.json();
        setTemplates(data);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    fetchTemplates();
  }, []);

  async function handleInit() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/heo/execute-protocol', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          template_id: selected.id,
          name: `${selected.name} Instance`,
          parameters: {},
          initiator_public_key: 'unknown',
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Initialization failed');
      } else {
        setInstance(json.data);
      }
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Protocol Templates</h1>
      {error && <p className="text-red-600 mb-4">Error: {error}</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <li key={t.id} className={`cursor-pointer p-4 border rounded ${selected?.id === t.id ? 'border-blue-600' : 'border-gray-300'}`} onClick={() => setSelected(t)}>
            <h2 className="font-medium">{t.name}</h2>
            <p className="text-sm text-gray-600">{t.description}</p>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-6">
          <h2 className="text-xl">Selected: {selected.name}</h2>
          <button
            onClick={handleInit}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >{loading ? 'Initializing…' : 'Initialize Protocol'}</button>
        </div>
      )}
      {instance && (
        <div className="mt-6 border p-4 rounded bg-gray-50">
          <h3 className="font-medium">Instance Created</h3>
          <p>ID: {instance.id}</p>
          <p>Status: {instance.status}</p>
          {instance.solana_init_transaction_id && <p>Tx: {instance.solana_init_transaction_id}</p>}
        </div>
      )}
    </main>
  );
} 