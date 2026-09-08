import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type SbarTransfer = ClinicalRequestRecord;

export interface CreateSbarTransferInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createSbarApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<SbarTransfer, CreateSbarTransferInput>(api, {
    schemaPath: '/api/v1/sbar/sbar-transfer-schema',
    listPath: '/api/v1/sbar/sbar-transfers',
    createPath: '/api/v1/sbar/sbar-transfers',
  });

  return {
    getSbarTransferSchema: client.getSchema,
    listSbarTransfers: client.list,
    createSbarTransfer: client.create,
  };
};
