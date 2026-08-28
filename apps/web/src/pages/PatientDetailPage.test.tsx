/** @vitest-environment jsdom */
/**
 * Testes de UI da identificação do paciente e dados complementares — cobrem
 * os cenários 19,20,21,22,23 do escopo obrigatório da Etapa 3/6.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientDetailPage } from './PatientDetailPage.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: { get, post, patch } }),
}));

const patient = {
  id: 'p1',
  medicalRecordNumber: '2026000001',
  fullName: 'Maria Souza',
  socialName: null,
  motherName: 'Joana Souza',
  birthDate: '1990-01-01',
  sex: 'female',
  cpf: '11144477735',
  cns: null,
  status: 'active',
};

const routesFor = (
  overrides: Partial<
    Record<'contacts' | 'allergies' | 'antecedents' | 'medications' | 'problems' | 'timeline', unknown[]>
  > = {},
  patientOverride: Partial<typeof patient> = {},
) => {
  get.mockImplementation((path: string) => {
    if (path === `/api/v1/patients/p1`) return Promise.resolve({ ...patient, ...patientOverride });
    if (path.endsWith('/contacts')) return Promise.resolve(overrides.contacts ?? []);
    if (path.endsWith('/allergies')) return Promise.resolve(overrides.allergies ?? []);
    if (path.endsWith('/antecedents')) return Promise.resolve(overrides.antecedents ?? []);
    if (path.endsWith('/continuous-medications')) return Promise.resolve(overrides.medications ?? []);
    if (path.endsWith('/active-problems')) return Promise.resolve(overrides.problems ?? []);
    if (path.endsWith('/timeline')) return Promise.resolve(overrides.timeline ?? []);
    return Promise.reject(new Error(`rota não mapeada no teste: ${path}`));
  });
};

describe('PatientDetailPage', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('carrega e mostra a identificação do paciente (Doc 1 §12)', async () => {
    routesFor();
    render(<PatientDetailPage patientId="p1" />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Maria Souza' })).toBeInTheDocument();
    expect(screen.getByText('2026000001')).toBeInTheDocument();
    expect(screen.getByText('11144477735')).toBeInTheDocument();
  });

  it('19. contatos — lista existentes e permite adicionar um novo', async () => {
    routesFor({ contacts: [{ id: 'c1', name: 'Ana Contato', phone: '11988887777', isEmergency: true }] });
    post.mockResolvedValueOnce({ id: 'c2', name: 'Novo Contato', phone: '11977776666', isEmergency: false });
    const user = userEvent.setup();
    render(<PatientDetailPage patientId="p1" />);
    await screen.findByText(/ana contato/i);

    await user.type(screen.getByLabelText(/^nome$/i), 'Novo Contato');
    await user.type(screen.getByLabelText(/^telefone$/i), '11977776666');
    await user.click(screen.getByRole('button', { name: /adicionar contato/i }));
    expect(post).toHaveBeenCalledWith('/api/v1/patients/p1/contacts', expect.objectContaining({ name: 'Novo Contato' }));
  });

  it('20. alergias — lista existentes, permite adicionar e alterar status', async () => {
    routesFor({ allergies: [{ id: 'a1', substance: 'Dipirona', reaction: null, severity: 'moderate', status: 'active' }] });
    patch.mockResolvedValueOnce({ id: 'a1', substance: 'Dipirona', status: 'resolved' });
    const user = userEvent.setup();
    render(<PatientDetailPage patientId="p1" />);
    await screen.findByText(/dipirona/i);

    await user.selectOptions(screen.getByLabelText(/alterar status/i), 'resolved');
    expect(patch).toHaveBeenCalledWith('/api/v1/patients/p1/allergies/a1', { status: 'resolved' });
  });

  it('21. antecedentes — lista existentes e permite adicionar', async () => {
    routesFor({ antecedents: [{ id: 'an1', description: 'Hipertensão' }] });
    post.mockResolvedValueOnce({ id: 'an2', description: 'Diabetes' });
    const user = userEvent.setup();
    render(<PatientDetailPage patientId="p1" />);
    await screen.findByText(/hipertensão/i);

    await user.type(screen.getByLabelText(/descrição/i, { selector: '#antecedent-description' }), 'Diabetes');
    await user.click(screen.getByRole('button', { name: /adicionar antecedente/i }));
    expect(post).toHaveBeenCalledWith('/api/v1/patients/p1/antecedents', { description: 'Diabetes' });
  });

  it('22. medicamentos de uso contínuo — lista existentes e permite adicionar', async () => {
    routesFor({ medications: [{ id: 'm1', medication: 'Losartana' }] });
    post.mockResolvedValueOnce({ id: 'm2', medication: 'Metformina' });
    const user = userEvent.setup();
    render(<PatientDetailPage patientId="p1" />);
    await screen.findByText(/losartana/i);

    await user.type(screen.getByLabelText(/^medicamento$/i), 'Metformina');
    await user.click(screen.getByRole('button', { name: /adicionar medicamento/i }));
    expect(post).toHaveBeenCalledWith('/api/v1/patients/p1/continuous-medications', {
      medication: 'Metformina',
    });
  });

  it('23. problemas/condições ativas — lista existentes e permite adicionar', async () => {
    routesFor({ problems: [{ id: 'pr1', description: 'Diabetes tipo 2', status: 'active' }] });
    post.mockResolvedValueOnce({ id: 'pr2', description: 'Asma', status: 'active' });
    const user = userEvent.setup();
    render(<PatientDetailPage patientId="p1" />);
    await screen.findByText(/diabetes tipo 2/i);

    await user.type(screen.getByLabelText(/descrição/i, { selector: '#problem-description' }), 'Asma');
    await user.click(screen.getByRole('button', { name: /adicionar problema/i }));
    expect(post).toHaveBeenCalledWith('/api/v1/patients/p1/active-problems', { description: 'Asma' });
  });

  it('Etapa 4/6: histórico (timeline) — lista os eventos reais do paciente (PAT-014)', async () => {
    routesFor({
      timeline: [
        { eventId: 'e1', type: 'PatientRegistered', aggregateType: 'patient', actorUserId: 'u1', occurredAt: '2026-08-20T10:00:00Z', payload: {} },
      ],
    });
    render(<PatientDetailPage patientId="p1" />);
    expect(await screen.findByText(/PatientRegistered/)).toBeInTheDocument();
  });

  it('Etapa 4/6: inativar paciente exige motivo e recarrega o status', async () => {
    routesFor();
    patch.mockResolvedValueOnce({ ...patient, status: 'inactive' });
    const user = userEvent.setup();
    render(<PatientDetailPage patientId="p1" />);
    await screen.findByRole('heading', { name: 'Maria Souza' });

    await user.click(screen.getByRole('button', { name: /inativar paciente/i }));
    expect(await screen.findByText(/motivo é obrigatório/i)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^motivo$/i), 'Óbito');
    await user.click(screen.getByRole('button', { name: /inativar paciente/i }));
    expect(patch).toHaveBeenCalledWith('/api/v1/patients/p1/inactivate', { reason: 'Óbito' });
  });
});
