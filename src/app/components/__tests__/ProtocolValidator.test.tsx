/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtocolValidator from '../ProtocolValidator';

describe('ProtocolValidator', () => {
  it('renders validate button and protocol template select', () => {
    render(<ProtocolValidator />);
    expect(screen.getByLabelText(/Protocol Template/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validate Protocol/i })).toBeInTheDocument();
  });
}); 