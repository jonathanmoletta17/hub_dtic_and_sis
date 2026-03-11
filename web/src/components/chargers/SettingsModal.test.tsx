import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SettingsModal from './SettingsModal';

// Mock request
vi.mock('@/lib/api/httpClient', () => ({
  request: vi.fn().mockResolvedValue({ success: true })
}));

describe('SettingsModal Component (Ambiente DTIC / Tema Azul)', () => {
  const mockChargers = [
    { id: 1, name: 'Charger 1', is_offline: false, business_start: '08:00', business_end: '18:00' },
    { id: 2, name: 'Charger 2', is_offline: true, business_start: '09:00', business_end: '19:00' }
  ];

  it('renders modal when isOpen is true', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} chargers={mockChargers as any} context="dtic" onUpdate={() => {}} />);
    expect(screen.getByText('Gestão Rápida de Operação')).toBeInTheDocument();
  });

  it('displays empty state when no chargers are selected', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} chargers={mockChargers as any} context="dtic" onUpdate={() => {}} />);
    expect(screen.getByText('Seleção Pendente')).toBeInTheDocument();
  });

  it('allows selecting a charger and displays configuration options', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} chargers={mockChargers as any} context="dtic" onUpdate={() => {}} />);
    
    // Configurações do ambiente azul/DTIC sendo exibidas.
    const chargerRow = screen.getByText('Charger 1');
    fireEvent.click(chargerRow);

    // O expediente deve aparecer depois de selecionar
    expect(screen.getByText('Definição de Horário')).toBeInTheDocument();
  });

});
