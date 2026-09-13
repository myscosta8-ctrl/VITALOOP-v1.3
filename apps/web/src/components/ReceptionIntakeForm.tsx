import React, { useState } from 'react';
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
import {
  createEncountersApi,
  type Encounter,
  type EncounterOrigin,
  type EncounterType,
} from '../lib/encounters-api.js';
import { DuplicateWarning } from './DuplicateWarning.js';
import { Button } from './ui/button.js';

interface ReceptionIntakeFormProps {
  onSuccess?: (encounter: Encounter) => void;
}

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

interface RegisterFormFields {
  fullName: string;
  motherName: string;
  fatherName: string;
  birthDate: string;
  sex: PatientSex | '';
  birthCity: string;
  cpf: string;
  cns: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  raceColor: PatientRaceColor | '';
  religion: string;
  educationLevel: PatientEducationLevel | '';
}

const emptyRegisterForm: RegisterFormFields = {
  fullName: '', motherName: '', fatherName: '', birthDate: '', sex: '', birthCity: '',
  cpf: '', cns: '', phone: '', address: '', city: '', state: '', raceColor: '', religion: '', educationLevel: '',
};

type Step = 'search' | 'register' | 'encounter';

/**
 * Recepção completa (Fase pós-plano, 13/09/2026) — reconstrução a partir de
 * achado de auditoria: o formulário anterior ("Nova Recepção") só pedia o
 * UUID do paciente colado à mão + queixa principal (dado clínico de
 * triagem, não de recepção). Este componente é o fluxo real: busca paciente
 * já cadastrado (nome/CPF/CNS) ou cadastra um novo com os dados demográficos
 * completos, e só então abre o atendimento — reaproveita
 * `patients-api.ts`/`encounters-api.ts` e `DuplicateWarning.tsx` já
 * existentes, sem duplicar a lógica de detecção de duplicidade que já roda
 * no cadastro de paciente "oficial" (`PatientRegisterPage.tsx`).
 */
