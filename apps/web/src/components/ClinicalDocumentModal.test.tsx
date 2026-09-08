// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClinicalDocumentModal } from './ClinicalDocumentModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('ClinicalDocumentModal Component Test (DOC-001..010)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza form de atestado medico e emite documento com sucesso', async () => {
    post.mockResolvedValue({ id: 'doc-123', integrityHash: 'a1b2c3d4e5f67890', status: 'issued' });

    render(<ClinicalDocumentModal encounterId="enc-456" />);

    expect(screen.getByTestId('clinical-document-modal')).toBeTruthy();
    expect(screen.getByText('Emissão de Documentos Clínicos (Atestados / Declarações)')).toBeTruthy();

    const submitBtn = screen.getByTestId('issue-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/encounters/enc-456/documents',
        expect.objectContaining({
          documentType: 'medical_certificate',
          title: 'Atestado Médico de Afastamento',
          daysOff: 3,
        }),
      );
    });

    expect(screen.getByTestId('doc-msg').textContent).toContain('Documento emitido com sucesso!');
  });
});
