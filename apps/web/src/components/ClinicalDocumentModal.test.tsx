// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClinicalDocumentModal } from './ClinicalDocumentModal.js';
import * as docApi from '../lib/document-api.js';

vi.mock('../lib/document-api.js', () => ({
  issueClinicalDocument: vi.fn(),
  revokeClinicalDocument: vi.fn(),
}));

describe('ClinicalDocumentModal Component Test (DOC-001..010)', () => {
  it('renderiza form de atestado medico e emite documento com sucesso', async () => {
    vi.mocked(docApi.issueClinicalDocument).mockResolvedValue({
      data: {
        id: 'doc-123',
        integrityHash: 'a1b2c3d4e5f67890',
      },
    });

    render(<ClinicalDocumentModal encounterId="enc-456" />);

    expect(screen.getByTestId('clinical-document-modal')).toBeTruthy();
    expect(screen.getByText('Emissão de Documentos Clínicos (Atestados / Declarações)')).toBeTruthy();

    const submitBtn = screen.getByTestId('issue-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(docApi.issueClinicalDocument).toHaveBeenCalledWith('enc-456', expect.objectContaining({
        documentType: 'medical_certificate',
        title: 'Atestado Médico de Afastamento',
        daysOff: 3,
      }));
    });

    expect(screen.getByTestId('doc-msg').textContent).toContain('Documento emitido com sucesso!');
  });
});