export const ReceptionIntakeForm: React.FC<ReceptionIntakeFormProps> = ({ onSuccess }) => {
  const { api } = useSession();
  const patientsApi = createPatientsApi(api);
  const encountersApi = createEncountersApi(api);

  const [step, setStep] = useState<Step>('search');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- Etapa 1: busca de paciente já cadastrado ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<readonly Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setErrorMessage(null);
    try {
      const isCpf = /^\d{11}$/.test(searchQuery.replace(/\D/g, ''));
      const results = await patientsApi.search(
        isCpf ? { cpf: searchQuery } : { name: searchQuery },
      );
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao buscar paciente.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setStep('encounter');
  };

  // --- Etapa 2 (se paciente não existe): cadastro completo ---
  const [registerForm, setRegisterForm] = useState<RegisterFormFields>(emptyRegisterForm);
  const [duplicateMatches, setDuplicateMatches] = useState<ReturnType<typeof parseDuplicateMatches> | null>(null);

  const setRegisterField = <K extends keyof RegisterFormFields>(field: K, value: RegisterFormFields[K]) => {
    setRegisterForm((f) => ({ ...f, [field]: value }));
  };

  const submitRegister = async (confirmDuplicate: boolean) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const patient = await patientsApi.create({
        fullName: registerForm.fullName.trim(),
        motherName: registerForm.motherName || null,
        fatherName: registerForm.fatherName || null,
        birthDate: registerForm.birthDate || null,
        birthCity: registerForm.birthCity || null,
        sex: registerForm.sex || null,
        cpf: registerForm.cpf || null,
        cns: registerForm.cns || null,
        phone: registerForm.phone || null,
        address: registerForm.address || null,
        city: registerForm.city || null,
        state: registerForm.state || null,
        raceColor: registerForm.raceColor || null,
        religion: registerForm.religion || null,
        educationLevel: registerForm.educationLevel || null,
        ...(confirmDuplicate ? { confirmDuplicate: true } : {}),
      });
      setSelectedPatient(patient);
      setDuplicateMatches(null);
      setStep('encounter');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PATIENT_DUPLICATE_NOT_CONFIRMED') {
        setDuplicateMatches(parseDuplicateMatches(err.details));
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao cadastrar paciente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.fullName.trim()) {
      setErrorMessage('Nome completo é obrigatório.');
      return;
    }
    void submitRegister(false);
  };

  // --- Etapa 3: abertura do atendimento (dados administrativos, sem queixa clínica detalhada) ---
  const [encounterType, setEncounterType] = useState<EncounterType>('urgency');
  const [origin, setOrigin] = useState<EncounterOrigin>('spontaneous');
  const [visitReason, setVisitReason] = useState('');

  const handleOpenEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await encountersApi.createEncounter({
        patientId: selectedPatient.id,
        encounterType,
        origin,
        chiefComplaint: visitReason.trim(),
      });
      if (onSuccess) onSuccess(created);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao abrir atendimento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {errorMessage && (
        <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}

      {step === 'search' && (
        <div>
          <h4 style={{ marginTop: 0 }}>1. Identificar o Paciente</h4>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou CPF"
              style={{ flex: 1, padding: 8 }}
            />
            <Button type="submit" disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</Button>
          </form>

          {searchResults.length > 0 && (
            <div style={{ marginBottom: 15 }}>
              {searchResults.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>{p.fullName}</strong>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Prontuário {p.medicalRecordNumber}{p.birthDate ? ` — Nasc. ${new Date(p.birthDate).toLocaleDateString('pt-BR')}` : ''}
                    </div>
                  </div>
                  <Button type="button" size="sm" onClick={() => handleSelectPatient(p)}>Usar este paciente</Button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="secondary" onClick={() => setStep('register')}>
            Paciente não encontrado — Cadastrar Novo Paciente
          </Button>
        </div>
      )}

      {step === 'register' && (
        <div>
          <h4 style={{ marginTop: 0 }}>1. Cadastro do Paciente</h4>

          {duplicateMatches && duplicateMatches.length > 0 ? (
            <DuplicateWarning
              matches={duplicateMatches}
              confirming={submitting}
              onConfirm={() => submitRegister(true)}
              onCancel={() => setDuplicateMatches(null)}
            />
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Nome Completo *</label>
                <input type="text" value={registerForm.fullName} onChange={(e) => setRegisterField('fullName', e.target.value)} style={{ width: '100%', padding: 8 }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Nome da Mãe</label>
                <input type="text" value={registerForm.motherName} onChange={(e) => setRegisterField('motherName', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Nome do Pai</label>
                <input type="text" value={registerForm.fatherName} onChange={(e) => setRegisterField('fatherName', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Data de Nascimento</label>
                <input type="date" value={registerForm.birthDate} onChange={(e) => setRegisterField('birthDate', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Sexo</label>
                <select value={registerForm.sex} onChange={(e) => setRegisterField('sex', e.target.value as PatientSex | '')} style={{ width: '100%', padding: 8 }}>
                  <option value="">Não informado</option>
                  <option value="female">Feminino</option>
                  <option value="male">Masculino</option>
                  <option value="undetermined">Indeterminado</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Cidade de Origem (Naturalidade)</label>
                <input type="text" value={registerForm.birthCity} onChange={(e) => setRegisterField('birthCity', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>CPF</label>
                <input type="text" value={registerForm.cpf} onChange={(e) => setRegisterField('cpf', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Cartão SUS (CNS)</label>
                <input type="text" value={registerForm.cns} onChange={(e) => setRegisterField('cns', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Telefone</label>
                <input type="text" value={registerForm.phone} onChange={(e) => setRegisterField('phone', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Endereço</label>
                <input type="text" value={registerForm.address} onChange={(e) => setRegisterField('address', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Município (Residência)</label>
                <input type="text" value={registerForm.city} onChange={(e) => setRegisterField('city', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Estado</label>
                <input type="text" value={registerForm.state} onChange={(e) => setRegisterField('state', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Cor/Raça</label>
                <select value={registerForm.raceColor} onChange={(e) => setRegisterField('raceColor', e.target.value as PatientRaceColor | '')} style={{ width: '100%', padding: 8 }}>
                  <option value="">Não informado</option>
                  {RACE_COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Religião</label>
                <input type="text" value={registerForm.religion} onChange={(e) => setRegisterField('religion', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Escolaridade</label>
                <select value={registerForm.educationLevel} onChange={(e) => setRegisterField('educationLevel', e.target.value as PatientEducationLevel | '')} style={{ width: '100%', padding: 8 }}>
                  <option value="">Não informado</option>
                  {EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={() => setStep('search')}>Voltar para busca</Button>
                <Button type="submit" disabled={submitting}>{submitting ? 'Cadastrando…' : 'Cadastrar e Continuar'}</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === 'encounter' && selectedPatient && (
        <div>
          <h4 style={{ marginTop: 0 }}>2. Abertura do Atendimento</h4>
          <p style={{ fontSize: 13, color: '#475569' }}>
            Paciente: <strong>{selectedPatient.fullName}</strong> (Prontuário {selectedPatient.medicalRecordNumber})
          </p>

          <form onSubmit={handleOpenEncounter}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Tipo de Atendimento *</label>
                <select value={encounterType} onChange={(e) => setEncounterType(e.target.value as EncounterType)} style={{ width: '100%', padding: 8 }}>
                  <option value="urgency">Urgência</option>
                  <option value="emergency">Emergência</option>
                  <option value="elective">Eletivo / Consulta</option>
                  <option value="return">Retorno</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Origem da Chegada *</label>
                <select value={origin} onChange={(e) => setOrigin(e.target.value as EncounterOrigin)} style={{ width: '100%', padding: 8 }}>
                  <option value="spontaneous">Demanda Espontânea</option>
                  <option value="samu">SAMU</option>
                  <option value="transfer">Transferência Inter-hospitalar</option>
                  <option value="rescue_other">Resgate / Outros</option>
                </select>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Motivo da Visita (breve) *</label>
            <textarea
              rows={2}
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              placeholder="Ex.: dor abdominal, febre, trauma — detalhamento clínico completo fica com a Triagem"
              style={{ width: '100%', padding: 8, marginBottom: 12 }}
              required
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => { setSelectedPatient(null); setStep('search'); }}>
                Trocar paciente
              </Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Abrindo…' : 'Abrir Atendimento'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
