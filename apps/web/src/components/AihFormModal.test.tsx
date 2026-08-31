// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AihFormModal } from './AihFormModal.js';
import * as susApi from '../lib/sus-api.js';

vi.mock('../lib/sus-api.js', () => ({
  issueAihRequest: vi.fn(),
  validateSusCompatibility: vi.fn(),
}));

describe('AihFormModal Component Test (SUS-001..006)', () => {
  it('renderiza modal de laudo AIH, valida compatibilidade e emite solicitação com sucesso', async () => {
    vi.mocked(susApi.validateSusCompatibility).mockResolvedValue({
      data: {
        isValid: true,
        errors: [],
      },
    });

    vi.mocked(susApi.issueAihRequest).mockResolvedValue({
      data: {
        id: 'aih-123-abc',
        status: 'validated',
      },
    });

    render(<AihFormModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('aih-form-modal')).toBeTruthy();
    expect(screen.getByText('Laudo para Emissão de AIH / Faturamento SUS (SUS-001..006)')).toBeTruthy();

    const validateBtn = screen.getByTestId('validate-compat-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(susApi.validateSusCompatibility).toHaveBeenCalledWith(expect.objectContaining({
        procedureCode: '0303060280',
        cid10: 'J18.9',
      }));
    });

    expect(screen.getByTestId('compat-check-msg').textContent).toContain('100% COMPATÍVEL');

    const submitBtn = screen.getByTestId('submit-aih-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(susApi.issueAihRequest).toHaveBeenCalledWith(expect.objectContaining({
        encounterId: 'enc-123',
        patientId: 'pat-456',
        mainProcedureCode: '0303060280',
        mainCid10: 'J18.9',
      }));
    });

    expect(screen.getByTestId('sus-msg').textContent).toContain('Laudo de AIH emitido e validado com sucesso!');
  });
});
