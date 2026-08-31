export interface CreateRegulationPayload {
  encounterId: string;
  patientId: string;
  aihRequestId?: string | undefined;
  destinationFacility: string;
  specialty: string;
  priority?: 'low' | 'medium' | 'high' | 'emergency' | undefined;
  transportType?: 'basic_ambulance' | 'uti_mobile' | 'samu' | 'own_means' | undefined;
  documents?: Array<{
    documentType: 'clinical_report' | 'exam_result' | 'aih_form';
    documentId?: string | undefined;
    notes?: string | undefined;
  }> | undefined;
}

export async function createExternalRegulation(payload: CreateRegulationPayload) {
  const res = await fetch('/api/v1/regulation/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao criar solicitação de regulação.');
  }
  return res.json();
}

export async function fetchRegulationRequests() {
  const res = await fetch('/api/v1/regulation/requests');
  if (!res.ok) throw new Error('Erro ao listar solicitações de regulação.');
  return res.json();
}

export async function updateRegulationStatus(id: string, targetStatus: string, cancellationReason?: string) {
  const res = await fetch(`/api/v1/regulation/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetStatus, cancellationReason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao atualizar status da regulação.');
  }
  return res.json();
}

export async function closeAihRequest(id: string) {
  const res = await fetch(`/api/v1/sus/aih-requests/${id}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Erro ao fechar lote de AIH.');
  return res.json();
}
