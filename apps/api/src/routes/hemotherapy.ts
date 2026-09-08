import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { BLOOD_PRODUCT_REQUEST_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createBloodProductRequestSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  clinicalIndication: z.string().min(2),
  formFields: z.record(z.string(), z.string()),
});

export const registerHemotherapyRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/hemotherapy/blood-product-request-schema',
    listRoutePath: '/api/v1/hemotherapy/blood-product-requests',
    createRoutePath: '/api/v1/hemotherapy/blood-product-requests',
    table: 'app.blood_product_requests',
    schema: BLOOD_PRODUCT_REQUEST_SCHEMA,
    readPermission: 'hemotherapy.read',
    writePermission: 'hemotherapy.write',
    createBodySchema: createBloodProductRequestSchema,
    validationErrorCode: 'VALIDATION_BLOOD_PRODUCT_REQUEST_FIELDS',
    extraColumns: [
      {
        column: 'clinical_indication',
        alias: 'clinicalIndication',
        value: (body) => body.clinicalIndication,
      },
    ],
  });
};
