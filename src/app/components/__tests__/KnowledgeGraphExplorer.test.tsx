/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KnowledgeGraphExplorer from '../KnowledgeGraphExplorer';

describe('KnowledgeGraphExplorer', () => {
  it('renders inputs and search button', () => {
    render(<KnowledgeGraphExplorer />);
    expect(screen.getByLabelText(/Search Query/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search Knowledge Graph/i })).toBeInTheDocument();
  });

  it('shows error when clicking search with empty query', () => {
    render(<KnowledgeGraphExplorer />);
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));
    expect(screen.getByText(/Please enter a search query/i)).toBeInTheDocument();
  });
});

// Additional tests for improved coverage
describe('KnowledgeGraphExplorer additional behaviors', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('shows error for query shorter than 3 characters', () => {
    render(<KnowledgeGraphExplorer />);
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));
    expect(screen.getByText(/Query must be at least 3 characters long/i)).toBeInTheDocument();
  });

  it('populates input when a sample query button is clicked', () => {
    render(<KnowledgeGraphExplorer />);
    const sampleText = /protein folding pathways/i;
    const sampleBtn = screen.getByText(sampleText);
    fireEvent.click(sampleBtn);
    const input = screen.getByLabelText(/Search Query/i) as HTMLInputElement;
    expect(input.value).toMatch(sampleText);
  });

  it('executes query and displays results', async () => {
    const mockResult = { items: ['foo', 'bar'] };
    const fetchMock: jest.Mock = jest.fn().mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: mockResult }) });
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'valid query' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));

    // wait for results appearing in JSON output
    await waitFor(() => {
      expect(screen.getByText(/"items": \[/i)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/dkg/query', expect.any(Object));
  });

  it('publishes results and shows publish data on success', async () => {
    const queryData = { foo: 'bar' };
    const publishData = { cid: 'QmCid' };
    const fetchMock: jest.Mock = jest.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: queryData }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: publishData }) });
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    fireEvent.change(screen.getByLabelText(/Search Query/i), { target: { value: 'valid query' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));
    await waitFor(() => screen.getByText(/Query Results/i));

    // click publish
    fireEvent.click(screen.getByRole('button', { name: /Publish to DKG/i }));
    await waitFor(() => expect(screen.getByText(/Publish Result/i)).toBeInTheDocument());
    expect(screen.getByText(/QmCid/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/dkg/publish', expect.any(Object));
  });

  it('shows error when publish fails', async () => {
    const queryData = { x: 'y' };
    const fetchMock: jest.Mock = jest.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: queryData }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: false, error: 'fail' }) });
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    fireEvent.change(screen.getByLabelText(/Search Query/i), { target: { value: 'valid query' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));
    await waitFor(() => screen.getByText(/Query Results/i));

    fireEvent.click(screen.getByRole('button', { name: /Publish to DKG/i }));
    await waitFor(() => expect(screen.getByText(/fail/i)).toBeInTheDocument());
  });
});

// Tests for loading states
describe('KnowledgeGraphExplorer loading states', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading spinner in Search button while querying', async () => {
    let resolveFetch: (value?: unknown) => void = () => {};
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
    const fetchMock: jest.Mock = jest.fn().mockReturnValue(fetchPromise);
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));

    // Spinner should be visible before fetch resolves
    expect(screen.getByText(/Querying Knowledge Graph.../i)).toBeInTheDocument();

    // Resolve fetch to clean up
    resolveFetch({ json: () => Promise.resolve({ success: true, data: {} }) });
  });

  it('shows publishing spinner in Publish button while publishing', async () => {
    const queryData = { foo: 'bar' };
    // First fetch for query resolves normally
    // Second fetch for publish never resolves, to keep loading state
    const fetchMock: jest.Mock = jest.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: queryData }) })
      .mockReturnValueOnce(new Promise(() => {}));
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    // Execute query to populate results
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'valid' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));
    await waitFor(() => screen.getByText(/Query Results/i));

    // Click Publish
    fireEvent.click(screen.getByRole('button', { name: /Publish to DKG/i }));
    // Spinner text should appear immediately
    expect(screen.getByText(/Publishing to DKG.../i)).toBeInTheDocument();
  });

  // Test for executeQuery error handling
  it('shows general error when API returns success=false', async () => {
    const fetchMock: jest.Mock = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ success: false, error: 'ERR' }) });
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));

    await waitFor(() => expect(screen.getByText(/Failed to query knowledge graph. Please try again\./i)).toBeInTheDocument());
  });
});

describe('KnowledgeGraphExplorer keyboard interactions', () => {
  it('triggers query when Enter key is pressed', async () => {
    const mockResult = { items: ['x'] };
    const fetchMock: jest.Mock = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true, data: mockResult }) });
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => expect(screen.getByText(/Query Results/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/dkg/query', expect.any(Object));
  });
});

// Test initial render state
describe('KnowledgeGraphExplorer initial state', () => {
  it('does not show errors or results before any interaction', () => {
    render(<KnowledgeGraphExplorer />);
    expect(screen.queryByText(/Please enter a search query/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Query Results/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Publish to DKG/i })).not.toBeInTheDocument();
  });
});

// Non-Enter key should not trigger query
describe('KnowledgeGraphExplorer keyboard interactions', () => {
  it('does not trigger query when non-Enter key is pressed', () => {
    const fetchMock: jest.Mock = jest.fn();
    (global as any).fetch = fetchMock;
    render(<KnowledgeGraphExplorer />);
    const input = screen.getByLabelText(/Search Query/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'a', code: 'KeyA', charCode: 65 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// Test absence of publish error and result before publishing
describe('KnowledgeGraphExplorer publish panel', () => {
  it('does not show publish error or result prior to publishing', async () => {
    const mockResult = { items: ['foo'] };
    const fetchMock: jest.Mock = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true, data: mockResult }) });
    (global as any).fetch = fetchMock;

    render(<KnowledgeGraphExplorer />);
    // Execute query to reveal publish panel
    fireEvent.change(screen.getByLabelText(/Search Query/i), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Knowledge Graph/i }));
    await waitFor(() => screen.getByText(/Query Results/i));

    // Before publishing
    expect(screen.queryByText(/fail/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Publish Result/i)).not.toBeInTheDocument();
  });
}); 