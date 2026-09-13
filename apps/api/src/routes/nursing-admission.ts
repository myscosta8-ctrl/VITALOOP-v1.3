import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { NURSING_ADMISSION_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createNursingAdmissionFormSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerNursingAdmissionRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/nursing/nursing-admission-form-schema',
    listRoutePath: '/api/v1/nursing/nursing-admission-forms',
    createRoutePath: '/api/v1/nursing/nursing-admission-forms',
    table: 'app.nursing_admission_forms',
    schema: NURSING_ADMISSION_SCHEMA,
    readPermission: 'nursing.read',
    writePermission: 'nursing.write',
    createBodySchema: createNursingAdmissionFormSchema,
    validationErrorCode: 'VALIDATION_NURSING_ADMISSION_FORM_FIELDS',
    extraColumns: [],
  });
};
