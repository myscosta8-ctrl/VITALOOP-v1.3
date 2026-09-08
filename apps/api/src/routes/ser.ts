import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { SER_UPDATE_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createSerUpdateSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerSerRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/ser/ser-update-schema',
    listRoutePath: '/api/v1/ser/ser-updates',
    createRoutePath: '/api/v1/ser/ser-updates',
    table: 'app.ser_updates',
    schema: SER_UPDATE_SCHEMA,
    readPermission: 'ser.read',
    writePermission: 'ser.write',
    createBodySchema: createSerUpdateSchema,
    validationErrorCode: 'VALIDATION_SER_UPDATE_FIELDS',
    extraColumns: [],
  });
};
