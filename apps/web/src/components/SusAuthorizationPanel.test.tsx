// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SusAuthorizationPanel } from './SusAuthorizationPanel.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const AIH_PENDING = {
  id: 'aih-1',
  encounterId: 'enc-123',
  mainProcedureCode: '0303060280',
  mainCid10: 'J18.9',
  status: 'validated',
  formFields: {},
  createdAt: '2026-09-07T10:00:00.000Z',
};

describe('SusAuthorizationPanel Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('lista laudos pendentes e autoriza um laudo de AIH com sucesso', async () => {
    get.mockImplementation((path: string) => {
      if (path.startsWith('/api/v1/sus/aih-requests?')) return Promise.resolve([AIH_PENDING]);
      if (path.startsWith('/api/v1/sus/apac-requests?')) return Promise.resolve([]);
      if (path === '/api/v1/sus/aih-authorization-fields-schema') {
        return Promise.resolve({
          schemaCode: 'AIH_AUTHORIZATION_FIELDS',
          groups: [
            {
              title: 'Autorização',
              fields: [
                { code: 'numero_autorizacao', label: 'Número de autorização', type: 'text', required: true },
              ],
            },
          ],
        });
      }
      if (path === '/api/v1/sus/apac-authorization-fields-schema') {
        return Promise.resolve({ schemaCode: 'APAC_AUTHORIZATION_FIELDS', groups: [] });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    post.mockResolvedValue({ ...AIH_PENDING, status: 'authorized' });

    render(<SusAuthorizationPanel encounterId="enc-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('aih-authorization-table')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('authorize-aih-btn-aih-1'));

    await waitFor(() => {
      expect(screen.getByTestId('authorization-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Número de autorização *'), { target: { value: 'AIH-9988' } });
    fireEvent.click(screen.getByTestId('submit-authorization-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/sus/aih-requests/aih-1/authorize', {
        formFields: { numero_autorizacao: 'AIH-9988' },
      });
    });

    expect(screen.getByTestId('sus-authorization-msg').textContent).toContain('Laudo de AIH autorizado com sucesso!');
  });
});
