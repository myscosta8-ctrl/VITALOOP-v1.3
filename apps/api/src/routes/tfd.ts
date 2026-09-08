import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { TFD_REQUEST_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createTfdRequestSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerTfdRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/tfd/tfd-request-schema',
    listRoutePath: '/api/v1/tfd/tfd-requests',
    createRoutePath: '/api/v1/tfd/tfd-requests',
    table: 'app.tfd_requests',
    schema: TFD_REQUEST_SCHEMA,
    readPermission: 'tfd.read',
    writePermission: 'tfd.write',
    createBodySchema: createTfdRequestSchema,
    validationErrorCode: 'VALIDATION_TFD_REQUEST_FIELDS',
    extraColumns: [],
  });
};
