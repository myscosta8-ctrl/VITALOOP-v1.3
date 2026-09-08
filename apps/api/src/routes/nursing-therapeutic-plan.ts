import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { NURSING_THERAPEUTIC_PLAN_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createNursingTherapeuticPlanSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerNursingTherapeuticPlanRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plan-schema',
    listRoutePath: '/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plans',
    createRoutePath: '/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plans',
    table: 'app.nursing_therapeutic_plans',
    schema: NURSING_THERAPEUTIC_PLAN_SCHEMA,
    readPermission: 'nursing_therapeutic_plan.read',
    writePermission: 'nursing_therapeutic_plan.write',
    createBodySchema: createNursingTherapeuticPlanSchema,
    validationErrorCode: 'VALIDATION_NURSING_THERAPEUTIC_PLAN_FIELDS',
    extraColumns: [],
  });
};
