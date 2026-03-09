import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import HorizontalRanking from './HorizontalRanking';
import { describe, it, expect } from 'vitest';

describe('HorizontalRanking Component', () => {
  const mockChargers = [
    { id: 1, name: 'Charger A', is_deleted: false, totalTicketsInPeriod: 10, totalServiceMinutes: 120 },
    { id: 2, name: 'Charger B', is_deleted: false, totalTicketsInPeriod: 5, totalServiceMinutes: 60 },
  ];

  const mockSettings = {
    businessStart: '08:00',
    businessEnd: '18:00',
    workOnWeekends: false,
  };

  it('renders the component without crashing', () => {
    const { getByText } = render(
      <HorizontalRanking chargers={mockChargers as any} settings={mockSettings} />
    );
    expect(getByText('Ranking de Carregadores')).toBeInTheDocument();
  });

  it('handles onWheel event without throwing passive event listener error', () => {
    const { container } = render(
      <HorizontalRanking chargers={mockChargers as any} settings={mockSettings} />
    );

    // Encontra o container do scroll (div flex gap-4)
    const scrollContainer = container.querySelector('.custom-scrollbar');
    expect(scrollContainer).toBeInTheDocument();

    // Simular Wheel Event
    // Como removemos o preventDefault(), não deve lançar erro e a cobertura atinge o listener.
    if (scrollContainer) {
      fireEvent.wheel(scrollContainer, {
        deltaY: 100,
        // Mocking properties para passar no if condition (scrollWidth > clientWidth)
        currentTarget: {
          ...scrollContainer,
          scrollWidth: 500,
          clientWidth: 200,
          scrollLeft: 0
        }
      });
    }
  });
});
