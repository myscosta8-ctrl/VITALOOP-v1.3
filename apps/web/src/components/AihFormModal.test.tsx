// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AihFormModal } from './AihFormModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('AihFormModal Component Test (SUS-001..006)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza modal de laudo AIH, valida compatibilidade e emite solicitação com sucesso', async () => {
    get.mockResolvedValue({ schemaCode: 'AIH_CLINICAL_FIELDS', groups: [] });
    post.mockImplementation((path: string) => {
      if (path === '/api/v1/sus/validate-compatibility') {
        return Promise.resolve({ isValid: true, errors: [] });
      }
      if (path === '/api/v1/sus/aih-requests') {
        return Promise.resolve({ id: 'aih-123-abc', status: 'validated' });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });

    render(<AihFormModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('aih-form-modal')).toBeTruthy();
    expect(screen.getByText('Laudo para Emissão de AIH / Faturamento SUS (SUS-001..006)')).toBeTruthy();

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/sus/aih-clinical-fields-schema');
    });

    const validateBtn = screen.getByTestId('validate-compat-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/sus/validate-compatibility',
        expect.objectContaining({ procedureCode: '0303060280', cid10: 'J18.9' }),
      );
    });

    expect(screen.getByTestId('compat-check-msg').textContent).toContain('100% COMPATÍVEL');

    const submitBtn = screen.getByTestId('submit-aih-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/sus/aih-requests',
        expect.objectContaining({
          encounterId: 'enc-123',
          patientId: 'pat-456',
          mainProcedureCode: '0303060280',
          mainCid10: 'J18.9',
        }),
      );
    });

    expect(screen.getByTestId('sus-msg').textContent).toContain('Laudo de AIH emitido e validado com sucesso!');
  });
});
