// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SbarTransferModal } from './SbarTransferModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'SBAR_TRANSFER',
  groups: [
    {
      title: 'Identificação da Transferência',
      fields: [
        { code: 'setor_origem', label: 'Setor de origem', type: 'text', required: true },
      ],
    },
  ],
};

describe('SbarTransferModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a transferência com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'sbar-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { setor_origem: 'Sala Vermelha' },
      createdAt: new Date().toISOString(),
    });

    render(<SbarTransferModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/sbar/sbar-transfer-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Setor de origem *'), {
      target: { value: 'Sala Vermelha' },
    });

    fireEvent.click(screen.getByTestId('submit-sbar-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/sbar/sbar-transfers', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { setor_origem: 'Sala Vermelha' },
      });
    });

    expect(screen.getByTestId('sbar-status-msg').textContent).toContain('registrada com sucesso');
  });
});
