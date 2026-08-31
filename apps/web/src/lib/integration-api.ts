export async function fetchIntegrationMessages() {
  const res = await fetch('/api/v1/integration/messages');
  if (!res.ok) throw new Error('Erro ao buscar mensagens no barramento de integração.');
  return res.json();
}

export async function fetchFhirPatientResource(patientId: string) {
  const res = await fetch(`/api/v1/fhir/R4/Patient/${patientId}`);
  if (!res.ok) throw new Error('Erro ao obter recurso FHIR R4 Patient.');
  return res.json();
}

export async function fetchFhirEncounterResource(encounterId: string) {
  const res = await fetch(`/api/v1/fhir/R4/Encounter/${encounterId}`);
  if (!res.ok) throw new Error('Erro ao obter recurso FHIR R4 Encounter.');
  return res.json();
}

export async function sendHl7OruMessage(rawPayload: string, encounterId?: string, patientId?: string) {
  const res = await fetch('/api/v1/integration/hl7/oru', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawPayload, encounterId, patientId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao enviar mensagem HL7 ORU_R01.');
  }
  return res.json();
}

export async function dispensePharmacyMedications(encounterId: string, patientId: string, items: Array<{ medicationName: string; quantity: number; dosage: string }>) {
  const res = await fetch('/api/v1/integration/pharmacy/dispense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encounterId, patientId, items }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro na dispensação de farmácia.');
  }
  return res.json();
}

export async function exportAihBatch(aihIds: string[]) {
  const res = await fetch('/api/v1/sus/aih-batches/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aihIds }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao exportar lote de AIH.');
  }
  return res.json();
}

export async function sendRndsBundle(patientCns: string, encounterId: string, clinicalSummary: string) {
  const res = await fetch('/api/v1/integration/rnds/send-bundle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientCns, encounterId, clinicalSummary }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao enviar pacote para RNDS/DATASUS.');
  }
  return res.json();
}
