import type { ApiClient } from './api-client.js';
import type { ClinicalFormSchema } from './clinical-form-types.js';

/**
 * Fábrica de cliente de API pra qualquer "solicitação clínica" de schema
 * único e fixo (Sangue, ATM) — mesma forma nos três: buscar schema, listar
 * por atendimento, criar. Extraído depois de `hemotherapy-api.ts` e
 * `pharmacy-atm-api.ts` terem nascido como cópias quase idênticas (mesma
 * causa raiz da duplicação encontrada do lado da API, ver
 * apps/api/src/routes/clinical-form-route-factory.ts).
 *
 * `notification-api.ts` não usa esta fábrica de propósito: o schema muda
 * por doença (parâmetro `:code`), e a criação tem campos extras
 * (symptomOnsetDate/clinicalNotes) que não existem nas features de schema
 * único — a forma é genuinamente diferente, não vale generalizar junto.
 */
export interface ClinicalRequestRecord {
  id: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  requestedBy: string;
  requestedByName: string;
  formFields: Record<string, string>;
  createdAt: string;
}

export interface ClinicalRequestApiConfig {
  schemaPath: string;
  listPath: string;
  createPath: string;
}

export const createClinicalRequestApi = <TRecord extends ClinicalRequestRecord, TCreateInput extends { formFields: Record<string, string> }>(
  api: ApiClient,
  config: ClinicalRequestApiConfig,
) => ({
  getSchema: async (): Promise<ClinicalFormSchema> => api.get<ClinicalFormSchema>(config.schemaPath),

  list: async (encounterId?: string): Promise<TRecord[]> =>
    api.get<TRecord[]>(encounterId ? `${config.listPath}?encounterId=${encodeURIComponent(encounterId)}` : config.listPath),

  create: async (input: TCreateInput): Promise<TRecord> => api.post<TRecord>(config.createPath, input),
});
