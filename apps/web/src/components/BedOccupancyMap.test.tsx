// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BedOccupancyMap } from './BedOccupancyMap';

describe('Componente BedOccupancyMap', () => {
  it('renderiza setores e leitos com métricas de ocupação em tempo real', () => {
    const mockMapData = [
      {
        sector: {
          id: 's1',
          name: 'Observação Adulto',
          code: 'OBS_ADM',
          capacity: 10,
          createdAt: new Date().toISOString(),
        },
        beds: [
          {
            id: 'b1',
            sectorId: 's1',
            bedNumber: 'Leito 01',
            status: 'available' as const,
            isExtra: false,
          },
          {
            id: 'b2',
            sectorId: 's1',
            bedNumber: 'Leito 02',
            status: 'occupied' as const,
            isExtra: false,
            patientName: 'Paciente Teste Leito',
            stayHours: 4.5,
            is24hLimitExceeded: false,
          },
        ],
        metrics: {
          totalBeds: 2,
          occupiedBeds: 1,
          availableBeds: 1,
          cleaningBeds: 0,
          occupancyRatePercentage: 50,
        },
      },
    ];

    render(<BedOccupancyMap sectorsMap={mockMapData} />);

    expect(screen.getByText('Mapa de Ocupação de Leitos UPA 24h')).toBeDefined();
    expect(screen.getByText('Observação Adulto')).toBeDefined();
    expect(screen.getByText('50% Ocupação')).toBeDefined();
    expect(screen.getByText('Leito 01')).toBeDefined();
    expect(screen.getByText('Leito 02')).toBeDefined();
    expect(screen.getByText('Paciente Teste Leito')).toBeDefined();
    expect(screen.getByText('Permanência: 4.5h')).toBeDefined();
  });
});
