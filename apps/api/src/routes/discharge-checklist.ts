import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { DISCHARGE_CHECKLIST_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createDischargeChecklistSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerDischargeChecklistRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/outcome/discharge-checklist-schema',
    listRoutePath: '/api/v1/outcome/discharge-checklists',
    createRoutePath: '/api/v1/outcome/discharge-checklists',
    table: 'app.discharge_checklists',
    schema: DISCHARGE_CHECKLIST_SCHEMA,
    readPermission: 'outcome.read',
    writePermission: 'outcome.write',
    createBodySchema: createDischargeChecklistSchema,
    validationErrorCode: 'VALIDATION_DISCHARGE_CHECKLIST_FIELDS',
    extraColumns: [],
  });
};
