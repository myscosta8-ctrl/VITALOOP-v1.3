// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NursingRecordsView } from './NursingRecordsView';

describe('Componente NursingRecordsView', () => {
  it('renderiza título e histórico de enfermagem corretamente', () => {
    const mockRecords = [
      {
        id: 'rec-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        professionalId: 'prof-1',
        recordType: 'admission' as const,
        content: 'Paciente admitido no setor de observação adulto BEG.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    render(<NursingRecordsView records={mockRecords} onAddRecord={vi.fn()} />);

    expect(screen.getByText('Registros e Anotações de Enfermagem (NUR-001..003)')).toBeInTheDocument();
    expect(screen.getByText('Paciente admitido no setor de observação adulto BEG.')).toBeInTheDocument();
  });
});
