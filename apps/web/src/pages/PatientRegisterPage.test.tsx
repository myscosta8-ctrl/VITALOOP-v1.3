/** @vitest-environment jsdom */
/**
 * Testes de UI do cadastro de paciente — cobrem os cenários 1,3,4,5,6,7,8,9,10,11
 * do escopo obrigatório da Etapa 3/6. `useSession` é mockado (sem rede real);
 * a API real já foi validada na Etapa 2/6 (`tests/integration/patients.api.test.ts`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientRegisterPage } from './PatientRegisterPage.js';
import { ApiError } from '../lib/api-client.js';

const post = vi.fn();
const patch = vi.fn();
const get = vi.fn();

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: { post, patch, get } }),
}));

const fillRequiredAndSubmit = async (user: ReturnType<typeof userEvent.setup>, name = 'Maria Souza') => {
  await user.type(screen.getByLabelText(/nome completo/i), name);
  await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));
};

describe('PatientRegisterPage', () => {
  beforeEach(() => {
    post.mockReset();
    patch.mockReset();
    get.mockReset();
  });

  it('1. abre a tela de cadastro com o formulário visível', () => {
    render(<PatientRegisterPage />);
    expect(screen.getByRole('heading', { name: /cadastro de paciente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
  });

  it('3. impede envio de formulário vazio (nome obrigatório)', async () => {
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));
    expect(await screen.findByText(/nome completo é obrigatório/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('4. valida campos obrigatórios antes de chamar a API', async () => {
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));
    expect(post).not.toHaveBeenCalled();
  });

  it('5. exibe erro de CPF inválido retornado pela API', async () => {
    post.mockRejectedValueOnce(
      new ApiError(400, { code: 'PATIENT_INVALID_CPF', message: 'CPF inválido.', requestId: 'r1' }),
    );
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await fillRequiredAndSubmit(user);
    expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
  });

  it('6. exibe erro de CNS inválido retornado pela API', async () => {
    post.mockRejectedValueOnce(
      new ApiError(400, { code: 'PATIENT_INVALID_CNS', message: 'CNS inválido.', requestId: 'r1' }),
    );
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await fillRequiredAndSubmit(user);
    expect(await screen.findByText(/cns inválido/i)).toBeInTheDocument();
  });

  it('7/8. cadastro válido mostra feedback de sucesso com o prontuário gerado', async () => {
    post.mockResolvedValueOnce({
      id: 'p1',
      medicalRecordNumber: '2026000001',
      fullName: 'Maria Souza',
    });
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await fillRequiredAndSubmit(user);
    expect(await screen.findByText(/cadastrado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/2026000001/)).toBeInTheDocument();
  });

  it('9. exibe erro genérico quando a API falha por motivo de servidor', async () => {
    post.mockRejectedValueOnce(
      new ApiError(500, { code: 'INTERNAL_ERROR', message: 'Erro interno.', requestId: 'r1' }),
    );
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await fillRequiredAndSubmit(user);
    expect(await screen.findByText(/erro interno/i)).toBeInTheDocument();
  });

  it('10. duplicidade forte exibe aviso e permite confirmar mesmo assim', async () => {
    post.mockRejectedValueOnce(
      new ApiError(409, {
        code: 'PATIENT_DUPLICATE_NOT_CONFIRMED',
        message: 'Possível duplicidade forte.',
        requestId: 'r1',
        details: [{ field: 'duplicate', issue: 'abc-123:strong' }],
      }),
    );
    post.mockResolvedValueOnce({ id: 'p2', medicalRecordNumber: '2026000002', fullName: 'Maria Souza' });
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await fillRequiredAndSubmit(user);

    expect(await screen.findByText(/possível duplicidade encontrada/i)).toBeInTheDocument();
    expect(screen.getByText(/duplicidade forte/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirmar e cadastrar mesmo assim/i }));
    await waitFor(() => expect(screen.getByText(/2026000002/)).toBeInTheDocument());
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/patients',
      expect.objectContaining({ confirmDuplicate: true }),
      undefined,
    );
  });

  it('11. conflito de identidade exige reconhecimento explícito antes de confirmar', async () => {
    post.mockRejectedValueOnce(
      new ApiError(409, {
        code: 'PATIENT_DUPLICATE_NOT_CONFIRMED',
        message: 'Conflito de identidade.',
        requestId: 'r1',
        details: [{ field: 'duplicate', issue: 'abc-999:conflict' }],
      }),
    );
    const user = userEvent.setup();
    render(<PatientRegisterPage />);
    await fillRequiredAndSubmit(user);

    expect(await screen.findByText(/conflito de identidade encontrado/i)).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /confirmar e cadastrar mesmo assim/i });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByLabelText(/estou ciente/i));
    expect(confirmButton).toBeEnabled();
  });
});
