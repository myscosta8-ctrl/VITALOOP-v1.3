// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AntimicrobialRequestModal } from './AntimicrobialRequestModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'ANTIMICROBIAL_REQUEST',
  groups: [
    {
      title: 'Tratamento Pretendido',
      fields: [
        {
          code: 'medicamento',
          label: 'Medicamento',
          type: 'code',
          required: true,
          options: [
            { code: 'vancomicina', label: 'Vancomicina' },
            { code: 'meropenem', label: 'Meropenem' },
          ],
        },
      ],
    },
  ],
};

describe('AntimicrobialRequestModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a solicitação com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'atm-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      medication: 'vancomicina',
      formFields: { medicamento: 'vancomicina' },
      createdAt: new Date().toISOString(),
    });

    render(<AntimicrobialRequestModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/pharmacy-atm/antimicrobial-request-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Medicamento *'), { target: { value: 'vancomicina' } });

    fireEvent.click(screen.getByTestId('submit-atm-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/pharmacy-atm/antimicrobial-requests', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { medicamento: 'vancomicina' },
      });
    });

    expect(screen.getByTestId('atm-status-msg').textContent).toContain('registrada com sucesso');
  });
});
