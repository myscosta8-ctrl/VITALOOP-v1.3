import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { ANTIMICROBIAL_REQUEST_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createAntimicrobialRequestSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerPharmacyAtmRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/pharmacy-atm/antimicrobial-request-schema',
    listRoutePath: '/api/v1/pharmacy-atm/antimicrobial-requests',
    createRoutePath: '/api/v1/pharmacy-atm/antimicrobial-requests',
    table: 'app.antimicrobial_requests',
    schema: ANTIMICROBIAL_REQUEST_SCHEMA,
    readPermission: 'pharmacy_atm.read',
    writePermission: 'pharmacy_atm.write',
    createBodySchema: createAntimicrobialRequestSchema,
    validationErrorCode: 'VALIDATION_ANTIMICROBIAL_REQUEST_FIELDS',
    extraColumns: [
      {
        // `medication` é derivado do próprio campo do schema (não recebido
        // separado do cliente) pra não correr risco de divergir do que foi
        // de fato validado/gravado em form_fields.
        column: 'medication',
        alias: 'medication',
        value: (_body, sanitizedFields) => sanitizedFields.medicamento ?? '',
      },
    ],
  });
};
