export interface CreateDocumentPayload {
  documentType: 'medical_certificate' | 'attendance_declaration' | 'companion_certificate' | 'medical_report' | 'procedure_request';
  title: string;
  content: string;
  daysOff?: number | undefined;
  includeCid?: boolean | undefined;
  cidCode?: string | undefined;
  companionName?: string | undefined;
}

export async function fetchDocumentTemplates() {
  const res = await fetch('/api/v1/document-templates');
  if (!res.ok) throw new Error('Erro ao carregar modelos de documentos.');
  return res.json();
}

export async function issueClinicalDocument(encounterId: string, payload: CreateDocumentPayload) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao emitir documento clínico.');
  }
  return res.json();
}

export async function fetchEncounterDocuments(encounterId: string) {
  const res = await fetch(`/api/v1/encounters/${encounterId}/documents`);
  if (!res.ok) throw new Error('Erro ao buscar documentos do atendimento.');
  return res.json();
}

export async function revokeClinicalDocument(documentId: string, revocationReason: string) {
  const res = await fetch(`/api/v1/documents/${documentId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revocationReason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao revogar documento clínico.');
  }
  return res.json();
}
