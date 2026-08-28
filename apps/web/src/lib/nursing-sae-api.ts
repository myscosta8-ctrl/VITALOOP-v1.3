export interface NursingDiagnosisInput {
  code: string;
  title: string;
  domainName?: string;
  relatedFactors?: string;
  definingCharacteristics?: string;
}

export interface NursingCareInput {
  careDescription: string;
  frequencyHours?: number;
}

export interface CreateSaePayload {
  diagnoses: NursingDiagnosisInput[];
  prescriptions: NursingCareInput[];
}

export interface ApplyScalePayload {
  scaleType: 'braden' | 'morse' | 'glasgow' | 'mews' | 'ramsay';
  scoreDetails: Record<string, unknown>;
}

export interface CreateFluidBalancePayload {
  direction: 'intake' | 'output';
  fluidType: 'oral' | 'intravenous' | 'enteral' | 'blood_products' | 'urine' | 'emesis' | 'drainage' | 'feces';
  volumeMl: number;
  description?: string;
}

export interface InsertDevicePayload {
  deviceType: string;
  anatomicalSite: string;
  expectedReplacementDays?: number;
  notes?: string;
}

export async function createNursingSae(encounterId: string, payload: CreateSaePayload) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/nursing/sae`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao registrar SAE.');
  }
  return res.json();
}

export async function applyNursingScale(encounterId: string, payload: ApplyScalePayload) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/nursing/scales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao aplicar escala.');
  }
  return res.json();
}

export async function recordFluidBalance(encounterId: string, payload: CreateFluidBalancePayload) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/nursing/fluid-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao registrar balanço hídrico.');
  }
  return res.json();
}

export async function fetchFluidBalance(encounterId: string) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/nursing/fluid-balance`);
  if (!res.ok) throw new Error('Erro ao buscar balanço hídrico.');
  return res.json();
}

export async function insertInvasiveDevice(encounterId: string, payload: InsertDevicePayload) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/nursing/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao inserir dispositivo invasivo.');
  }
  return res.json();
}
