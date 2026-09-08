import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { PHARMACY_FOLLOWUP_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createPharmacyFollowUpSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerPharmacyFollowUpRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/pharmacy-followup/pharmacy-followup-schema',
    listRoutePath: '/api/v1/pharmacy-followup/pharmacy-followups',
    createRoutePath: '/api/v1/pharmacy-followup/pharmacy-followups',
    table: 'app.pharmacy_followups',
    schema: PHARMACY_FOLLOWUP_SCHEMA,
    readPermission: 'pharmacy_followup.read',
    writePermission: 'pharmacy_followup.write',
    createBodySchema: createPharmacyFollowUpSchema,
    validationErrorCode: 'VALIDATION_PHARMACY_FOLLOWUP_FIELDS',
    extraColumns: [],
  });
};
