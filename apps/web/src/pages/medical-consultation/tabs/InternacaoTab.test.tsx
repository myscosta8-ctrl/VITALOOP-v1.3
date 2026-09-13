// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InternacaoTab } from './InternacaoTab.js';
import type { BedData } from '../../../lib/bed-api.js';
import type { Admission } from '../../../lib/admission-api.js';
import type { AdmissionForm } from '../hooks/useAdmission.js';

const bedInfo: BedData = {
  id: 'bed-1',
  sectorId: 'sec-1',
  sectorName: 'Internação Adulto',
  bedNumber: 'INT-01',
  status: 'occupied',
  isExtra: false,
  isIsolation: false,
  allocatedAt: new Date().toISOString(),
  stayHours: 4,
  is24hLimitExceeded: false,
};

const activeAdmission: Admission = {
  id: 'adm-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  admittingDoctorId: 'doc-1',
  admissionDiagnosisCode: 'J18.9',
  admissionDiagnosisDescription: 'Pneumonia bacteriana grave',
  admissionJustification: 'Necessita antibioticoterapia venosa contínua.',
  status: 'active',
  admittedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const buildForm = (overrides: Partial<AdmissionForm> = {}): AdmissionForm => ({
  diagnosisCode: '',
  setDiagnosisCode: vi.fn(),
  diagnosisDescription: '',
  setDiagnosisDescription: vi.fn(),
  justification: '',
  setJustification: vi.fn(),
  evolutionJustification: '',
  setEvolutionJustification: vi.fn(),
  dischargeStatus: 'discharged',
  setDischargeStatus: vi.fn(),
  dischargeReason: '',
  setDischargeReason: vi.fn(),
  submitting: false,
  handleAdmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
  handleEvolve: vi.fn((e: React.FormEvent) => e.preventDefault()),
  handleDischarge: vi.fn((e: React.FormEvent) => e.preventDefault()),
  ...overrides,
});

describe('InternacaoTab (ADM-001..008)', () => {
  it('avisa que não há leito alocado quando não há leito nem internação ativa', () => {
    render(<InternacaoTab bedInfo={null} admission={null} form={buildForm()} />);
    expect(screen.getByText(/Nenhum leito alocado para este atendimento/)).toBeInTheDocument();
  });

  it('mostra o formulário "Internar Paciente" quando há leito mas nenhuma internação ativa', () => {
    const form = buildForm({ diagnosisDescription: 'Pneumonia bacteriana grave', justification: 'Necessita internação para tratamento venoso.' });
    render(<InternacaoTab bedInfo={bedInfo} admission={null} form={form} />);

    expect(screen.getByRole('heading', { name: 'Internar Paciente' })).toBeInTheDocument();
    expect(screen.getByText('Internação Adulto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Internar Paciente' }));
    expect(form.handleAdmit).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão de internar enquanto diagnóstico/justificativa não atingem o mínimo exigido', () => {
    const form = buildForm({ diagnosisDescription: 'AB', justification: 'curta' });
    render(<InternacaoTab bedInfo={bedInfo} admission={null} form={form} />);
    expect(screen.getByRole('button', { name: 'Internar Paciente' })).toBeDisabled();
  });

  it('mostra o painel "Paciente Internado" com dados da internação ativa e os formulários de evolução/encerramento', () => {
    const form = buildForm({ evolutionJustification: 'Paciente estável, mantendo antibioticoterapia.' });
    render(<InternacaoTab bedInfo={bedInfo} admission={activeAdmission} form={form} />);

    expect(screen.getByText('Paciente Internado')).toBeInTheDocument();
    expect(screen.getByText('ATIVA')).toBeInTheDocument();
    expect(screen.getByText(/Pneumonia bacteriana grave/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Evolução' }));
    expect(form.handleEvolve).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar Internação' }));
    expect(form.handleDischarge).toHaveBeenCalledTimes(1);
  });

  it('só mostra o campo de causa/circunstância do óbito quando o tipo de encerramento é "Óbito"', () => {
    const { rerender } = render(
      <InternacaoTab bedInfo={bedInfo} admission={activeAdmission} form={buildForm({ dischargeStatus: 'discharged' })} />,
    );
    expect(screen.queryByPlaceholderText(/Causa\/circunstância do óbito/)).not.toBeInTheDocument();

    rerender(<InternacaoTab bedInfo={bedInfo} admission={activeAdmission} form={buildForm({ dischargeStatus: 'deceased' })} />);
    expect(screen.getByPlaceholderText(/Causa\/circunstância do óbito/)).toBeInTheDocument();
  });
});
