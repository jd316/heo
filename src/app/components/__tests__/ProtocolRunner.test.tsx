/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtocolRunner from '../ProtocolRunner';

describe('ProtocolRunner', () => {
  it('renders template select and start button', () => {
    render(<ProtocolRunner />);
    expect(screen.getByLabelText(/Protocol Template/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Protocol Run/i })).toBeInTheDocument();
  });
}); 