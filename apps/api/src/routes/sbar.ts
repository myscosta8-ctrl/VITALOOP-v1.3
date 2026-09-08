import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { SBAR_TRANSFER_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createSbarTransferSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerSbarRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/sbar/sbar-transfer-schema',
    listRoutePath: '/api/v1/sbar/sbar-transfers',
    createRoutePath: '/api/v1/sbar/sbar-transfers',
    table: 'app.sbar_transfers',
    schema: SBAR_TRANSFER_SCHEMA,
    readPermission: 'sbar.read',
    writePermission: 'sbar.write',
    createBodySchema: createSbarTransferSchema,
    validationErrorCode: 'VALIDATION_SBAR_TRANSFER_FIELDS',
    extraColumns: [],
  });
};
