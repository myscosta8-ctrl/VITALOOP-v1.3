/**
 * @vitest-environment jsdom
 *
 * Reescrito na etapa "Triagem" (14/09/2026): a tela deixou de ser um
 * formulário isolado (só `encounterId` + campos) e passou a ser uma
 * área de trabalho completa — busca o atendimento, o paciente e a triagem já
 * existente (se houver) antes de decidir entre o formulário de registro
 * inicial e o resumo somente-leitura + reclassificação. O mock de `get`
 * precisa diferenciar por URL (antes bastava um valor fixo para a única
 * chamada existente). Rótulos mudaram para os nomes oficiais da imagem de
 * referência (`TRIAGEM.png`): "Queixa principal *", "História da doença
 * atual (HDA) *", classificação por rádio (não mais `<select>`), botão
 * "Finalizar triagem" (antes "Concluir Triagem").
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TriageOpenPage } from './TriageOpenPage.js';
import { ApiError } from '../lib/api-client.js';

const ENCOUNTER = { id: 'enc-123', patientId: 'pat-1', status: 'triage_pending', createdAt: new Date().toISOString() };
const PATIENT = { id: 'pat-1', fullName: 'Paciente Teste', birthDate: '1990-01-01', sex: 'male', cpf: '111', cns: '222', medicalRecordNumber: 'MRN-1' };

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const notFound = () => Promise.reject(new ApiError(404, { code: 'NOT_FOUND', message: 'não encontrado', requestId: 'req-1' }));

const setupGetMock = () => {
  get.mockImplementation((url: string) => {
    if (url === '/api/v1/encounters/enc-123') return Promise.resolve(ENCOUNTER);
    if (url === '/api/v1/encounters/enc-123/triage') return notFound();
    if (url === '/api/v1/patients/pat-1') return Promise.resolve(PATIENT);
    if (url.endsWith('/allergies')) return Promise.resolve([]);
    if (url.endsWith('/continuous-medications')) return Promise.resolve([]);
    if (url.endsWith('/timeline')) return Promise.resolve([]);
    if (url.endsWith('/antecedents')) return Promise.resolve([]);
    if (url === '/api/v1/consultation-rooms') return Promise.resolve([{ id: 'room-1', institutionId: 'inst-1', name: 'Consultório 1', isActive: true, createdAt: '', updatedAt: '' }]);
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

const renderPage = (encounterId = 'enc-123') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TriageOpenPage encounterId={encounterId} />
    </QueryClientProvider>,
  );
};

describe('TriageOpenPage UI Tests', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    setupGetMock();
  });

  it('renderiza o formulário de triagem e classificação de risco', async () => {
    renderPage();
    expect(await screen.findByLabelText(/Queixa principal \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/História da doença atual \(HDA\) \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PA Sistólica/i)).toBeInTheDocument();
    expect(screen.getByText(/Classificação de risco \(Manchester\) \*/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Laranja — Muito urgente/i })).toBeInTheDocument();
  });

  it('exibe erro ao tentar submeter sem queixa principal', async () => {
    renderPage();
    const submitBtn = await screen.findByRole('button', { name: /Finalizar triagem/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/A queixa principal é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('submete triagem válida e chama API post', async () => {
    post.mockResolvedValueOnce({
      id: 'tri-123',
      encounterId: 'enc-123',
      chiefComplaint: 'Dor de cabeça forte',
      riskColor: 'yellow',
    });

    renderPage();

    fireEvent.change(await screen.findByLabelText(/Queixa principal \*/i), {
      target: { value: 'Dor de cabeça forte' },
    });
    fireEvent.change(screen.getByLabelText(/História da doença atual \(HDA\) \*/i), {
      target: { value: 'Início há 2 horas, piora progressiva.' },
    });
    fireEvent.change(screen.getByLabelText(/PA Sistólica/i), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Amarelo — Urgente/i }));
    // Encaminhamento após triagem (Bloco 3) é obrigatório — "Sala Vermelha"
    // não exige nenhum subcampo, é o caminho mais simples pro teste.
    fireEvent.click(screen.getByRole('radio', { name: /Sala Vermelha/i }));

    const submitBtn = screen.getByRole('button', { name: /Finalizar triagem/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/encounters/enc-123/triage', expect.objectContaining({
        chiefComplaint: 'Dor de cabeça forte',
        history: 'Início há 2 horas, piora progressiva.',
        vitals: expect.objectContaining({ systolicBp: 120 }),
        riskColor: 'yellow',
        destination: expect.objectContaining({ type: 'red_room' }),
      }));
    });
  });

  it('Bloco 3: exige consultório quando o tipo é "Atendimento médico" e lista os consultórios disponíveis', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText(/Queixa principal \*/i), { target: { value: 'Dor no peito' } });
    fireEvent.change(screen.getByLabelText(/História da doença atual \(HDA\) \*/i), { target: { value: 'Início súbito.' } });
    fireEvent.click(screen.getByRole('radio', { name: /Amarelo — Urgente/i }));
    fireEvent.click(screen.getByRole('radio', { name: /Atendimento médico/i }));

    // O consultório vindo do mock de GET /api/v1/consultation-rooms aparece como opção.
    expect(await screen.findByRole('option', { name: 'Consultório 1' })).toBeInTheDocument();

    fireEvent.submit(screen.getByRole('button', { name: /Finalizar triagem/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Selecione o consultório/i)).toBeInTheDocument();
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('Bloco 3: "Outro procedimento institucional" exige descrição antes de finalizar', async () => {
    renderPage();

    fireEvent.change(await screen.findByLabelText(/Queixa principal \*/i), { target: { value: 'Retirada de pontos' } });
    fireEvent.change(screen.getByLabelText(/História da doença atual \(HDA\) \*/i), { target: { value: 'Pontos de cirurgia prévia.' } });
    fireEvent.click(screen.getByRole('radio', { name: /Verde — Pouco urgente/i }));
    fireEvent.click(screen.getByRole('radio', { name: /^Procedimento$/i }));
    fireEvent.change(await screen.findByLabelText(/^Procedimento$/i, { selector: 'select' }), { target: { value: 'other' } });

    fireEvent.submit(screen.getByRole('button', { name: /Finalizar triagem/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Descreva o procedimento institucional/i)).toBeInTheDocument();
    });
    expect(post).not.toHaveBeenCalled();
  });
});
