/**
 * Identificação/base do prontuário + dados complementares (Doc 1 §12; PAT-007..013).
 *
 * Cabeçalho segue exatamente os itens previstos no Doc 1 §12 (nome, nome
 * social, prontuário, CPF/CNS, nascimento, sexo, mãe, status) — nenhum campo
 * além do especificado. Cada subseção (contatos/alergias/antecedentes/
 * medicamentos/problemas) usa os endpoints reais da Etapa 2/6, sem repetir
 * validações já feitas pelo domínio/API.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createPatientsApi,
  type AllergySeverity,
  type AllergyStatus,
  type Patient,
  type PatientActiveProblem,
  type PatientAllergy,
  type PatientAntecedent,
  type PatientContact,
  type PatientContinuousMedication,
  type PatientTimelineEvent,
} from '../lib/patients-api.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';

type PageState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly patient: Patient }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'denied'; readonly reason: 'unauthenticated' | 'forbidden' }
  | { readonly kind: 'error'; readonly message: string };

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
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    patientsApi
      .get(patientId)
      .then((patient) => {
        if (!cancelled) setState({ kind: 'loaded', patient });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not_found' });
        } else if (err instanceof ApiError && err.status === 401) {
          setState({ kind: 'denied', reason: 'unauthenticated' });
        } else if (err instanceof ApiError && err.status === 403) {
          setState({ kind: 'denied', reason: 'forbidden' });
        } else {
          setState({
            kind: 'error',
            message: err instanceof ApiError ? err.message : 'Falha ao carregar paciente.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, reloadToken]);

  if (state.kind === 'loading') return <p role="status">Carregando…</p>;
  if (state.kind === 'not_found') return <p role="alert">Paciente não encontrado.</p>;
  if (state.kind === 'denied') return <AccessDeniedPage reason={state.reason} />;
  if (state.kind === 'error') return <p role="alert">{state.message}</p>;

  const { patient } = state;

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
          onInactivated={() => setReloadToken((t) => t + 1)}
        />
      )}

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Motivo é obrigatório para inativar o paciente.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patientsApi.inactivate(patientId, reason);
      onInactivated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao inativar paciente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="inactivate-heading">
      <h2 id="inactivate-heading">Inativar cadastro</h2>
      <form onSubmit={(e) => void onSubmit(e)}>
        <label htmlFor="inactivate-reason">Motivo</label>
        <input id="inactivate-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit" disabled={saving}>
          {saving ? 'Inativando…' : 'Inativar paciente'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
};

const TimelineSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const { items, error } = useList(() => patientsApi.getTimeline(patientId));

  return (
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">Histórico</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando histórico…</p>}
      {items !== null && items.length === 0 && <p role="status">Nenhum evento registrado ainda.</p>}
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

const useList = <T,>(loader: () => Promise<readonly T[]>) => {
  const [items, setItems] = useState<readonly T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = (): void => {
    setItems(null);
    loader()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Falha ao carregar.'));
  };
  useEffect(reload, []);
  return { items, error, reload };
};

const ContactsSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const { items, error, reload } = useList(() => patientsApi.listContacts(patientId));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onAdd = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormError('Nome e telefone são obrigatórios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await patientsApi.createContact(patientId, { name, phone, isEmergency });
      setName('');
      setPhone('');
      setIsEmergency(false);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao adicionar contato.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="contacts-heading">
      <h2 id="contacts-heading">Contatos</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando contatos…</p>}
      {items !== null && items.length === 0 && <p role="status">Nenhum contato cadastrado.</p>}
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
        <button type="submit" disabled={saving}>
          {saving ? 'Adicionando…' : 'Adicionar contato'}
        </button>
        {formError && <p role="alert">{formError}</p>}
      </form>
    </section>
  );
};

const AllergiesSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const { items, error, reload } = useList(() => patientsApi.listAllergies(patientId));
  const [substance, setSubstance] = useState('');
  const [severity, setSeverity] = useState<AllergySeverity>('unknown');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onAdd = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!substance.trim()) {
      setFormError('Substância é obrigatória.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await patientsApi.createAllergy(patientId, { substance, severity });
      setSubstance('');
      setSeverity('unknown');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao adicionar alergia.');
    } finally {
      setSaving(false);
    }
  };

  const onStatusChange = async (allergyId: string, status: AllergyStatus): Promise<void> => {
    try {
      await patientsApi.updateAllergyStatus(patientId, allergyId, status);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao atualizar status.');
    }
  };

  return (
    <section aria-labelledby="allergies-heading">
      <h2 id="allergies-heading">Alergias</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando alergias…</p>}
      {items !== null && items.length === 0 && <p role="status">Nenhuma alergia registrada.</p>}
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
        <button type="submit" disabled={saving}>
          {saving ? 'Adicionando…' : 'Adicionar alergia'}
        </button>
        {formError && <p role="alert">{formError}</p>}
      </form>
    </section>
  );
};

const AntecedentsSection = ({ patientId, patientsApi }: { patientId: string; patientsApi: Api }): JSX.Element => {
  const { items, error, reload } = useList(() => patientsApi.listAntecedents(patientId));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onAdd = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Descrição é obrigatória.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await patientsApi.createAntecedent(patientId, { description });
      setDescription('');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao adicionar antecedente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="antecedents-heading">
      <h2 id="antecedents-heading">Antecedentes</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando antecedentes…</p>}
      {items !== null && items.length === 0 && <p role="status">Nenhum antecedente registrado.</p>}
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
        <button type="submit" disabled={saving}>
          {saving ? 'Adicionando…' : 'Adicionar antecedente'}
        </button>
        {formError && <p role="alert">{formError}</p>}
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
  const { items, error, reload } = useList(() => patientsApi.listContinuousMedications(patientId));
  const [medication, setMedication] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onAdd = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!medication.trim()) {
      setFormError('Medicamento é obrigatório.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await patientsApi.createContinuousMedication(patientId, { medication });
      setMedication('');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao adicionar medicamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="medications-heading">
      <h2 id="medications-heading">Medicamentos de uso contínuo</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando medicamentos…</p>}
      {items !== null && items.length === 0 && <p role="status">Nenhum medicamento registrado.</p>}
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
        <button type="submit" disabled={saving}>
          {saving ? 'Adicionando…' : 'Adicionar medicamento'}
        </button>
        {formError && <p role="alert">{formError}</p>}
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
  const { items, error, reload } = useList(() => patientsApi.listActiveProblems(patientId));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onAdd = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Descrição é obrigatória.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await patientsApi.createActiveProblem(patientId, { description });
      setDescription('');
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao adicionar problema.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="problems-heading">
      <h2 id="problems-heading">Problemas / condições ativas</h2>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p role="status">Carregando problemas…</p>}
      {items !== null && items.length === 0 && <p role="status">Nenhum problema ativo registrado.</p>}
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
        <button type="submit" disabled={saving}>
          {saving ? 'Adicionando…' : 'Adicionar problema'}
        </button>
        {formError && <p role="alert">{formError}</p>}
      </form>
    </section>
  );
};
