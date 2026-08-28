export interface CreateAdverseEventPayload {
  encounterId?: string | undefined;
  patientId?: string | undefined;
  isAnonymous?: boolean | undefined;
  eventCategory: string;
  severity: 'near_miss' | 'no_harm' | 'mild' | 'moderate' | 'severe' | 'death';
  description: string;
  immediateAction?: string | undefined;
  isEpidemiologicalNotification?: boolean | undefined;
  sinanCode?: string | undefined;
}

export interface CreateIsolationPayload {
  isolationType: 'standard' | 'contact' | 'droplet' | 'airborne' | 'protective';
  reason: string;
  pathogenSuspected?: string | undefined;
}

export async function reportAdverseEvent(payload: CreateAdverseEventPayload) {
  const res = await fetch('/api/v1/safety/adverse-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao notificar evento adverso.');
  }
  return res.json();
}

export async function fetchAdverseEvents() {
  const res = await fetch('/api/v1/safety/adverse-events');
  if (!res.ok) throw new Error('Erro ao buscar eventos adversos.');
  return res.json();
}

export async function prescribeIsolation(encounterId: string, payload: CreateIsolationPayload) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/isolations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao prescrever isolamento.');
  }
  return res.json();
}

export async function fetchEncounterIsolations(encounterId: string) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/isolations`);
  if (!res.ok) throw new Error('Erro ao buscar isolamentos do atendimento.');
  return res.json();
}

export async function endIsolation(isolationId: string) {
  const res = await fetch(`/api/v1/isolations/${isolationId}/end`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao encerrar isolamento.');
  }
  return res.json();
}
