import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCards from './ChargerStats';

describe('ChargerStats Component (Ambiente DTIC / Azul)', () => {
  const mockStats = {
    available: 15,
    occupied: 5,
    offline: 2,
    total: 22,
    totalPowerLimit: 100,
    currentUsage: 50
  };

  it('renders stats correctly based on provided props', () => {
    render(<StatCards stats={mockStats} />);
    
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Ocupados')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();

    expect(screen.getByText('22')).toBeInTheDocument();
  });
});
