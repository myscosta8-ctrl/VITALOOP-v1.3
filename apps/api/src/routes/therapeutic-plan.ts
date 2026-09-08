import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { THERAPEUTIC_PLAN_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createTherapeuticPlanSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerTherapeuticPlanRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/therapeutic-plan/therapeutic-plan-schema',
    listRoutePath: '/api/v1/therapeutic-plan/therapeutic-plans',
    createRoutePath: '/api/v1/therapeutic-plan/therapeutic-plans',
    table: 'app.therapeutic_plans',
    schema: THERAPEUTIC_PLAN_SCHEMA,
    readPermission: 'therapeutic_plan.read',
    writePermission: 'therapeutic_plan.write',
    createBodySchema: createTherapeuticPlanSchema,
    validationErrorCode: 'VALIDATION_THERAPEUTIC_PLAN_FIELDS',
    extraColumns: [],
  });
};
