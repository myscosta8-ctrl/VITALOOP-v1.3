import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { NUTRITION_ASSESSMENT_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createNutritionAssessmentSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerNutritionRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/nutrition/nutrition-assessment-schema',
    listRoutePath: '/api/v1/nutrition/nutrition-assessments',
    createRoutePath: '/api/v1/nutrition/nutrition-assessments',
    table: 'app.nutrition_assessments',
    schema: NUTRITION_ASSESSMENT_SCHEMA,
    readPermission: 'nutrition.read',
    writePermission: 'nutrition.write',
    createBodySchema: createNutritionAssessmentSchema,
    validationErrorCode: 'VALIDATION_NUTRITION_ASSESSMENT_FIELDS',
    extraColumns: [],
  });
};
