/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import SystemStatus from '../SystemStatus';

describe('SystemStatus', () => {
  it('renders System Status header', () => {
    render(<SystemStatus />);
    expect(screen.getByText(/System Status/i)).toBeInTheDocument();
  });
}); 