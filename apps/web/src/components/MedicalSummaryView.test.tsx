/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MedicalSummaryView } from './MedicalSummaryView.js';
import type { EncounterSummary } from '../lib/outcomes-api.js';

describe('MedicalSummaryView Component Tests', () => {
  const mockSummary: EncounterSummary = {
    id: 'sum-1',
    outcomeId: 'out-1',
    encounterId: 'enc-12345678',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    chiefComplaint: 'Dor de cabeça e febre',
    primaryDiagnosisCode: 'J18.9',
    primaryDiagnosisDescription: 'Pneumonia não especificada',
    dischargeInstructions: 'Manter repouso e ingestão de líquidos',
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renderiza os dados do sumário de alta com CID-10 e orientações', () => {
    render(<MedicalSummaryView summary={mockSummary} patientName="João da Silva" />);

    expect(screen.getByText(/SUMÁRIO DE ALTA ASSISTENCIAL/i)).toBeInTheDocument();
    expect(screen.getByText(/João da Silva/i)).toBeInTheDocument();
    expect(screen.getByText(/\[J18\.9\] Pneumonia não especificada/i)).toBeInTheDocument();
    expect(screen.getByText(/Manter repouso e ingestão de líquidos/i)).toBeInTheDocument();
  });
});
