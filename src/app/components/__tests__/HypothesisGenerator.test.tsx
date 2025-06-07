/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HypothesisGenerator from '../HypothesisGenerator';

describe.skip('HypothesisGenerator Component', () => {
  it('renders textarea and generate button', () => {
    render(<HypothesisGenerator />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('disables button when input is empty', () => {
    render(<HypothesisGenerator />);
    const button = screen.getByRole('button', { name: /generate/i });
    expect(button).toBeDisabled();
  });

  it('enables button when user types a query', () => {
    render(<HypothesisGenerator />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(screen.getByRole('button', { name: /generate/i })).toBeEnabled();
  });
}); 