export interface CreateAihPayload {
  encounterId: string;
  patientId: string;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | undefined;
  mainCid10: string;
  secondaryCid10?: string | undefined;
  clinicalJustification: string;
}

export async function searchSigtapProcedures(query = '') {
  const res = await fetch(`/api/v1/sus/sigtap/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Erro ao buscar procedimentos no catálogo SIGTAP.');
  return res.json();
}

export async function validateSusCompatibility(payload: {
  procedureCode: string;
  patientAgeMonths: number;
  patientSex: 'male' | 'female' | 'undetermined';
  cid10?: string | undefined;
}) {
  const res = await fetch('/api/v1/sus/validate-compatibility', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao validar compatibilidade no SUS.');
  return res.json();
}

export async function issueAihRequest(payload: CreateAihPayload) {
  const res = await fetch('/api/v1/sus/aih-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao emitir laudo de AIH.');
  }
  return res.json();
}

export async function fetchAihRequestById(id: string) {
  const res = await fetch(`/api/v1/sus/aih-requests/${id}`);
  if (!res.ok) throw new Error('Erro ao carregar laudo de AIH.');
  return res.json();
}
