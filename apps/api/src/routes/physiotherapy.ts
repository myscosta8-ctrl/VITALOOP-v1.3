import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { PHYSIOTHERAPY_ASSESSMENT_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createPhysiotherapyAssessmentSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerPhysiotherapyRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/physiotherapy/physiotherapy-assessment-schema',
    listRoutePath: '/api/v1/physiotherapy/physiotherapy-assessments',
    createRoutePath: '/api/v1/physiotherapy/physiotherapy-assessments',
    table: 'app.physiotherapy_assessments',
    schema: PHYSIOTHERAPY_ASSESSMENT_SCHEMA,
    readPermission: 'physiotherapy.read',
    writePermission: 'physiotherapy.write',
    createBodySchema: createPhysiotherapyAssessmentSchema,
    validationErrorCode: 'VALIDATION_PHYSIOTHERAPY_ASSESSMENT_FIELDS',
    extraColumns: [],
  });
};
