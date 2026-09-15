import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createPatientRiskClassifiedEvent,
  createRiskReclassifiedEvent,
  createTriageRecordedEvent,
} from './events.js';
import {
  ALLOWED_TRIAGE_DESTINATION_TYPES,
  allowsDirectRedRoom,
  assertClassificationHistoryConsistent,
  assertDestinationHistoryConsistent,
  deriveManchesterTargetAndPriority,
  isExemptFromMedicalConsultation,
  requiresConsultationRoom,
  resolveDestinationFlowStage,
  resolveProfessionalLabel,
  validateCapillaryGlucose,
  validateComplaintDetail,
  validateGlasgowScore,
  validateInitialAssessment,
  validatePainDetail,
  validatePainScore,
  validatePregnancyAssessment,
  validateTriageCreateInput,
  validateTriageDestination,
  validateTriageReclassifyInput,
  validateVitalSigns,
} from './rules.js';
import type { TriageClassificationEvent, TriageDestinationEvent, TriageDestinationType } from './types.js';
import type { Triage } from './types.js';

describe('Triage Domain Rules & Events', () => {
  describe('deriveManchesterTargetAndPriority', () => {
    it('retorna tempo-alvo e prioridade corretos para Vermelho (0 min, emergency)', () => {
      const res = deriveManchesterTargetAndPriority('red');
      expect(res.targetTimeMinutes).toBe(0);
      expect(res.priority).toBe('emergency');
    });

    it('retorna tempo-alvo e prioridade corretos para Laranja (10 min, very_urgent)', () => {
      const res = deriveManchesterTargetAndPriority('orange');
      expect(res.targetTimeMinutes).toBe(10);
      expect(res.priority).toBe('very_urgent');
    });

    it('retorna tempo-alvo e prioridade corretos para Amarelo (60 min, urgent)', () => {
      const res = deriveManchesterTargetAndPriority('yellow');
      expect(res.targetTimeMinutes).toBe(60);
      expect(res.priority).toBe('urgent');
    });

    it('retorna tempo-alvo e prioridade corretos para Verde (120 min, standard)', () => {
      const res = deriveManchesterTargetAndPriority('green');
      expect(res.targetTimeMinutes).toBe(120);
      expect(res.priority).toBe('standard');
    });

    it('retorna tempo-alvo e prioridade corretos para Azul (240 min, non_urgent)', () => {
      const res = deriveManchesterTargetAndPriority('blue');
      expect(res.targetTimeMinutes).toBe(240);
      expect(res.priority).toBe('non_urgent');
    });
  });

  describe('validateVitalSigns', () => {
    it('aceita sinais vitais dentro dos limites clínicos', () => {
      const input = {
        systolicBp: 120,
        diastolicBp: 80,
        heartRate: 75,
        respiratoryRate: 16,
        temperature: 36.5,
        oxygenSaturation: 98,
      };
      const res = validateVitalSigns(input);
      expect(res.systolicBp).toBe(120);
      expect(res.temperature).toBe(36.5);
    });

    it('rejeita temperatura fora dos limites clínicos (<25.0 ou >45.0)', () => {
      expect(() => validateVitalSigns({ temperature: 50.0 })).toThrowError(/Temperatura corporal/);
    });

    it('rejeita saturação de oxigênio inválida (>100)', () => {
      expect(() => validateVitalSigns({ oxygenSaturation: 105 })).toThrowError(/Saturação de oxigênio/);
    });
  });

  describe('validatePainScore & Glasgow', () => {
    it('valida dor de 0 a 10', () => {
      expect(validatePainScore(5)).toBe(5);
      expect(() => validatePainScore(12)).toThrowError(/escala de dor/);
    });

    it('valida Glasgow de 3 a 15', () => {
      expect(validateGlasgowScore(15)).toBe(15);
      expect(() => validateGlasgowScore(2)).toThrowError(/Glasgow/);
    });

    it('valida glicemia >= 0', () => {
      expect(validateCapillaryGlucose(95)).toBe(95);
      expect(() => validateCapillaryGlucose(-10)).toThrowError(/glicemia capilar/);
    });
  });

  describe('validateTriageCreateInput & validateTriageReclassifyInput', () => {
    it('exige queixa principal não-vazia', () => {
      expect(() =>
        validateTriageCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          institutionId: 'inst-1',
          chiefComplaint: '   ',
          riskColor: 'yellow',
          destination: { type: 'medical_consultation', roomId: 'room-1' },
        }),
      ).toThrowError(/queixa principal/);
    });

    it('exige motivo obrigatório na reclassificação', () => {
      expect(() =>
        validateTriageReclassifyInput({
          triageId: 'tri-1',
          newRiskColor: 'red',
          reclassificationReason: '   ',
          expectedUpdatedAt: new Date().toISOString(),
        }),
      ).toThrowError(/motivo da reclassificação/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;
    const mockTriage: Triage = {
      id: 'tri-123',
      encounterId: 'enc-123',
      patientId: 'pat-123',
      institutionId: 'inst-123',
      chiefComplaint: 'Dor torácica intensa',
      riskColor: 'red',
      priority: 'emergency',
      targetTimeMinutes: 0,
      protocolVersion: 'Manchester v1',
      vitals: { heartRate: 110 },
      performedBy: 'usr-123',
      performedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initialAssessment: { skinFindings: [] },
      pregnancy: { status: null, weeks: null, obstetricNotes: null },
      complaintDetail: { onsetAt: null, evolution: null, notes: null },
      painDetail: { location: null, irradiation: null, character: null, onsetAt: null, evolution: null },
      classificationHistory: [],
      destination: { type: null },
      destinationHistory: [],
    };

    it('cria evento TriageRecorded', () => {
      const ev = createTriageRecordedEvent(mockTriage, mockActorId);
      expect(ev.type).toBe('TriageRecorded');
      expect(ev.aggregateId).toBe('tri-123');
      expect((ev.payload as { riskColor: string }).riskColor).toBe('red');
    });

    it('cria evento PatientRiskClassified', () => {
      const ev = createPatientRiskClassifiedEvent(mockTriage, mockActorId);
      expect(ev.type).toBe('PatientRiskClassified');
      expect(ev.aggregateId).toBe('pat-123');
    });

    it('cria evento RiskReclassified', () => {
      const ev = createRiskReclassifiedEvent(
        { ...mockTriage, reclassificationReason: 'Piora nos sinais vitais' },
        'yellow',
        mockActorId,
      );
      expect(ev.type).toBe('RiskReclassified');
      expect((ev.payload as { previousColor: string }).previousColor).toBe('yellow');
      expect((ev.payload as { newColor: string }).newColor).toBe('red');
    });
  });

  describe('validateInitialAssessment (Bloco 1)', () => {
    it('retorna estrutura vazia quando nada é informado (campo opcional)', () => {
      expect(validateInitialAssessment(null)).toEqual({ skinFindings: [] });
    });

    it('normaliza e deduplica achados de pele repetidos', () => {
      const result = validateInitialAssessment({ skinFindings: ['pale', 'pale', 'cyanotic'] });
      expect(result.skinFindings).toEqual(['pale', 'cyanotic']);
    });

    it('rejeita achado de pele fora do conjunto válido', () => {
      expect(() =>
        validateInitialAssessment({ skinFindings: ['not_a_real_finding' as never] }),
      ).toThrow(/Achado de pele inválido/);
    });
  });

  describe('validatePregnancyAssessment (Bloco 1)', () => {
    it('não presume gravidez quando status não é informado', () => {
      expect(validatePregnancyAssessment(null)).toEqual({ status: null, weeks: null, obstetricNotes: null });
    });

    it('aceita "não informado" explicitamente sem exigir mais dados', () => {
      const result = validatePregnancyAssessment({ status: 'unknown' });
      expect(result.status).toBe('unknown');
      expect(result.weeks).toBeNull();
    });

    it('zera idade gestacional quando status não é "yes"', () => {
      const result = validatePregnancyAssessment({ status: 'no', weeks: 20 });
      expect(result.weeks).toBeNull();
    });

    it('rejeita idade gestacional fora da faixa 0-45 semanas', () => {
      expect(() => validatePregnancyAssessment({ status: 'yes', weeks: 60 })).toThrow(/idade gestacional/);
    });
  });

  describe('validateComplaintDetail / validatePainDetail (Bloco 1)', () => {
    it('início e evolução da queixa são independentes do início/evolução da dor', () => {
      const complaint = validateComplaintDetail({ onsetAt: '2026-09-10T21:30:00Z', evolution: 'sudden' });
      const pain = validatePainDetail({ onsetAt: '2026-09-11T08:00:00Z', evolution: 'worsening' });
      expect(complaint.onsetAt).not.toBe(pain.onsetAt);
      expect(complaint.evolution).toBe('sudden');
      expect(pain.evolution).toBe('worsening');
    });

    it('aceita ausência total (triagem antiga / não preenchido)', () => {
      expect(validateComplaintDetail(null)).toEqual({ onsetAt: null, evolution: null, notes: null });
      expect(validatePainDetail(null)).toEqual({ location: null, irradiation: null, character: null, onsetAt: null, evolution: null });
    });
  });

  describe('validateTriageCreateInput inclui os novos blocos normalizados', () => {
    it('normaliza avaliação inicial, gestação, queixa e dor junto com os campos já existentes', () => {
      const result = validateTriageCreateInput({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        institutionId: 'inst-1',
        chiefComplaint: 'Dor abdominal',
        riskColor: 'yellow',
        initialAssessment: { generalCondition: 'regular', skinFindings: ['pale'] },
        pregnancy: { status: 'unknown' },
        complaintDetail: { evolution: 'progressive' },
        painDetail: { location: 'Abdômen', character: 'Cólica' },
        destination: { type: 'exam', examCategory: 'laboratory' },
      });
      expect(result.initialAssessmentNormalized.generalCondition).toBe('regular');
      expect(result.pregnancyNormalized.status).toBe('unknown');
      expect(result.complaintDetailNormalized.evolution).toBe('progressive');
      expect(result.painDetailNormalized.location).toBe('Abdômen');
      expect(result.destinationNormalized.type).toBe('exam');
      expect(result.destinationNormalized.examCategory).toBe('laboratory');
      // campos já existentes continuam funcionando normalmente
      expect(result.priority).toBe('urgent');
    });
  });

  describe('validateTriageDestination (Bloco 3)', () => {
    it('exige um tipo de encaminhamento', () => {
      expect(() => validateTriageDestination(null, { requireReason: false })).toThrow(/obrigatório definir o encaminhamento/);
      expect(() => validateTriageDestination(undefined, { requireReason: false })).toThrow(/obrigatório definir o encaminhamento/);
    });

    it('atendimento médico exige consultório', () => {
      expect(() => validateTriageDestination({ type: 'medical_consultation' }, { requireReason: false })).toThrow(
        /Selecione o consultório/,
      );
    });

    it('consultório disponível pode ser selecionado (atendimento médico válido)', () => {
      const result = validateTriageDestination({ type: 'medical_consultation', roomId: 'room-2' }, { requireReason: false });
      expect(result.type).toBe('medical_consultation');
      expect(result.roomId).toBe('room-2');
    });

    it('Sala Vermelha pode ser selecionada sem exigir campos extras', () => {
      const result = validateTriageDestination({ type: 'red_room' }, { requireReason: false });
      expect(result.type).toBe('red_room');
      expect(result.roomId).toBeNull();
    });

    it('Sala Vermelha não depende da cor de risco — validação não recebe nem considera riskColor', () => {
      // A assinatura de validateTriageDestination nem aceita riskColor — a
      // ausência do parâmetro já é a garantia estrutural de que não existe
      // `if (riskColor === 'red') destination = 'red_room'` em lugar nenhum.
      const result = validateTriageDestination({ type: 'red_room' }, { requireReason: false });
      expect(result.type).toBe('red_room');
    });

    it('exame laboratorial pode ser selecionado', () => {
      const result = validateTriageDestination({ type: 'exam', examCategory: 'laboratory' }, { requireReason: false });
      expect(result.examCategory).toBe('laboratory');
    });

    it('exame de imagem pode ser selecionado', () => {
      const result = validateTriageDestination({ type: 'exam', examCategory: 'imaging' }, { requireReason: false });
      expect(result.examCategory).toBe('imaging');
    });

    it('exame exige categoria (laboratorial ou imagem)', () => {
      expect(() => validateTriageDestination({ type: 'exam' }, { requireReason: false })).toThrow(/tipo de exame/);
    });

    it('procedimento "troca de curativo" funciona', () => {
      const result = validateTriageDestination({ type: 'procedure', procedureKind: 'dressing_change' }, { requireReason: false });
      expect(result.procedureKind).toBe('dressing_change');
    });

    it('procedimento "troca de SVD" funciona', () => {
      const result = validateTriageDestination({ type: 'procedure', procedureKind: 'urinary_catheter_change' }, { requireReason: false });
      expect(result.procedureKind).toBe('urinary_catheter_change');
    });

    it('"outro procedimento" exige descrição', () => {
      expect(() =>
        validateTriageDestination({ type: 'procedure', procedureKind: 'other' }, { requireReason: false }),
      ).toThrow(/Descreva o procedimento/);
      const result = validateTriageDestination(
        { type: 'procedure', procedureKind: 'other', procedureOther: 'Retirada de pontos' },
        { requireReason: false },
      );
      expect(result.procedureOther).toBe('Retirada de pontos');
    });

    it('alteração de destino exige motivo quando requireReason=true', () => {
      expect(() =>
        validateTriageDestination({ type: 'red_room' }, { requireReason: true }),
      ).toThrow(/motivo da alteração do encaminhamento/);
      const result = validateTriageDestination({ type: 'red_room', reason: 'Alteração clínica durante permanência.' }, { requireReason: true });
      expect(result.reason).toBe('Alteração clínica durante permanência.');
    });

    it('não exige motivo na definição inicial (requireReason=false)', () => {
      expect(() => validateTriageDestination({ type: 'red_room' }, { requireReason: false })).not.toThrow();
    });
  });

  describe('assertDestinationHistoryConsistent (Bloco 3)', () => {
    const mkDestEvent = (overrides: Partial<TriageDestinationEvent>): TriageDestinationEvent => ({
      id: 'devt-1',
      triageId: 'tri-1',
      destinationType: 'medical_consultation',
      roomId: 'room-1',
      professionalId: 'usr-1',
      setAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...overrides,
    });

    it('não lança erro quando o destino atual bate com o evento mais recente', () => {
      const triage = { ...({} as Triage), destination: { type: 'red_room' }, destinationHistory: [mkDestEvent({ destinationType: 'red_room' })] } as Triage;
      expect(() => assertDestinationHistoryConsistent(triage)).not.toThrow();
    });

    it('lança erro quando o destino atual diverge do evento mais recente', () => {
      const triage = { ...({} as Triage), destination: { type: 'exam' }, destinationHistory: [mkDestEvent({ destinationType: 'red_room' })] } as Triage;
      expect(() => assertDestinationHistoryConsistent(triage)).toThrow(/não corresponde ao evento mais recente/);
    });

    it('não lança erro para triagem sem histórico de destino (triagem antiga)', () => {
      const triage = { ...({} as Triage), destination: { type: null }, destinationHistory: [] } as Triage;
      expect(() => assertDestinationHistoryConsistent(triage)).not.toThrow();
    });
  });

  describe('assertClassificationHistoryConsistent (Bloco 2)', () => {
    const mkEvent = (overrides: Partial<TriageClassificationEvent>): TriageClassificationEvent => ({
      id: 'evt-1',
      triageId: 'tri-1',
      riskColor: 'green',
      priority: 'standard',
      targetTimeMinutes: 120,
      classificationType: 'initial',
      reason: null,
      professionalId: 'usr-1',
      classifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...overrides,
    });

    it('não lança erro quando a classificação atual bate com o evento mais recente', () => {
      const triage = { ...({} as Triage), riskColor: 'yellow', classificationHistory: [mkEvent({ riskColor: 'yellow' })] } as Triage;
      expect(() => assertClassificationHistoryConsistent(triage)).not.toThrow();
    });

    it('lança erro quando a classificação atual diverge do evento mais recente do histórico', () => {
      const triage = { ...({} as Triage), riskColor: 'green', classificationHistory: [mkEvent({ riskColor: 'orange' })] } as Triage;
      expect(() => assertClassificationHistoryConsistent(triage)).toThrow(/não corresponde ao evento mais recente/);
    });

    it('não lança erro para triagem sem histórico (triagem antiga, sem reconstrução retroativa)', () => {
      const triage = { ...({} as Triage), riskColor: 'green', classificationHistory: [] } as Triage;
      expect(() => assertClassificationHistoryConsistent(triage)).not.toThrow();
    });

    it('considera o primeiro item do array como o mais recente (ordem esperada: mais recente primeiro)', () => {
      const triage = {
        ...({} as Triage),
        riskColor: 'orange',
        classificationHistory: [
          mkEvent({ riskColor: 'orange', classifiedAt: '2026-09-14T11:03:00Z' }),
          mkEvent({ riskColor: 'yellow', classifiedAt: '2026-09-14T10:17:00Z' }),
          mkEvent({ riskColor: 'green', classifiedAt: '2026-09-14T08:42:00Z' }),
        ],
      } as Triage;
      expect(() => assertClassificationHistoryConsistent(triage)).not.toThrow();
    });
  });

  describe('resolveProfessionalLabel (Bloco 2.1)', () => {
    it('mostra o nome quando disponível (profissional existente)', () => {
      expect(resolveProfessionalLabel('João da Silva', '8a31f4c2-0000-0000-0000-000000000000')).toBe('João da Silva');
    });

    it('cai para fallback por UUID quando o nome é null (RLS não liberou / não resolvível)', () => {
      expect(resolveProfessionalLabel(null, '8a31f4c2-0000-0000-0000-000000000000')).toBe('Profissional #8a31f4c2');
    });

    it('cai para fallback quando o nome é undefined (profissional inexistente/coluna ausente)', () => {
      expect(resolveProfessionalLabel(undefined, '8a31f4c2-0000-0000-0000-000000000000')).toBe('Profissional #8a31f4c2');
    });

    it('cai para fallback quando o nome vem como string vazia/apenas espaços', () => {
      expect(resolveProfessionalLabel('   ', '8a31f4c2-0000-0000-0000-000000000000')).toBe('Profissional #8a31f4c2');
    });

    it('nunca lança erro (histórico não pode quebrar a tela por causa do nome)', () => {
      expect(() => resolveProfessionalLabel(null, 'x')).not.toThrow();
    });

    it('nunca expõe o UUID completo no fallback, só os 8 primeiros caracteres (Bloco 2.2)', () => {
      const fullUuid = '8a31f4c2-1234-5678-9abc-def012345678';
      const label = resolveProfessionalLabel(null, fullUuid);
      expect(label).not.toContain(fullUuid);
      expect(label).toBe('Profissional #8a31f4c2');
    });
  });
});

describe('Bloco 4 — compatibilidade de destino/fluxo', () => {
  const ALL_TYPES: readonly TriageDestinationType[] = ['medical_consultation', 'red_room', 'exam', 'procedure'];

  it('ALLOWED_TRIAGE_DESTINATION_TYPES contém exatamente os 4 tipos válidos, nenhum "leito" (regra 2/13/19)', () => {
    expect(ALLOWED_TRIAGE_DESTINATION_TYPES).toHaveLength(4);
    expect([...ALLOWED_TRIAGE_DESTINATION_TYPES].sort()).toEqual(
      ['exam', 'medical_consultation', 'procedure', 'red_room'].sort(),
    );
    for (const type of ALLOWED_TRIAGE_DESTINATION_TYPES) {
      expect(type).not.toMatch(/leito|bed|internacao|internação/i);
    }
  });

  it('requiresConsultationRoom: só "medical_consultation" exige consultório (regra 1/3)', () => {
    expect(requiresConsultationRoom('medical_consultation')).toBe(true);
    for (const type of ALL_TYPES.filter((t) => t !== 'medical_consultation')) {
      expect(requiresConsultationRoom(type)).toBe(false);
    }
  });

  it('allowsDirectRedRoom: só "red_room" pode receber o paciente diretamente após a triagem (regra 5)', () => {
    expect(allowsDirectRedRoom('red_room')).toBe(true);
    for (const type of ALL_TYPES.filter((t) => t !== 'red_room')) {
      expect(allowsDirectRedRoom(type)).toBe(false);
    }
  });

  it('isExemptFromMedicalConsultation: exame, procedimento e Sala Vermelha não exigem consultório médico (regra 6)', () => {
    expect(isExemptFromMedicalConsultation('exam')).toBe(true);
    expect(isExemptFromMedicalConsultation('procedure')).toBe(true);
    expect(isExemptFromMedicalConsultation('red_room')).toBe(true);
    expect(isExemptFromMedicalConsultation('medical_consultation')).toBe(false);
  });

  it('resolveDestinationFlowStage mapeia cada tipo ao seu estágio de fluxo (regra 16)', () => {
    expect(resolveDestinationFlowStage('medical_consultation')).toBe('medical_consultation_queue');
    expect(resolveDestinationFlowStage('red_room')).toBe('red_room_direct');
    expect(resolveDestinationFlowStage('exam')).toBe('exam_flow');
    expect(resolveDestinationFlowStage('procedure')).toBe('procedure_flow');
  });

  it('triagem → consultório: permitido, exige consultório e não é isento (regra 19)', () => {
    expect(ALLOWED_TRIAGE_DESTINATION_TYPES).toContain('medical_consultation');
    expect(requiresConsultationRoom('medical_consultation')).toBe(true);
    expect(isExemptFromMedicalConsultation('medical_consultation')).toBe(false);
  });

  it('triagem → Sala Vermelha: permitido e direto, sem exigir consultório (regra 19)', () => {
    expect(ALLOWED_TRIAGE_DESTINATION_TYPES).toContain('red_room');
    expect(allowsDirectRedRoom('red_room')).toBe(true);
    expect(requiresConsultationRoom('red_room')).toBe(false);
  });

  it('triagem → exame: permitido e isento de consultório médico (regra 19)', () => {
    expect(ALLOWED_TRIAGE_DESTINATION_TYPES).toContain('exam');
    expect(isExemptFromMedicalConsultation('exam')).toBe(true);
    expect(requiresConsultationRoom('exam')).toBe(false);
  });

  it('triagem → procedimento: permitido e isento de consultório médico (regra 19)', () => {
    expect(ALLOWED_TRIAGE_DESTINATION_TYPES).toContain('procedure');
    expect(isExemptFromMedicalConsultation('procedure')).toBe(true);
    expect(requiresConsultationRoom('procedure')).toBe(false);
  });

  it('triagem → leito: proibido — nenhum valor de leito/internação é um TriageDestinationType válido (regra 2/13/19)', () => {
    const forbidden = ['bed', 'internment', 'internacao', 'leito', 'admission_bed'];
    for (const value of forbidden) {
      expect(ALLOWED_TRIAGE_DESTINATION_TYPES).not.toContain(value);
    }
  });
});
