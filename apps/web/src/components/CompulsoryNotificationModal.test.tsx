// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompulsoryNotificationModal } from './CompulsoryNotificationModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('CompulsoryNotificationModal Component Test (NOTIF-001..003)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza o modal, carrega agravos e registra notificação com sucesso (sem schema de campos clínicos)', async () => {
    get.mockImplementation((path: string) => {
      if (path === '/api/v1/notifiable-diseases') {
        return Promise.resolve([{ id: 'd-1', code: 'DENGUE', name: 'Dengue' }]);
      }
      if (path.endsWith('/body-schema')) {
        return Promise.resolve(null);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    post.mockResolvedValue({
      id: 'notif-1',
      diseaseId: 'd-1',
      patientId: 'pat-456',
      encounterId: 'enc-123',
      notifiedBy: 'user-1',
      createdAt: new Date().toISOString(),
    });

    render(<CompulsoryNotificationModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('compulsory-notification-modal')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Dengue')).toBeTruthy();
    });

    // Espera o schema (null pra DENGUE) resolver antes de submeter, senão o
    // teste corre risco de capturar o estado intermediário.
    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/notifiable-diseases/DENGUE/body-schema');
    });

    const submitBtn = screen.getByTestId('submit-notification-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/compulsory-notifications', {
        diseaseId: 'd-1',
        patientId: 'pat-456',
        encounterId: 'enc-123',
        symptomOnsetDate: null,
        clinicalNotes: null,
        bodyFields: null,
      });
    });

    expect(screen.getByTestId('notification-status-msg').textContent).toContain('registrada com sucesso');
  });

  it('mostra os campos clínicos dinâmicos quando a doença tem schema mapeado, e os envia no corpo', async () => {
    const schema = {
      schemaCode: 'ACIDENTE_ANIMAL_PECONHENTO',
      groups: [
        {
          title: 'Dados do Acidente',
          fields: [
            {
              code: '45',
              label: 'Tipo de Acidente',
              type: 'code',
              options: [
                { code: '1', label: 'Serpente' },
                { code: '2', label: 'Aranha' },
              ],
            },
          ],
        },
      ],
    };

    get.mockImplementation((path: string) => {
      if (path === '/api/v1/notifiable-diseases') {
        return Promise.resolve([{ id: 'd-2', code: 'ACIDENTE_ANIMAL_PECONHENTO', name: 'Acidente por Animal Peçonhento' }]);
      }
      if (path.endsWith('/body-schema')) {
        return Promise.resolve(schema);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    post.mockResolvedValue({
      id: 'notif-2',
      diseaseId: 'd-2',
      patientId: 'pat-456',
      encounterId: 'enc-123',
      notifiedBy: 'user-1',
      createdAt: new Date().toISOString(),
    });

    render(<CompulsoryNotificationModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Tipo de Acidente'), { target: { value: '1' } });

    fireEvent.click(screen.getByTestId('submit-notification-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/compulsory-notifications', {
        diseaseId: 'd-2',
        patientId: 'pat-456',
        encounterId: 'enc-123',
        symptomOnsetDate: null,
        clinicalNotes: null,
        bodyFields: { '45': '1' },
      });
    });
  });
});
