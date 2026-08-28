/** @vitest-environment jsdom */
/**
 * Testes de UI da busca de paciente — cobrem os cenários 2,12,13,14,15,16,17,18.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientSearchPage } from './PatientSearchPage.js';
import { ApiError } from '../lib/api-client.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: { get, post, patch } }),
}));

describe('PatientSearchPage', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('2. mostra estado de carregamento durante a busca', async () => {
    let resolvePromise: (v: unknown) => void = () => {};
    get.mockReturnValueOnce(new Promise((resolve) => (resolvePromise = resolve)));
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^nome$/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    resolvePromise([]);
  });

  it('12. busca por nome retorna resultados', async () => {
    get.mockResolvedValueOnce([
      { id: 'p1', fullName: 'Maria Souza', socialName: null, medicalRecordNumber: '2026000001', birthDate: null, cpf: null },
    ]);
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^nome$/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('name=Maria'));
  });

  it('13. busca por CPF retorna resultados', async () => {
    get.mockResolvedValueOnce([
      { id: 'p2', fullName: 'João Pedro', socialName: null, medicalRecordNumber: '2026000002', birthDate: null, cpf: '11144477735' },
    ]);
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^cpf$/i), '11144477735');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText('João Pedro')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('cpf=11144477735'));
  });

  it('14. busca por CNS retorna resultados', async () => {
    get.mockResolvedValueOnce([
      { id: 'p3', fullName: 'Ana Lima', socialName: null, medicalRecordNumber: '2026000003', birthDate: null, cpf: null },
    ]);
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^cns$/i), '777082203934924');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('cns=777082203934924'));
  });

  it('15. busca por número de prontuário retorna resultados', async () => {
    get.mockResolvedValueOnce([
      { id: 'p4', fullName: 'Carlos Alves', socialName: null, medicalRecordNumber: '2026000004', birthDate: null, cpf: null },
    ]);
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/número de prontuário/i), '2026000004');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText('Carlos Alves')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('mrn=2026000004'));
  });

  it('16. trata ausência de resultados de forma explícita', async () => {
    get.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^nome$/i), 'Inexistente');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText(/nenhum paciente encontrado/i)).toBeInTheDocument();
  });

  it('17. erro 403 (sem permissão) mostra tela de acesso negado', async () => {
    get.mockRejectedValueOnce(
      new ApiError(403, { code: 'ACCESS_DENIED', message: 'Acesso negado.', requestId: 'r1' }),
    );
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^nome$/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText(/não tem permissão/i)).toBeInTheDocument();
  });

  it('18. sessão expirada (401) mostra tela de "precisa entrar"', async () => {
    get.mockRejectedValueOnce(
      new ApiError(401, { code: 'AUTH_REQUIRED', message: 'Autenticação necessária.', requestId: 'r1' }),
    );
    const user = userEvent.setup();
    render(<PatientSearchPage />);
    await user.type(screen.getByLabelText(/^nome$/i), 'Maria');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText(/precisa entrar/i)).toBeInTheDocument();
  });
});
