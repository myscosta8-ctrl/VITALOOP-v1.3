/**
 * Cadastro de paciente (Doc 1 §11; PAT-001..006).
 *
 * Validação de CPF/CNS NÃO é reimplementada aqui — a mesma regra já existe
 * em `packages/domain/src/patient/identifiers.ts` e é aplicada pela API
 * (Etapa 2/6); o frontend apenas exibe a mensagem que a API retorna,
 * evitando duas fontes de verdade para a mesma regra (Doc 2 §31).
 */

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createPatientsApi,
  parseDuplicateMatches,
  type Patient,
  type PatientEducationLevel,
  type PatientRaceColor,
  type PatientSex,
} from '../lib/patients-api.js';
import { DuplicateWarning } from '../components/DuplicateWarning.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';
import { Button } from '../components/ui/button.js';

interface FormFields {
  fullName: string;
  socialName: string;
  motherName: string;
  fatherName: string;
  birthDate: string;
  birthCity: string;
  sex: PatientSex | '';
  cpf: string;
  cns: string;
  rg: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  raceColor: PatientRaceColor | '';
  religion: string;
  educationLevel: PatientEducationLevel | '';
}

const emptyForm: FormFields = {
  fullName: '',
  socialName: '',
  motherName: '',
  fatherName: '',
  birthDate: '',
  birthCity: '',
  sex: '',
  cpf: '',
  cns: '',
  rg: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  raceColor: '',
  religion: '',
  educationLevel: '',
};

const RACE_COLOR_OPTIONS: ReadonlyArray<{ value: PatientRaceColor; label: string }> = [
  { value: 'branca', label: 'Branca' },
  { value: 'preta', label: 'Preta' },
  { value: 'parda', label: 'Parda' },
  { value: 'amarela', label: 'Amarela' },
  { value: 'indigena', label: 'Indígena' },
  { value: 'nao_informado', label: 'Não informado' },
];

const EDUCATION_OPTIONS: ReadonlyArray<{ value: PatientEducationLevel; label: string }> = [
  { value: 'nao_alfabetizado', label: 'Não alfabetizado' },
  { value: 'fundamental_incompleto', label: 'Fundamental incompleto' },
  { value: 'fundamental_completo', label: 'Fundamental completo' },
  { value: 'medio_incompleto', label: 'Médio incompleto' },
  { value: 'medio_completo', label: 'Médio completo' },
  { value: 'superior_incompleto', label: 'Superior incompleto' },
  { value: 'superior_completo', label: 'Superior completo' },
  { value: 'pos_graduacao', label: 'Pós-graduação' },
  { value: 'nao_informado', label: 'Não informado' },
];

type FieldErrors = Partial<Record<keyof FormFields, string>>;

type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'duplicate'; readonly matches: ReturnType<typeof parseDuplicateMatches> }
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
    fatherName: form.fatherName || null,
    birthDate: form.birthDate || null,
    birthCity: form.birthCity || null,
    sex: form.sex || null,
    cpf: form.cpf || null,
    cns: form.cns || null,
    rg: form.rg || null,
    phone: form.phone || null,
    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    raceColor: form.raceColor || null,
    religion: form.religion || null,
    educationLevel: form.educationLevel || null,
    ...(confirmDuplicate ? { confirmDuplicate: true } : {}),
  });

  const createMutation = useMutation({
    mutationFn: (confirmDuplicate: boolean) => patientsApi.create(buildInput(confirmDuplicate)),
    onSuccess: () => setState({ kind: 'idle' }),
    onError: (err) => {
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
    },
  });

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setFieldErrors({});
    if (!form.fullName.trim()) {
      setFieldErrors({ fullName: 'Nome completo é obrigatório.' });
      return;
    }
    createMutation.mutate(false);
  };

  if (state.kind === 'denied') return <AccessDeniedPage reason={state.reason} />;

  if (createMutation.isSuccess) {
    const patient: Patient = createMutation.data;
    return (
      <main aria-labelledby="patient-register-heading">
        <h1 id="patient-register-heading">Cadastro de paciente</h1>
        <p role="status">
          Paciente cadastrado com sucesso. Prontuário {patient.medicalRecordNumber}.
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="secondary">
            <a href={`#/pacientes/${patient.id}`}>Abrir prontuário</a>
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setForm(emptyForm); createMutation.reset(); }}>
            Cadastrar outro paciente
          </Button>
        </div>
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
          onConfirm={() => createMutation.mutate(true)}
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

          <label htmlFor="fatherName">Nome do pai</label>
          <input
            id="fatherName"
            value={form.fatherName}
            onChange={(e) => setField('fatherName', e.target.value)}
          />

          <label htmlFor="birthDate">Data de nascimento</label>
          <input
            id="birthDate"
            type="date"
            value={form.birthDate}
            onChange={(e) => setField('birthDate', e.target.value)}
          />

          <label htmlFor="birthCity">Cidade de origem (naturalidade)</label>
          <input
            id="birthCity"
            value={form.birthCity}
            onChange={(e) => setField('birthCity', e.target.value)}
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

          <label htmlFor="raceColor">Cor/Raça</label>
          <select
            id="raceColor"
            value={form.raceColor}
            onChange={(e) => setField('raceColor', e.target.value as PatientRaceColor | '')}
          >
            <option value="">Não informado</option>
            {RACE_COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <label htmlFor="religion">Religião</label>
          <input id="religion" value={form.religion} onChange={(e) => setField('religion', e.target.value)} />

          <label htmlFor="educationLevel">Escolaridade</label>
          <select
            id="educationLevel"
            value={form.educationLevel}
            onChange={(e) => setField('educationLevel', e.target.value as PatientEducationLevel | '')}
          >
            <option value="">Não informado</option>
            {EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <Button type="submit" className="mt-4" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Cadastrando…' : 'Cadastrar paciente'}
          </Button>

          {state.kind === 'error' && <p role="alert">{state.message}</p>}
        </form>
      )}
    </main>
  );
};
