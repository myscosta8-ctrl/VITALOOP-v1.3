import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { PATIENT_BELONGINGS_INVENTORY_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createPatientBelongingsSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerPatientBelongingsRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/nursing/patient-belongings-schema',
    listRoutePath: '/api/v1/nursing/patient-belongings',
    createRoutePath: '/api/v1/nursing/patient-belongings',
    table: 'app.patient_belongings_inventories',
    schema: PATIENT_BELONGINGS_INVENTORY_SCHEMA,
    readPermission: 'nursing.read',
    writePermission: 'nursing.write',
    createBodySchema: createPatientBelongingsSchema,
    validationErrorCode: 'VALIDATION_PATIENT_BELONGINGS_FIELDS',
    extraColumns: [],
  });
};
