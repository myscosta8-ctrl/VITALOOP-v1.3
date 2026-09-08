// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApacFormModal } from './ApacFormModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('ApacFormModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza modal de laudo APAC, valida compatibilidade e emite solicitação com sucesso', async () => {
    get.mockResolvedValue({ schemaCode: 'APAC_CLINICAL_FIELDS', groups: [] });
    post.mockImplementation((path: string) => {
      if (path === '/api/v1/sus/validate-compatibility') {
        return Promise.resolve({ isValid: true, errors: [] });
      }
      if (path === '/api/v1/sus/apac-requests') {
        return Promise.resolve({ id: 'apac-123-abc', status: 'validated' });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });

    render(<ApacFormModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('apac-form-modal')).toBeTruthy();
    expect(
      screen.getByText('Laudo para Solicitação/Autorização de Procedimento Ambulatorial (APAC)'),
    ).toBeTruthy();

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/sus/apac-clinical-fields-schema');
    });

    const validateBtn = screen.getByTestId('validate-compat-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/sus/validate-compatibility',
        expect.objectContaining({ procedureCode: '0301060061', cid10: 'J45.9' }),
      );
    });

    expect(screen.getByTestId('compat-check-msg').textContent).toContain('100% COMPATÍVEL');

    const submitBtn = screen.getByTestId('submit-apac-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/sus/apac-requests',
        expect.objectContaining({
          encounterId: 'enc-123',
          patientId: 'pat-456',
          mainProcedureCode: '0301060061',
          mainCid10: 'J45.9',
        }),
      );
    });

    expect(screen.getByTestId('apac-msg').textContent).toContain('Laudo de APAC emitido e validado com sucesso!');
  });
});
