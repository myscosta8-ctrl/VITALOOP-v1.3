import type { FhirPatientResource, FhirEncounterResource } from './types.js';

export function mapPatientToFhirResource(patient: {
  id: string;
  fullName: string;
  sex?: string | undefined;
  birthDate?: string | undefined;
}): FhirPatientResource {
  let gender: 'male' | 'female' | 'other' | 'unknown' = 'unknown';
  if (patient.sex === 'male' || patient.sex === 'M') gender = 'male';
  else if (patient.sex === 'female' || patient.sex === 'F') gender = 'female';

  return {
    resourceType: 'Patient',
    id: patient.id,
    name: [{ text: patient.fullName }],
    gender,
    birthDate: patient.birthDate,
  };
}

export function mapEncounterToFhirResource(encounter: {
  id: string;
  patientId: string;
  status?: string | undefined;
  encounterType?: string | undefined;
}): FhirEncounterResource {
  return {
    resourceType: 'Encounter',
    id: encounter.id,
    status: encounter.status || 'in-progress',
    class: {
      code: encounter.encounterType === 'urgency' ? 'EMER' : 'AMB',
      display: encounter.encounterType === 'urgency' ? 'Emergency' : 'Ambulatory',
    },
    subject: {
      reference: `Patient/${encounter.patientId}`,
    },
  };
}
