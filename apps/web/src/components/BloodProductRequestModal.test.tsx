// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BloodProductRequestModal } from './BloodProductRequestModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'BLOOD_PRODUCT_REQUEST',
  groups: [
    {
      title: 'Solicitação',
      fields: [
        { code: 'medico_solicitante_nome', label: 'Médico solicitante', type: 'text', required: true },
      ],
    },
  ],
};

describe('BloodProductRequestModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a solicitação com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'req-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      clinicalIndication: 'Anemia aguda grave',
      formFields: { medico_solicitante_nome: 'Dr. Teste' },
      createdAt: new Date().toISOString(),
    });

    render(<BloodProductRequestModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/hemotherapy/blood-product-request-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/Indicação Clínica/), { target: { value: 'Anemia aguda grave' } });
    fireEvent.change(screen.getByLabelText('Médico solicitante *'), { target: { value: 'Dr. Teste' } });

    fireEvent.click(screen.getByTestId('submit-blood-request-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/hemotherapy/blood-product-requests', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        clinicalIndication: 'Anemia aguda grave',
        formFields: { medico_solicitante_nome: 'Dr. Teste' },
      });
    });

    expect(screen.getByTestId('blood-request-status-msg').textContent).toContain('registrada com sucesso');
  });

  it('não submete sem indicação clínica preenchida', async () => {
    get.mockResolvedValue(SCHEMA);

    render(<BloodProductRequestModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    // Preenche o único campo obrigatório do schema (pra isolar o teste no
    // que importa aqui: a indicação clínica vazia) — sem isso, o `required`
    // nativo do HTML bloqueia o evento de submit antes da validação em JS
    // rodar, e nem chegaríamos a ver a mensagem customizada.
    fireEvent.change(screen.getByLabelText('Médico solicitante *'), { target: { value: 'Dr. Teste' } });

    fireEvent.click(screen.getByTestId('submit-blood-request-btn'));

    expect(post).not.toHaveBeenCalled();
    expect(screen.getByTestId('blood-request-status-msg').textContent).toContain('obrigatória');
  });
});
