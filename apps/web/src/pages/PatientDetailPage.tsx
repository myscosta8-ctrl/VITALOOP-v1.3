/**
 * Identificação/base do prontuário + dados complementares (Doc 1 §12; PAT-007..013).
 *
 * Cabeçalho segue exatamente os itens previstos no Doc 1 §12 (nome, nome
 * social, prontuário, CPF/CNS, nascimento, sexo, mãe, status) — nenhum campo
 * além do especificado. Cada subseção (contatos/alergias/antecedentes/
 * medicamentos/problemas) usa os endpoints reais da Etapa 2/6, sem repetir
 * validações já feitas pelo domínio/API.
 */

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createPatientsApi,
  type AllergySeverity,
  type AllergyStatus,
  type PatientActiveProblem,
  type PatientAllergy,
  type PatientAntecedent,
  type PatientContact,
  type PatientContinuousMedication,
  type PatientTimelineEvent,
} from '../lib/patients-api.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';
import { Button } from '../components/ui/button.js';
import { EmptyState } from '../components/ui/empty-state.js';
import { toast } from '../lib/toast.js';

const age = (birthDate: string | null): string => {
  if (!birthDate) return '—';
  const b = new Date(birthDate);
  const diff = Date.now() - b.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${years} anos`;
};

export const PatientDetailPage = ({ patientId }: { patientId: string }): JSX.Element => {
  const { api } = useSession();
  const patientsApi = createPatientsApi(api);
  const queryClient = useQueryClient();

  const patientQuery = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.get(patientId),
  });

  if (patientQuery.isLoading) return <p role="status">Carregando…</p>;
  if (patientQuery.isError) {
    const err = patientQuery.error;
    if (err instanceof ApiError && err.status === 404) return <p role="alert">Paciente não encontrado.</p>;
    if (err instanceof ApiError && err.status === 401) return <AccessDeniedPage reason="unauthenticated" />;
    if (err instanceof ApiError && err.status === 403) return <AccessDeniedPage reason="forbidden" />;
    return <p role="alert">{err instanceof ApiError ? err.message : 'Falha ao carregar paciente.'}</p>;
  }

  const patient = patientQuery.data;
  if (!patient) return <p role="alert">Paciente não encontrado.</p>;

  return (
    <main aria-labelledby="patient-detail-heading">
      <h1 id="patient-detail-heading">{patient.fullName}</h1>
      <dl>
        <dt>Nome social</dt>
        <dd>{patient.socialName ?? '—'}</dd>
        <dt>Prontuário</dt>
        <dd>{patient.medicalRecordNumber}</dd>
        <dt>CPF</dt>
        <dd>{patient.cpf ?? '—'}</dd>
        <dt>CNS</dt>
        <dd>{patient.cns ?? '—'}</dd>
        <dt>Nascimento</dt>
        <dd>
          {patient.birthDate ?? '—'} ({age(patient.birthDate)})
        </dd>
        <dt>Sexo</dt>
        <dd>{patient.sex ?? '—'}</dd>
        <dt>Mãe</dt>
        <dd>{patient.motherName ?? '—'}</dd>
        <dt>Status</dt>
        <dd>{patient.status}</dd>
      </dl>

      {patient.status === 'active' && (
        <InactivatePatientAction
          patientId={patient.id}
          patientsApi={patientsApi}
          onInactivated={() => queryClient.invalidateQueries({ queryKey: ['patient', patientId] })}
        />
      )}

      <p>
        <a href={`#/pacientes/${patient.id}/lgpd`}>Privacidade e LGPD</a>
      </p>

      <ContactsSection patientId={patient.id} patientsApi={patientsApi} />
      <AllergiesSection patientId={patient.id} patientsApi={patientsApi} />
      <AntecedentsSection patientId={patient.id} patientsApi={patientsApi} />
      <ContinuousMedicationsSection patientId={patient.id} patientsApi={patientsApi} />
      <ActiveProblemsSection patientId={patient.id} patientsApi={patientsApi} />
      <TimelineSection patientId={patient.id} patientsApi={patientsApi} />
    </main>
  );
};

const InactivatePatientAction = ({
  patientId,
  patientsApi,
  onInactivated,
}: {
  patientId: string;
  patientsApi: Api;
  onInactivated: () => void;
}): JSX.Element => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inactivateMutation = useMutation({
    mutationFn: () => patientsApi.inactivate(patientId, reason),
    onSuccess: () => {
      toast.success('Paciente inativado.');
      onInactivated();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Falha ao inativar paciente.'),
  });

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Motivo é obrigatório para inativar o paciente.');
      return;
    }
    setError(null);
    inactivateMutation.mutate();
  };

  return (
    <section aria-labelledby="inactivate-heading">
      <h2 id="inactivate-heading">Inativar cadastro</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="inactivate-reason">Motivo</label>
        <input id="inactivate-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button type="submit" className="mt-4" disabled={inactivateMutation.isPending}>
          {inactivateMutation.isPending ? 'Inativando…' : 'Inativar paciente'}
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
};

const TimelineSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const query = useQuery({
    queryKey: ['patient', patientId, 'timeline'],
    queryFn: () => patientsApi.getTimeline(patientId),
  });
  const items = query.data ?? null;
  const error = query.isError ? errMsg(query.error) : null;

  return (
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">Histórico</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando histórico…</p>}
      {items !== null && items.length === 0 && <EmptyState title="Nenhum evento registrado ainda" />}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((ev: PatientTimelineEvent) => (
            <li key={ev.eventId}>
              {ev.type} — {new Date(ev.occurredAt).toLocaleString('pt-BR')}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

type Api = ReturnType<typeof createPatientsApi>;

const errMsg = (err: unknown, fallback = 'Falha ao carregar.'): string => (err instanceof ApiError ? err.message : fallback);

const ContactsSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['patient', patientId, 'contacts'],
    queryFn: () => patientsApi.listContacts(patientId),
  });
  const items = query.data ?? null;
  const error = query.isError ? errMsg(query.error) : null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  const addMutation = useMutation({
    mutationFn: () => patientsApi.createContact(patientId, { name, phone, isEmergency }),
    onSuccess: () => {
      setName('');
      setPhone('');
      setIsEmergency(false);
      toast.success('Contato adicionado.');
      return queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'contacts'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao adicionar contato.')),
  });

  const onAdd = (e: FormEvent): void => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Nome e telefone são obrigatórios.');
      return;
    }
    addMutation.mutate();
  };

  return (
    <section aria-labelledby="contacts-heading">
      <h2 id="contacts-heading">Contatos</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando contatos…</p>}
      {items !== null && items.length === 0 && <EmptyState title="Nenhum contato cadastrado" />}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((c: PatientContact) => (
            <li key={c.id}>
              {c.name} — {c.phone} {c.isEmergency ? '(emergência)' : ''}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)}>
        <label htmlFor="contact-name">Nome</label>
        <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="contact-phone">Telefone</label>
        <input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label htmlFor="contact-emergency">
          <input
            id="contact-emergency"
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
          />
          Contato de emergência
        </label>
        <Button type="submit" className="mt-4" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Adicionando…' : 'Adicionar contato'}
        </Button>
      </form>
    </section>
  );
};

const AllergiesSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['patient', patientId, 'allergies'],
    queryFn: () => patientsApi.listAllergies(patientId),
  });
  const items = query.data ?? null;
  const error = query.isError ? errMsg(query.error) : null;

  const [substance, setSubstance] = useState('');
  const [severity, setSeverity] = useState<AllergySeverity>('unknown');

  const addMutation = useMutation({
    mutationFn: () => patientsApi.createAllergy(patientId, { substance, severity }),
    onSuccess: () => {
      setSubstance('');
      setSeverity('unknown');
      toast.success('Alergia adicionada.');
      return queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'allergies'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao adicionar alergia.')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ allergyId, status }: { allergyId: string; status: AllergyStatus }) =>
      patientsApi.updateAllergyStatus(patientId, allergyId, status),
    onSuccess: () => {
      toast.success('Status da alergia atualizado.');
      return queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'allergies'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao atualizar status.')),
  });

  const onAdd = (e: FormEvent): void => {
    e.preventDefault();
    if (!substance.trim()) {
      toast.error('Substância é obrigatória.');
      return;
    }
    addMutation.mutate();
  };

  const onStatusChange = (allergyId: string, status: AllergyStatus): void => {
    statusMutation.mutate({ allergyId, status });
  };

  return (
    <section aria-labelledby="allergies-heading">
      <h2 id="allergies-heading">Alergias</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando alergias…</p>}
      {items !== null && items.length === 0 && <EmptyState title="Nenhuma alergia registrada" />}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((a: PatientAllergy) => (
            <li key={a.id}>
              {a.substance} ({a.severity}) — {a.status}
              <label htmlFor={`allergy-status-${a.id}`}> Alterar status</label>
              <select
                id={`allergy-status-${a.id}`}
                value={a.status}
                onChange={(e) => void onStatusChange(a.id, e.target.value as AllergyStatus)}
              >
                <option value="active">Ativa</option>
                <option value="resolved">Resolvida</option>
                <option value="entered_in_error">Registrada por engano</option>
              </select>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)}>
        <label htmlFor="allergy-substance">Substância</label>
        <input id="allergy-substance" value={substance} onChange={(e) => setSubstance(e.target.value)} />
        <label htmlFor="allergy-severity">Gravidade</label>
        <select
          id="allergy-severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as AllergySeverity)}
        >
          <option value="unknown">Desconhecida</option>
          <option value="mild">Leve</option>
          <option value="moderate">Moderada</option>
          <option value="severe">Grave</option>
        </select>
        <Button type="submit" className="mt-4" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Adicionando…' : 'Adicionar alergia'}
        </Button>
      </form>
    </section>
  );
};

const AntecedentsSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['patient', patientId, 'antecedents'],
    queryFn: () => patientsApi.listAntecedents(patientId),
  });
  const items = query.data ?? null;
  const error = query.isError ? errMsg(query.error) : null;

  const [description, setDescription] = useState('');

  const addMutation = useMutation({
    mutationFn: () => patientsApi.createAntecedent(patientId, { description }),
    onSuccess: () => {
      setDescription('');
      toast.success('Antecedente adicionado.');
      return queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'antecedents'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao adicionar antecedente.')),
  });

  const onAdd = (e: FormEvent): void => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Descrição é obrigatória.');
      return;
    }
    addMutation.mutate();
  };

  return (
    <section aria-labelledby="antecedents-heading">
      <h2 id="antecedents-heading">Antecedentes</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando antecedentes…</p>}
      {items !== null && items.length === 0 && <EmptyState title="Nenhum antecedente registrado" />}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((a: PatientAntecedent) => (
            <li key={a.id}>{a.description}</li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)}>
        <label htmlFor="antecedent-description">Descrição</label>
        <input
          id="antecedent-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" className="mt-4" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Adicionando…' : 'Adicionar antecedente'}
        </Button>
      </form>
    </section>
  );
};

const ContinuousMedicationsSection = ({
  patientId,
  patientsApi,
}: {
  patientId: string;
  patientsApi: Api;
}): JSX.Element => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['patient', patientId, 'continuous-medications'],
    queryFn: () => patientsApi.listContinuousMedications(patientId),
  });
  const items = query.data ?? null;
  const error = query.isError ? errMsg(query.error) : null;

  const [medication, setMedication] = useState('');

  const addMutation = useMutation({
    mutationFn: () => patientsApi.createContinuousMedication(patientId, { medication }),
    onSuccess: () => {
      setMedication('');
      toast.success('Medicamento adicionado.');
      return queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'continuous-medications'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao adicionar medicamento.')),
  });

  const onAdd = (e: FormEvent): void => {
    e.preventDefault();
    if (!medication.trim()) {
      toast.error('Medicamento é obrigatório.');
      return;
    }
    addMutation.mutate();
  };

  return (
    <section aria-labelledby="medications-heading">
      <h2 id="medications-heading">Medicamentos de uso contínuo</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando medicamentos…</p>}
      {items !== null && items.length === 0 && <EmptyState title="Nenhum medicamento registrado" />}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((m: PatientContinuousMedication) => (
            <li key={m.id}>{m.medication}</li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)}>
        <label htmlFor="medication-name">Medicamento</label>
        <input id="medication-name" value={medication} onChange={(e) => setMedication(e.target.value)} />
        <Button type="submit" className="mt-4" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Adicionando…' : 'Adicionar medicamento'}
        </Button>
      </form>
    </section>
  );
};

const ActiveProblemsSection = ({
  patientId,
  patientsApi,
}: {
  patientId: string;
  patientsApi: Api;
}): JSX.Element => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['patient', patientId, 'active-problems'],
    queryFn: () => patientsApi.listActiveProblems(patientId),
  });
  const items = query.data ?? null;
  const error = query.isError ? errMsg(query.error) : null;

  const [description, setDescription] = useState('');

  const addMutation = useMutation({
    mutationFn: () => patientsApi.createActiveProblem(patientId, { description }),
    onSuccess: () => {
      setDescription('');
      toast.success('Problema adicionado.');
      return queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'active-problems'] });
    },
    onError: (err) => toast.error(errMsg(err, 'Falha ao adicionar problema.')),
  });

  const onAdd = (e: FormEvent): void => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Descrição é obrigatória.');
      return;
    }
    addMutation.mutate();
  };

  return (
    <section aria-labelledby="problems-heading">
      <h2 id="problems-heading">Problemas / condições ativas</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando problemas…</p>}
      {items !== null && items.length === 0 && <EmptyState title="Nenhum problema ativo registrado" />}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((p: PatientActiveProblem) => (
            <li key={p.id}>
              {p.description} ({p.status})
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)}>
        <label htmlFor="problem-description">Descrição</label>
        <input
          id="problem-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" className="mt-4" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Adicionando…' : 'Adicionar problema'}
        </Button>
      </form>
    </section>
  );
};
