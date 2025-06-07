'use client';

import { useState } from 'react';

interface Hypothesis {
  id: string;
  text: string;
  confidence_score: number;
  generated_at: string;
  metadata: {
    model_used: string;
    tokens_used: number;
    processing_time_ms: number;
  };
}

export default function HypothesisGenerator() {
  const [query, setQuery] = useState('');
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleQueries = [
    'CRISPR gene editing for cancer treatment',
    'Protein folding mechanisms in neurodegenerative diseases',
    'Novel antibiotic discovery using AI drug design',
    'Personalized medicine approaches for rare genetic disorders'
  ];

  const generateHypotheses = async () => {
    if (!query.trim()) {
      setError('Please enter a research query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the live hypothesis generation API
      const response = await fetch('/api/heo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Generation failed');
      setHypotheses(json.data as Hypothesis[]);
    } catch (err) {
      setError('Failed to generate hypotheses. Please try again.');
      console.error('Hypothesis generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🎯 Hypothesis Generation Engine</h2>
      
      <div className="space-y-6">
        {/* Query Input */}
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Research Query
          </label>
          <div className="space-y-3">
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your research question or topic of interest..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            
            {/* Sample Queries */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Try these sample queries:</p>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((sample, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(sample)}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div>
          <button
            onClick={generateHypotheses}
            disabled={loading || !query.trim()}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Hypotheses...
              </span>
            ) : (
              'Generate Hypotheses'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {hypotheses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Generated Hypotheses</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {hypotheses.length} hypotheses
              </span>
            </div>

            <div className="space-y-4">
              {hypotheses.map((hypothesis, index) => (
                <div key={hypothesis.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      Hypothesis #{index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        hypothesis.confidence_score >= 0.8 
                          ? 'bg-green-100 text-green-800'
                          : hypothesis.confidence_score >= 0.7
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {(hypothesis.confidence_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-800 leading-relaxed mb-4">{hypothesis.text}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Model:</span> {hypothesis.metadata.model_used}
                    </div>
                    <div>
                      <span className="font-medium">Tokens:</span> {hypothesis.metadata.tokens_used.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Processing:</span> {hypothesis.metadata.processing_time_ms}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Generation Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Hypotheses:</span>
                  <span className="font-medium ml-1">{hypotheses.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Avg Confidence:</span>
                  <span className="font-medium ml-1">
                    {((hypotheses.reduce((sum, h) => sum + h.confidence_score, 0) / hypotheses.length) * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Tokens:</span>
                  <span className="font-medium ml-1">
                    {hypotheses.reduce((sum, h) => sum + h.metadata.tokens_used, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Time:</span>
                  <span className="font-medium ml-1">
                    {(hypotheses.reduce((sum, h) => sum + h.metadata.processing_time_ms, 0) / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 