import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { SOCIAL_WORK_ASSESSMENT_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createSocialWorkAssessmentSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerSocialWorkRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/social-work/social-work-assessment-schema',
    listRoutePath: '/api/v1/social-work/social-work-assessments',
    createRoutePath: '/api/v1/social-work/social-work-assessments',
    table: 'app.social_work_assessments',
    schema: SOCIAL_WORK_ASSESSMENT_SCHEMA,
    readPermission: 'social_work.read',
    writePermission: 'social_work.write',
    createBodySchema: createSocialWorkAssessmentSchema,
    validationErrorCode: 'VALIDATION_SOCIAL_WORK_ASSESSMENT_FIELDS',
    extraColumns: [],
  });
};
