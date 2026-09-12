/**
 * Backend fictício usado SOMENTE pelo Modo de Demonstração (ver
 * session-context.tsx `loginDemo`). Antes, o Modo Demonstração fingia o
 * login mas toda chamada real de API caía no backend de verdade e voltava
 * 401 (sem token real) — todas as telas mostravam "Autenticação
 * necessária.". Este módulo simula respostas com dados fictícios em
 * memória, no mesmo formato do `ApiClient` real, para as telas de maior
 * uso em teste manual (filas, leitos, pacientes, atendimentos, escala e
 * gerenciamento de profissionais).
 */
import { ApiError, type ApiClient } from './api-client.js';
import type { BedData, BedSectorData, SectorMapData } from './bed-api.js';
import type { Queue, QueueTicket } from './queues-api.js';
import type { Patient } from './patients-api.js';
import type { Encounter } from './encounters-api.js';
import type { StaffShift, StaffUser } from './staff-schedule-api.js';
import type { StaffAccount, StaffRole, StaffSector } from './staff-accounts-api.js';

const now = () => new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

// ---- Setores e leitos fictícios --------------------------------------

interface MutableBed extends BedData {}

const sectors: BedSectorData[] = [
  { id: 'sec-vermelha', name: 'Sala Vermelha', code: 'SV', description: 'Emergência / risco iminente de morte', capacity: 4, createdAt: now() },
  { id: 'sec-obs-adulto', name: 'Observação Adulto', code: 'OA', description: 'Observação clínica adulto', capacity: 6, createdAt: now() },
  { id: 'sec-obs-pedi', name: 'Observação Pediátrica', code: 'OP', description: 'Observação clínica pediátrica', capacity: 4, createdAt: now() },
  { id: 'sec-internacao', name: 'Internação Adulto', code: 'IA', description: 'Aguardando regulação/leito hospitalar', capacity: 5, createdAt: now() },
];

