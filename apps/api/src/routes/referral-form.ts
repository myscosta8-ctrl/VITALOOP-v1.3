import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { REFERRAL_FORM_SCHEMA } from '@vitaloop/domain';
import { registerClinicalFormRoutes } from './clinical-form-route-factory.js';

const createReferralFormSchema = z.object({
  patientId: z.string().uuid(),
  encounterId: z.string().uuid(),
  formFields: z.record(z.string(), z.string()),
});

export const registerReferralFormRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  registerClinicalFormRoutes(app, pool, {
    schemaRoutePath: '/api/v1/regulation/referral-form-schema',
    listRoutePath: '/api/v1/regulation/referral-forms',
    createRoutePath: '/api/v1/regulation/referral-forms',
    table: 'app.referral_forms',
    schema: REFERRAL_FORM_SCHEMA,
    readPermission: 'regulation.read',
    writePermission: 'regulation.manage',
    createBodySchema: createReferralFormSchema,
    validationErrorCode: 'VALIDATION_REFERRAL_FORM_FIELDS',
    extraColumns: [],
  });
};
