/**
 * Cadastro de paciente (Doc 1 §11; PAT-001..006).
 *
 * Validação de CPF/CNS NÃO é reimplementada aqui — a mesma regra já existe
 * em `packages/domain/src/patient/identifiers.ts` e é aplicada pela API
 * (Etapa 2/6); o frontend apenas exibe a mensagem que a API retorna,
 * evitando duas fontes de verdade para a mesma regra (Doc 2 §31).
 */

import { useState, type FormEvent } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createPatientsApi,
  parseDuplicateMatches,
  type Patient,
  type PatientSex,
} from '../lib/patients-api.js';
import { DuplicateWarning } from '../components/DuplicateWarning.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';

interface FormFields {
  fullName: string;
  socialName: string;
  motherName: string;
  birthDate: string;
  sex: PatientSex | '';
  cpf: string;
  cns: string;
  rg: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

const emptyForm: FormFields = {
  fullName: '',
  socialName: '',
  motherName: '',
  birthDate: '',
  sex: '',
  cpf: '',
  cns: '',
  rg: '',
  phone: '',
  address: '',
  city: '',
  state: '',
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;

type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'duplicate'; readonly matches: ReturnType<typeof parseDuplicateMatches> }
  | { readonly kind: 'success'; readonly patient: Patient }
  | { readonly kind: 'denied'; readonly reason: 'unauthenticated' | 'forbidden' }
  | { readonly kind: 'error'; readonly message: string };

export const PatientRegisterPage = (): JSX.Element => {
  const { api } = useSession();
  const patientsApi = createPatientsApi(api);

  const [form, setForm] = useState<FormFields>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const setField = <K extends keyof FormFields>(field: K, value: FormFields[K]): void => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const buildInput = (confirmDuplicate: boolean) => ({
    fullName: form.fullName.trim(),
    socialName: form.socialName || null,
    motherName: form.motherName || null,
    birthDate: form.birthDate || null,
    sex: form.sex || null,
    cpf: form.cpf || null,
    cns: form.cns || null,
    rg: form.rg || null,
    phone: form.phone || null,
    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    ...(confirmDuplicate ? { confirmDuplicate: true } : {}),
  });

  const submit = async (confirmDuplicate: boolean): Promise<void> => {
    setState({ kind: 'submitting' });
    try {
      const patient = await patientsApi.create(buildInput(confirmDuplicate));
      setState({ kind: 'success', patient });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setState({ kind: 'error', message: 'Falha ao cadastrar paciente.' });
        return;
      }
      if (err.status === 401) {
        setState({ kind: 'denied', reason: 'unauthenticated' });
        return;
      }
      if (err.status === 403) {
        setState({ kind: 'denied', reason: 'forbidden' });
        return;
      }
      if (err.code === 'PATIENT_DUPLICATE_NOT_CONFIRMED') {
        setState({ kind: 'duplicate', matches: parseDuplicateMatches(err.details) });
        return;
      }
      if (err.code === 'PATIENT_INVALID_CPF') {
        setFieldErrors((f) => ({ ...f, cpf: 'CPF inválido.' }));
        setState({ kind: 'idle' });
        return;
      }
      if (err.code === 'PATIENT_INVALID_CNS') {
        setFieldErrors((f) => ({ ...f, cns: 'CNS inválido.' }));
        setState({ kind: 'idle' });
        return;
      }
      setState({ kind: 'error', message: err.message });
    }
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setFieldErrors({});
    if (!form.fullName.trim()) {
      setFieldErrors({ fullName: 'Nome completo é obrigatório.' });
      return;
    }
    void submit(false);
  };

  if (state.kind === 'denied') return <AccessDeniedPage reason={state.reason} />;

  if (state.kind === 'success') {
    return (
      <main aria-labelledby="patient-register-heading">
        <h1 id="patient-register-heading">Cadastro de paciente</h1>
        <p role="status">
          Paciente cadastrado com sucesso. Prontuário {state.patient.medicalRecordNumber}.
        </p>
        <p>
          <a href={`#/pacientes/${state.patient.id}`}>Abrir prontuário</a>
        </p>
        <button type="button" onClick={() => { setForm(emptyForm); setState({ kind: 'idle' }); }}>
          Cadastrar outro paciente
        </button>
      </main>
    );
  }

  return (
    <main aria-labelledby="patient-register-heading">
      <h1 id="patient-register-heading">Cadastro de paciente</h1>

      {state.kind === 'duplicate' && (
        <DuplicateWarning
          matches={state.matches}
          confirming={false}
          onConfirm={() => void submit(true)}
          onCancel={() => setState({ kind: 'idle' })}
        />
      )}

      {state.kind !== 'duplicate' && (
        <form onSubmit={onSubmit}>
          <label htmlFor="fullName">Nome completo *</label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setField('fullName', e.target.value)}
          />
          {fieldErrors.fullName && <p role="alert">{fieldErrors.fullName}</p>}

          <label htmlFor="socialName">Nome social</label>
          <input
            id="socialName"
            value={form.socialName}
            onChange={(e) => setField('socialName', e.target.value)}
          />

          <label htmlFor="motherName">Nome da mãe</label>
          <input
            id="motherName"
            value={form.motherName}
            onChange={(e) => setField('motherName', e.target.value)}
          />

          <label htmlFor="birthDate">Data de nascimento</label>
          <input
            id="birthDate"
            type="date"
            value={form.birthDate}
            onChange={(e) => setField('birthDate', e.target.value)}
          />

          <label htmlFor="sex">Sexo</label>
          <select id="sex" value={form.sex} onChange={(e) => setField('sex', e.target.value as PatientSex | '')}>
            <option value="">Não informado</option>
            <option value="female">Feminino</option>
            <option value="male">Masculino</option>
            <option value="undetermined">Indeterminado</option>
          </select>

          <label htmlFor="cpf">CPF</label>
          <input id="cpf" value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} />
          {fieldErrors.cpf && <p role="alert">{fieldErrors.cpf}</p>}

          <label htmlFor="cns">CNS</label>
          <input id="cns" value={form.cns} onChange={(e) => setField('cns', e.target.value)} />
          {fieldErrors.cns && <p role="alert">{fieldErrors.cns}</p>}

          <label htmlFor="rg">RG</label>
          <input id="rg" value={form.rg} onChange={(e) => setField('rg', e.target.value)} />

          <label htmlFor="phone">Telefone</label>
          <input id="phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />

          <label htmlFor="address">Endereço</label>
          <input id="address" value={form.address} onChange={(e) => setField('address', e.target.value)} />

          <label htmlFor="city">Município</label>
          <input id="city" value={form.city} onChange={(e) => setField('city', e.target.value)} />

          <label htmlFor="state">Estado</label>
          <input id="state" value={form.state} onChange={(e) => setField('state', e.target.value)} />

          <button type="submit" disabled={state.kind === 'submitting'}>
            {state.kind === 'submitting' ? 'Cadastrando…' : 'Cadastrar paciente'}
          </button>

          {state.kind === 'error' && <p role="alert">{state.message}</p>}
        </form>
      )}
    </main>
  );
};