const beds: MutableBed[] = [
  { id: 'bed-sv-01', sectorId: 'sec-vermelha', sectorName: 'Sala Vermelha', bedNumber: 'SV-01', status: 'occupied', isExtra: false, isIsolation: false, allocationId: 'aloc-1', encounterId: 'enc-1', patientId: 'pac-1', patientName: 'José Ricardo Almeida (fictício)', allocatedAt: hoursAgo(2), stayHours: 2, is24hLimitExceeded: false },
  { id: 'bed-sv-02', sectorId: 'sec-vermelha', sectorName: 'Sala Vermelha', bedNumber: 'SV-02', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-sv-03', sectorId: 'sec-vermelha', sectorName: 'Sala Vermelha', bedNumber: 'SV-03', status: 'cleaning', isExtra: false, isIsolation: false },
  { id: 'bed-sv-04', sectorId: 'sec-vermelha', sectorName: 'Sala Vermelha', bedNumber: 'SV-04', status: 'blocked', isExtra: false, isIsolation: false },

  { id: 'bed-oa-01', sectorId: 'sec-obs-adulto', sectorName: 'Observação Adulto', bedNumber: 'OA-01', status: 'occupied', isExtra: false, isIsolation: false, allocationId: 'aloc-2', encounterId: 'enc-2', patientId: 'pac-2', patientName: 'Maria da Conceição Souza (fictícia)', allocatedAt: hoursAgo(26), stayHours: 26, is24hLimitExceeded: true },
  { id: 'bed-oa-02', sectorId: 'sec-obs-adulto', sectorName: 'Observação Adulto', bedNumber: 'OA-02', status: 'occupied', isExtra: false, isIsolation: true, allocationId: 'aloc-3', encounterId: 'enc-3', patientId: 'pac-3', patientName: 'Antônio Carlos Ferreira (fictício)', allocatedAt: hoursAgo(5), stayHours: 5, is24hLimitExceeded: false },
  { id: 'bed-oa-03', sectorId: 'sec-obs-adulto', sectorName: 'Observação Adulto', bedNumber: 'OA-03', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-oa-04', sectorId: 'sec-obs-adulto', sectorName: 'Observação Adulto', bedNumber: 'OA-04', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-oa-05', sectorId: 'sec-obs-adulto', sectorName: 'Observação Adulto', bedNumber: 'OA-05', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-oa-06', sectorId: 'sec-obs-adulto', sectorName: 'Observação Adulto', bedNumber: 'OA-06', status: 'available', isExtra: false, isIsolation: false },

  { id: 'bed-op-01', sectorId: 'sec-obs-pedi', sectorName: 'Observação Pediátrica', bedNumber: 'OP-01', status: 'occupied', isExtra: false, isIsolation: false, allocationId: 'aloc-4', encounterId: 'enc-4', patientId: 'pac-4', patientName: 'Sofia Beatriz Lima (fictícia, 6 anos)', allocatedAt: hoursAgo(3), stayHours: 3, is24hLimitExceeded: false },
  { id: 'bed-op-02', sectorId: 'sec-obs-pedi', sectorName: 'Observação Pediátrica', bedNumber: 'OP-02', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-op-03', sectorId: 'sec-obs-pedi', sectorName: 'Observação Pediátrica', bedNumber: 'OP-03', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-op-04', sectorId: 'sec-obs-pedi', sectorName: 'Observação Pediátrica', bedNumber: 'OP-04', status: 'available', isExtra: false, isIsolation: false },

  { id: 'bed-ia-01', sectorId: 'sec-internacao', sectorName: 'Internação Adulto', bedNumber: 'IA-01', status: 'occupied', isExtra: false, isIsolation: false, allocationId: 'aloc-5', encounterId: 'enc-5', patientId: 'pac-5', patientName: 'Francisco das Chagas Pereira (fictício)', allocatedAt: hoursAgo(30), stayHours: 30, is24hLimitExceeded: true },
  { id: 'bed-ia-02', sectorId: 'sec-internacao', sectorName: 'Internação Adulto', bedNumber: 'IA-02', status: 'reserved', isExtra: false, isIsolation: false },
  { id: 'bed-ia-03', sectorId: 'sec-internacao', sectorName: 'Internação Adulto', bedNumber: 'IA-03', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-ia-04', sectorId: 'sec-internacao', sectorName: 'Internação Adulto', bedNumber: 'IA-04', status: 'available', isExtra: false, isIsolation: false },
  { id: 'bed-ia-05', sectorId: 'sec-internacao', sectorName: 'Internação Adulto', bedNumber: 'IA-05', status: 'available', isExtra: false, isIsolation: false },
];

const bedsMetrics = (sectorId: string) => {
  const sectorBeds = beds.filter((b) => b.sectorId === sectorId);
  const totalBeds = sectorBeds.length;
  const occupiedBeds = sectorBeds.filter((b) => b.status === 'occupied').length;
  const availableBeds = sectorBeds.filter((b) => b.status === 'available').length;
  const cleaningBeds = sectorBeds.filter((b) => b.status === 'cleaning').length;
  return {
    totalBeds,
    occupiedBeds,
    availableBeds,
    cleaningBeds,
    occupancyRatePercentage: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
};

const buildBedsMap = (): SectorMapData[] =>
  sectors.map((sector) => ({
    sector,
    beds: beds.filter((b) => b.sectorId === sector.id),
    metrics: bedsMetrics(sector.id),
  }));

// ---- Pacientes fictícios ------------------------------------------------

const patients: Patient[] = [
  { id: 'pac-1', medicalRecordNumber: '000101', fullName: 'José Ricardo Almeida (fictício)', socialName: null, motherName: 'Maria Almeida (fictícia)', birthDate: '1978-04-12', sex: 'male', cpf: '111.111.111-11', cns: '111111111110001', rg: null, phone: '(99) 99999-0001', address: 'Rua Fictícia, 100', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(48), updatedAt: hoursAgo(2) },
  { id: 'pac-2', medicalRecordNumber: '000102', fullName: 'Maria da Conceição Souza (fictícia)', socialName: null, motherName: 'Ana Souza (fictícia)', birthDate: '1955-09-30', sex: 'female', cpf: '222.222.222-22', cns: '222222222220002', rg: null, phone: '(99) 99999-0002', address: 'Av. Exemplo, 200', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(72), updatedAt: hoursAgo(26) },
  { id: 'pac-3', medicalRecordNumber: '000103', fullName: 'Antônio Carlos Ferreira (fictício)', socialName: null, motherName: 'Joana Ferreira (fictícia)', birthDate: '1990-01-20', sex: 'male', cpf: '333.333.333-33', cns: '333333333330003', rg: null, phone: '(99) 99999-0003', address: 'Rua Teste, 300', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(20), updatedAt: hoursAgo(5) },
  { id: 'pac-4', medicalRecordNumber: '000104', fullName: 'Sofia Beatriz Lima (fictícia)', socialName: null, motherName: 'Camila Lima (fictícia)', birthDate: '2019-06-02', sex: 'female', cpf: null, cns: '444444444440004', rg: null, phone: '(99) 99999-0004', address: 'Rua Amostra, 400', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(10), updatedAt: hoursAgo(3) },
  { id: 'pac-5', medicalRecordNumber: '000105', fullName: 'Francisco das Chagas Pereira (fictício)', socialName: null, motherName: 'Rita Pereira (fictícia)', birthDate: '1948-11-15', sex: 'male', cpf: '555.555.555-55', cns: '555555555550005', rg: null, phone: '(99) 99999-0005', address: 'Rua Modelo, 500', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(90), updatedAt: hoursAgo(30) },
  { id: 'pac-6', medicalRecordNumber: '000106', fullName: 'Luciana Aparecida Rodrigues (fictícia)', socialName: null, motherName: 'Sandra Rodrigues (fictícia)', birthDate: '1985-03-08', sex: 'female', cpf: '666.666.666-66', cns: '666666666660006', rg: null, phone: '(99) 99999-0006', address: 'Rua Demo, 600', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(4), updatedAt: hoursAgo(1) },
  { id: 'pac-7', medicalRecordNumber: '000107', fullName: 'Pedro Henrique Costa (fictício)', socialName: null, motherName: 'Vera Costa (fictícia)', birthDate: '2001-12-25', sex: 'male', cpf: '777.777.777-77', cns: '777777777770007', rg: null, phone: '(99) 99999-0007', address: 'Rua Simulada, 700', city: 'Cidade Exemplo', state: 'EX', institutionId: null, status: 'active', createdAt: hoursAgo(1), updatedAt: hoursAgo(1) },
];

// ---- Filas e senhas fictícias --------------------------------------------

const queues: Queue[] = [
  { id: 'fila-recepcao', institutionId: 'inst-demo', unitId: null, sectorId: null, name: 'Recepção', queueType: 'reception', isActive: true, createdAt: hoursAgo(200), updatedAt: hoursAgo(1) },
  { id: 'fila-triagem', institutionId: 'inst-demo', unitId: null, sectorId: null, name: 'Triagem', queueType: 'triage', isActive: true, createdAt: hoursAgo(200), updatedAt: hoursAgo(1) },
  { id: 'fila-medica', institutionId: 'inst-demo', unitId: null, sectorId: null, name: 'Atendimento Médico', queueType: 'medical', isActive: true, createdAt: hoursAgo(200), updatedAt: hoursAgo(1) },
];

const tickets: Record<string, QueueTicket[]> = {
  'fila-recepcao': [
    { id: 'tk-1', queueId: 'fila-recepcao', encounterId: 'enc-6', patientId: 'pac-6', ticketNumber: 'A012', priorityScore: 10, riskColor: null, callRoom: null, status: 'waiting', callCount: 0, calledAt: null, calledBy: null, notes: null, createdAt: hoursAgo(0.2), updatedAt: hoursAgo(0.2) },
    { id: 'tk-2', queueId: 'fila-recepcao', encounterId: 'enc-7', patientId: 'pac-7', ticketNumber: 'A013', priorityScore: 10, riskColor: null, callRoom: null, status: 'waiting', callCount: 0, calledAt: null, calledBy: null, notes: null, createdAt: hoursAgo(0.1), updatedAt: hoursAgo(0.1) },
  ],
  'fila-triagem': [
    { id: 'tk-3', queueId: 'fila-triagem', encounterId: 'enc-2', patientId: 'pac-2', ticketNumber: 'T005', priorityScore: 80, riskColor: 'orange', callRoom: null, status: 'waiting', callCount: 0, calledAt: null, calledBy: null, notes: null, createdAt: hoursAgo(0.5), updatedAt: hoursAgo(0.5) },
  ],
  'fila-medica': [
    { id: 'tk-4', queueId: 'fila-medica', encounterId: 'enc-1', patientId: 'pac-1', ticketNumber: 'M002', priorityScore: 100, riskColor: 'red', callRoom: null, status: 'called', callCount: 1, calledAt: hoursAgo(0.05), calledBy: 'demo-user-123', notes: null, createdAt: hoursAgo(2), updatedAt: hoursAgo(0.05), isExceeded: false },
    { id: 'tk-5', queueId: 'fila-medica', encounterId: 'enc-3', patientId: 'pac-3', ticketNumber: 'M003', priorityScore: 60, riskColor: 'yellow', callRoom: null, status: 'waiting', callCount: 0, calledAt: null, calledBy: null, notes: null, createdAt: hoursAgo(1), updatedAt: hoursAgo(1) },
  ],
};

// ---- Atendimentos fictícios -----------------------------------------------

const encounters: Encounter[] = [
  { id: 'enc-1', patientId: 'pac-1', institutionId: 'inst-demo', unitId: null, sectorId: 'sec-vermelha', encounterType: 'emergency', origin: 'samu', chiefComplaint: 'Dor torácica intensa (fictício)', status: 'post_consultation', postConsultationDetail: 'medicando', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(2), updatedAt: hoursAgo(0.05) },
  { id: 'enc-2', patientId: 'pac-2', institutionId: 'inst-demo', unitId: null, sectorId: 'sec-obs-adulto', encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Falta de ar (fictício)', status: 'triage_pending', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(26), updatedAt: hoursAgo(0.5) },
  { id: 'enc-3', patientId: 'pac-3', institutionId: 'inst-demo', unitId: null, sectorId: 'sec-obs-adulto', encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Febre e vômitos (fictício)', status: 'consultation_pending', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(5), updatedAt: hoursAgo(1) },
  { id: 'enc-4', patientId: 'pac-4', institutionId: 'inst-demo', unitId: null, sectorId: 'sec-obs-pedi', encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Crise asmática (fictício)', status: 'in_consultation', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(3), updatedAt: hoursAgo(0.5) },
  { id: 'enc-5', patientId: 'pac-5', institutionId: 'inst-demo', unitId: null, sectorId: 'sec-internacao', encounterType: 'urgency', origin: 'transfer', chiefComplaint: 'Aguardando vaga em leito hospitalar (fictício)', status: 'post_consultation', postConsultationDetail: 'aguardando_reavaliacao_medica', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(30), updatedAt: hoursAgo(2) },
  { id: 'enc-6', patientId: 'pac-6', institutionId: 'inst-demo', unitId: null, sectorId: null, encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Dor abdominal (fictício)', status: 'created', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(0.2), updatedAt: hoursAgo(0.2) },
  { id: 'enc-7', patientId: 'pac-7', institutionId: 'inst-demo', unitId: null, sectorId: null, encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Corte superficial em mão (fictício)', status: 'created', assignedUserId: null, createdBy: null, updatedBy: null, createdAt: hoursAgo(0.1), updatedAt: hoursAgo(0.1) },
];

// ---- Profissionais fictícios ------------------------------------------------

const staffUsers: StaffUser[] = [
  { id: 'prof-1', name: 'Dra. Beatriz Nogueira (fictícia)', status: 'active', roles: ['doctor'] },
  { id: 'prof-2', name: 'Dr. Rafael Tavares (fictício)', status: 'active', roles: ['doctor'] },
  { id: 'prof-3', name: 'Enf. Camila Duarte (fictícia)', status: 'active', roles: ['nurse'] },
  { id: 'prof-4', name: 'Enf. Marcos Vinícius Rocha (fictício)', status: 'active', roles: ['nurse'] },
  { id: 'prof-5', name: 'Téc. Enf. Patrícia Gonçalves (fictícia)', status: 'active', roles: ['nursing_technician'] },
  { id: 'prof-6', name: 'Recepcionista Diego Martins (fictício)', status: 'active', roles: ['receptionist'] },
];

const staffLeaves: StaffLeaveLike[] = [];
type StaffLeaveLike = { id: string; userId: string; userName: string; leaveType: 'ferias' | 'atestado' | 'licenca' | 'outro'; startDate: string; endDate: string; notes?: string | null; createdAt: string };

const staffShifts: StaffShift[] = [
  { id: 'shift-1', userId: 'prof-1', userName: 'Dra. Beatriz Nogueira (fictícia)', shiftDate: new Date().toISOString().slice(0, 10), shiftPeriod: 'diurno', roleAtShift: 'Plantonista', notes: null, createdAt: hoursAgo(24) },
  { id: 'shift-2', userId: 'prof-3', userName: 'Enf. Camila Duarte (fictícia)', shiftDate: new Date().toISOString().slice(0, 10), shiftPeriod: 'diurno', roleAtShift: 'Enfermeira responsável', notes: null, createdAt: hoursAgo(24) },
  { id: 'shift-3', userId: 'prof-2', userName: 'Dr. Rafael Tavares (fictício)', shiftDate: new Date().toISOString().slice(0, 10), shiftPeriod: 'noturno', roleAtShift: 'Plantonista', notes: null, createdAt: hoursAgo(24) },
];

const staffRoles: StaffRole[] = [
  { code: 'doctor', name: 'Médico(a)' },
  { code: 'nurse', name: 'Enfermeiro(a)' },
  { code: 'nursing_technician', name: 'Técnico(a) de Enfermagem' },
  { code: 'receptionist', name: 'Recepcionista' },
  { code: 'manager', name: 'Gestor(a)' },
];

const staffSectors: StaffSector[] = sectors.map((s) => ({ id: s.id, name: s.name }));

const staffAccounts: StaffAccount[] = [
  { id: 'prof-1', username: 'beatriz.nogueira', name: 'Dra. Beatriz Nogueira (fictícia)', status: 'active', roles: ['doctor'], sectors: ['sec-vermelha', 'sec-obs-adulto'] },
  { id: 'prof-2', username: 'rafael.tavares', name: 'Dr. Rafael Tavares (fictício)', status: 'active', roles: ['doctor'], sectors: ['sec-obs-adulto', 'sec-internacao'] },
  { id: 'prof-3', username: 'camila.duarte', name: 'Enf. Camila Duarte (fictícia)', status: 'active', roles: ['nurse'], sectors: ['sec-vermelha'] },
  { id: 'prof-4', username: 'marcos.rocha', name: 'Enf. Marcos Vinícius Rocha (fictício)', status: 'active', roles: ['nurse'], sectors: ['sec-obs-pedi'] },
  { id: 'prof-5', username: 'patricia.goncalves', name: 'Téc. Enf. Patrícia Gonçalves (fictícia)', status: 'active', roles: ['nursing_technician'], sectors: ['sec-obs-adulto'] },
  { id: 'prof-6', username: 'diego.martins', name: 'Recepcionista Diego Martins (fictício)', status: 'active', roles: ['receptionist'], sectors: [] },
];

// ---- Roteador fictício -----------------------------------------------------

let idCounter = 1000;
const newId = (prefix: string) => `${prefix}-demo-${idCounter++}`;

const matchPatientsSearch = (path: string): Patient[] => {
  const qIndex = path.indexOf('?');
  if (qIndex === -1) return patients;
  const params = new URLSearchParams(path.slice(qIndex + 1));
  const name = params.get('name')?.toLowerCase();
  const cpf = params.get('cpf');
  const cns = params.get('cns');
  const mrn = params.get('mrn');
  return patients.filter((p) => {
    if (name && !p.fullName.toLowerCase().includes(name)) return false;
    if (cpf && p.cpf !== cpf) return false;
    if (cns && p.cns !== cns) return false;
    if (mrn && p.medicalRecordNumber !== mrn) return false;
    return true;
  });
};

// Módulos clínicos mais profundos (consulta médica, diagnósticos, prescrições,
// exames, desfecho) ainda não têm dados fictícios — em vez de um erro genérico
// (que quebrava o carregamento em cascata de telas como a Ficha Clínica, cujo
// código trata só 404 como "recurso não existe ainda"), simula um 404 real.
const notFound = (path: string): never => {
  throw new ApiError(404, {
    code: 'NOT_FOUND',
    message: `Recurso não disponível no Modo de Demonstração: ${path}`,
    requestId: 'demo',
  });
};

export const createDemoApiClient = (): ApiClient => {
  const get = async <T>(path: string): Promise<T> => {
    const base = path.split('?')[0]!;
    if (base === '/api/v1/bed-sectors') return sectors as unknown as T;
    if (base === '/api/v1/beds/map') return buildBedsMap() as unknown as T;
    if (base === '/api/v1/queues') return queues as unknown as T;
    const ticketsMatch = /^\/api\/v1\/queues\/([^/]+)\/tickets$/.exec(base);
    if (ticketsMatch) return (tickets[ticketsMatch[1]!] ?? []) as unknown as T;
    if (base === '/api/v1/patients') return matchPatientsSearch(path) as unknown as T;
    const patientMatch = /^\/api\/v1\/patients\/([^/]+)$/.exec(base);
    if (patientMatch) return (patients.find((p) => p.id === patientMatch[1]) ?? null) as unknown as T;
    if (/^\/api\/v1\/patients\/[^/]+\/(timeline|contacts|allergies|antecedents|continuous-medications|active-problems|duplicates)$/.test(base)) {
      return [] as unknown as T;
    }
    if (base === '/api/v1/encounters') return encounters as unknown as T;
    const encounterMatch = /^\/api\/v1\/encounters\/([^/]+)$/.exec(base);
    if (encounterMatch) return (encounters.find((e) => e.id === encounterMatch[1]) ?? null) as unknown as T;
    if (base === '/api/v1/staff/users') return staffUsers as unknown as T;
    if (base === '/api/v1/staff/leaves') return staffLeaves as unknown as T;
    if (base === '/api/v1/staff/shifts') return staffShifts as unknown as T;
    if (base === '/api/v1/staff/accounts/roles') return staffRoles as unknown as T;
    if (base === '/api/v1/staff/accounts/sectors') return staffSectors as unknown as T;
    if (base === '/api/v1/staff/accounts') return staffAccounts as unknown as T;
    return notFound(base);
  };

  const post = async <T>(path: string, body?: unknown): Promise<T> => {
    const base = path.split('?')[0]!;
    const b = (body ?? {}) as Record<string, unknown>;

    const allocateMatch = /^\/api\/v1\/encounters\/([^/]+)\/beds\/allocate$/.exec(base);
    if (allocateMatch) {
      const bed = beds.find((x) => x.id === b.bedId);
      if (bed) {
        const patient = patients.find((p) => p.id === b.patientId);
        bed.status = 'occupied';
        bed.allocationId = newId('aloc');
        bed.encounterId = allocateMatch[1]!;
        bed.patientId = (b.patientId as string) ?? null;
        bed.patientName = patient?.fullName ?? `Paciente ${String(b.patientId ?? '')} (fictício)`;
        bed.allocatedAt = now();
        bed.stayHours = 0;
        bed.is24hLimitExceeded = false;
      }
      return {} as T;
    }

    const transferMatch = /^\/api\/v1\/bed-allocations\/([^/]+)\/transfer$/.exec(base);
    if (transferMatch) {
      const source = beds.find((x) => x.allocationId === transferMatch[1]);
      const target = beds.find((x) => x.id === b.targetBedId);
      if (source && target) {
        target.status = 'occupied';
        target.allocationId = source.allocationId ?? null;
        target.encounterId = source.encounterId ?? null;
        target.patientId = source.patientId ?? null;
        target.patientName = source.patientName ?? null;
        target.allocatedAt = now();
        target.stayHours = 0;
        target.is24hLimitExceeded = false;
        source.status = 'cleaning';
        source.allocationId = null;
        source.encounterId = null;
        source.patientId = null;
        source.patientName = null;
        source.allocatedAt = null;
        delete source.stayHours;
        delete source.is24hLimitExceeded;
      }
      return {} as T;
    }

    const dischargeMatch = /^\/api\/v1\/bed-allocations\/([^/]+)\/discharge$/.exec(base);
    if (dischargeMatch) {
      const bed = beds.find((x) => x.allocationId === dischargeMatch[1]);
      if (bed) {
        bed.status = 'cleaning';
        bed.allocationId = null;
        bed.encounterId = null;
        bed.patientId = null;
        bed.patientName = null;
        bed.allocatedAt = null;
        delete bed.stayHours;
        delete bed.is24hLimitExceeded;
      }
      return {} as T;
    }

    if (base === '/api/v1/beds') {
      const sectorName = sectors.find((s) => s.id === b.sectorId)?.name;
      const bed: MutableBed = {
        id: newId('bed'),
        sectorId: b.sectorId as string,
        ...(sectorName ? { sectorName } : {}),
        bedNumber: b.bedNumber as string,
        status: 'available',
        isExtra: true,
        isIsolation: Boolean(b.isIsolation),
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      };
      beds.push(bed);
      return bed as unknown as T;
    }

    if (base === '/api/v1/bed-sectors') {
      const sector: BedSectorData = {
        id: newId('sec'),
        name: b.name as string,
        code: b.code as string,
        description: (b.description as string) ?? null,
        capacity: Number(b.capacity ?? 0),
        createdAt: now(),
      };
      sectors.push(sector);
      return sector as unknown as T;
    }

    const callMatch = /^\/api\/v1\/queues\/tickets\/([^/]+)\/call$/.exec(base);
    if (callMatch) {
      const ticket = Object.values(tickets).flat().find((t) => t.id === callMatch[1]);
      if (ticket) {
        Object.assign(ticket, { status: 'called', callRoom: b.callRoom, callCount: ticket.callCount + 1, calledAt: now() });
      }
      return (ticket ?? {}) as unknown as T;
    }

    const recallMatch = /^\/api\/v1\/queues\/tickets\/([^/]+)\/recall$/.exec(base);
    if (recallMatch) {
      const ticket = Object.values(tickets).flat().find((t) => t.id === recallMatch[1]);
      if (ticket) Object.assign(ticket, { calledAt: now() });
      return (ticket ?? {}) as unknown as T;
    }

    if (base === '/api/v1/staff/leaves') {
      const leave: StaffLeaveLike = {
        id: newId('leave'),
        userId: b.userId as string,
        userName: staffUsers.find((u) => u.id === b.userId)?.name ?? 'Profissional (fictício)',
        leaveType: b.leaveType as StaffLeaveLike['leaveType'],
        startDate: b.startDate as string,
        endDate: b.endDate as string,
        notes: (b.notes as string) ?? null,
        createdAt: now(),
      };
      staffLeaves.push(leave);
      return leave as unknown as T;
    }

    if (base === '/api/v1/staff/shifts') {
      const shift: StaffShift = {
        id: newId('shift'),
        userId: b.userId as string,
        userName: staffUsers.find((u) => u.id === b.userId)?.name ?? 'Profissional (fictício)',
        shiftDate: b.shiftDate as string,
        shiftPeriod: b.shiftPeriod as string,
        roleAtShift: (b.roleAtShift as string) ?? null,
        notes: (b.notes as string) ?? null,
        createdAt: now(),
      };
      staffShifts.push(shift);
      return shift as unknown as T;
    }

    if (base === '/api/v1/staff/accounts') {
      const account: StaffAccount = {
        id: newId('prof'),
        username: b.username as string,
        name: b.name as string,
        status: 'active',
        roles: [b.roleCode as string],
        sectors: b.sectorId ? [b.sectorId as string] : [],
      };
      staffAccounts.push(account);
      return account as unknown as T;
    }

    if (base === '/api/v1/patients') {
      const patient: Patient = {
        id: newId('pac'),
        medicalRecordNumber: String(100000 + patients.length + 1),
        fullName: `${(b.fullName as string) ?? 'Paciente'} (fictício)`,
        socialName: (b.socialName as string) ?? null,
        motherName: (b.motherName as string) ?? null,
        birthDate: (b.birthDate as string) ?? null,
        sex: (b.sex as Patient['sex']) ?? null,
        cpf: (b.cpf as string) ?? null,
        cns: (b.cns as string) ?? null,
        rg: (b.rg as string) ?? null,
        phone: (b.phone as string) ?? null,
        address: (b.address as string) ?? null,
        city: (b.city as string) ?? null,
        state: (b.state as string) ?? null,
        institutionId: null,
        status: 'active',
        createdAt: now(),
        updatedAt: now(),
      };
      patients.push(patient);
      return patient as unknown as T;
    }

    if (base === '/api/v1/encounters') {
      const encounter: Encounter = {
        id: newId('enc'),
        patientId: b.patientId as string,
        institutionId: 'inst-demo',
        unitId: null,
        sectorId: (b.sectorId as string) ?? null,
        encounterType: b.encounterType as Encounter['encounterType'],
        origin: b.origin as Encounter['origin'],
        chiefComplaint: b.chiefComplaint as string,
        status: 'created',
        assignedUserId: (b.assignedUserId as string) ?? null,
        createdBy: null,
        updatedBy: null,
        createdAt: now(),
        updatedAt: now(),
      };
      encounters.push(encounter);
      return encounter as unknown as T;
    }

    const enqueueMatch = /^\/api\/v1\/queues\/([^/]+)\/enqueue$/.exec(base);
    if (enqueueMatch) {
      const queueId = enqueueMatch[1]!;
      const ticket: QueueTicket = {
        id: newId('tk'),
        queueId,
        encounterId: b.encounterId as string,
        patientId: encounters.find((e) => e.id === b.encounterId)?.patientId ?? '',
        ticketNumber: (b.ticketNumber as string) ?? `D${String(idCounter)}`,
        priorityScore: 10,
        riskColor: null,
        callRoom: null,
        status: 'waiting',
        callCount: 0,
        calledAt: null,
        calledBy: null,
        notes: null,
        createdAt: now(),
        updatedAt: now(),
      };
      tickets[queueId] = [...(tickets[queueId] ?? []), ticket];
      return ticket as unknown as T;
    }

    // Ação não simulada explicitamente: devolve sucesso vazio em vez de
    // quebrar a tela — o Modo de Demonstração prioriza navegação fluida
    // sobre fidelidade total de cada mutação de escrita.
    return {} as T;
  };

  const patch = async <T>(path: string, body?: unknown): Promise<T> => {
    const base = path.split('?')[0]!;
    const b = (body ?? {}) as Record<string, unknown>;

    const bedStatusMatch = /^\/api\/v1\/beds\/([^/]+)\/status$/.exec(base);
    if (bedStatusMatch) {
      const bed = beds.find((x) => x.id === bedStatusMatch[1]);
      if (bed) bed.status = b.status as BedData['status'];
      return (bed ?? {}) as unknown as T;
    }

    const ticketStatusMatch = /^\/api\/v1\/queues\/tickets\/([^/]+)\/status$/.exec(base);
    if (ticketStatusMatch) {
      const ticket = Object.values(tickets).flat().find((t) => t.id === ticketStatusMatch[1]);
      if (ticket) Object.assign(ticket, { status: b.status, notes: b.notes ?? ticket.notes });
      return (ticket ?? {}) as unknown as T;
    }

    const encounterStatusMatch = /^\/api\/v1\/encounters\/([^/]+)\/status$/.exec(base);
    if (encounterStatusMatch) {
      const encounter = encounters.find((e) => e.id === encounterStatusMatch[1]);
      if (encounter) Object.assign(encounter, b, { updatedAt: now() });
      return (encounter ?? {}) as unknown as T;
    }

    const patientMatch = /^\/api\/v1\/patients\/([^/]+)$/.exec(base);
    if (patientMatch) {
      const patient = patients.find((p) => p.id === patientMatch[1]);
      if (patient) Object.assign(patient, b, { updatedAt: now() });
      return (patient ?? {}) as unknown as T;
    }

    return {} as T;
  };

  const del = async <T>(path: string): Promise<T> => {
    const leaveMatch = /^\/api\/v1\/staff\/leaves\/([^/]+)$/.exec(path);
    if (leaveMatch) {
      const idx = staffLeaves.findIndex((l) => l.id === leaveMatch[1]);
      if (idx !== -1) staffLeaves.splice(idx, 1);
    }
    const shiftMatch = /^\/api\/v1\/staff\/shifts\/([^/]+)$/.exec(path);
    if (shiftMatch) {
      const idx = staffShifts.findIndex((s) => s.id === shiftMatch[1]);
      if (idx !== -1) staffShifts.splice(idx, 1);
    }
    return undefined as T;
  };

  const getText = async (_path: string): Promise<string> => '';

  return { get, post, patch, delete: del, getText };
};
