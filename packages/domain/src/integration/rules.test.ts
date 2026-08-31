import { describe, it, expect } from 'vitest';
import { parseHl7OruMessage, parseHl7OrmMessage } from './hl7-parser.js';
import { mapPatientToFhirResource, mapEncounterToFhirResource } from './fhir-mapper.js';

describe('Regras de Domínio de Interoperabilidade FHIR R4, HL7 e PACS DICOM (INT-001, INT-002, INT-003, INT-009)', () => {
  it('interpreta e extrai dados de mensagens HL7 ORU_R01 de laudos de laboratório (INT-001)', () => {
    const rawHl7 = `MSH|^~\\&|LIS|LAB|VITALOOP|UPA|20260829100000||ORU^R01|MSG-998811|P|2.5\rPID|1||PAT-12345||SILVA^MARIA||19850520|F\rOBX|1|NM|GLUCOSE||98|mg/dL||||F`;

    const parsed = parseHl7OruMessage(rawHl7);
    expect(parsed.messageType).toBe('ORU^R01');
    expect(parsed.controlId).toBe('MSG-998811');
    expect(parsed.patientId).toBe('PAT-12345');
    expect(parsed.patientName).toBe('SILVA MARIA');
    expect(parsed.observationValue).toBe('98');
    expect(parsed.observationUnit).toBe('mg/dL');
  });

  it('interpreta mensagens HL7 ORM_O01 de solicitação de exames radiológicos RIS (INT-002)', () => {
    const rawHl7 = `MSH|^~\\&|VITALOOP|UPA|RIS|RAD|20260829100000||ORM^O01|MSG-774422|P|2.5`;
    const parsed = parseHl7OrmMessage(rawHl7);
    expect(parsed.messageType).toBe('ORM^O01');
    expect(parsed.controlId).toBe('MSG-774422');
  });

  it('mapeia paciente e atendimento para o padrão HL7 FHIR R4 (INT-009)', () => {
    const fhirPatient = mapPatientToFhirResource({
      id: 'pat-uuid-123',
      fullName: 'Maria da Silva',
      sex: 'female',
      birthDate: '1985-05-20',
    });

    expect(fhirPatient.resourceType).toBe('Patient');
    expect(fhirPatient.id).toBe('pat-uuid-123');
    expect(fhirPatient.name[0].text).toBe('Maria da Silva');
    expect(fhirPatient.gender).toBe('female');

    const fhirEncounter = mapEncounterToFhirResource({
      id: 'enc-uuid-456',
      patientId: 'pat-uuid-123',
      status: 'in-progress',
      encounterType: 'urgency',
    });

    expect(fhirEncounter.resourceType).toBe('Encounter');
    expect(fhirEncounter.id).toBe('enc-uuid-456');
    expect(fhirEncounter.class.code).toBe('EMER');
    expect(fhirEncounter.subject.reference).toBe('Patient/pat-uuid-123');
  });

  it('rejeita payload HL7 inválido sem cabeçalho MSH com AppError', () => {
    expect(() => {
      parseHl7OruMessage('Payload invalido em texto puro');
    }).toThrow('Mensagem HL7 inválida: segmento MSH de cabeçalho não encontrado.');
  });

});
