import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateApacRequestInput,
  validateSigtapCompatibility,
  validateFormValues,
  sanitizeFormValues,
  APAC_CLINICAL_FIELDS_SCHEMA,
  APAC_AUTHORIZATION_FIELDS_SCHEMA,
  type SigtapProcedure,
  type ApacRequest,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update' | 'download' | 'view',
  resourceType: string,
  resourceId: string | null,
  req: FastifyRequest,
  details?: Record<string, unknown>,
): Promise<void> => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const ipHash = sha256Hex(ip);

  await client.query(
    `insert into app.audit_events (actor_user_id, action, resource_type, resource_id, request_id, ip_hash, after_data)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [actorUserId, action, resourceType, resourceId, req.id, ipHash, details ? JSON.stringify(details) : null],
  );
};

const mapApacRow = (r: pg.QueryResultRow): ApacRequest => ({
  id: r.id,
  encounterId: r.encounter_id,
  patientId: r.patient_id,
  requesterId: r.requester_id,
  mainProcedureCode: r.main_procedure_code,
  secondaryProcedureCode: r.secondary_procedure_code,
  mainCid10: r.main_cid10,
  secondaryCid10: r.secondary_cid10,
  clinicalJustification: r.clinical_justification,
  status: r.status,
  formFields: r.form_fields,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const authorizeApacSchema = z.object({
  formFields: z.record(z.string(), z.string()),
});

const createApacSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  mainProcedureCode: z.string().min(10),
  secondaryProcedureCode: z.string().optional().nullable(),
  mainCid10: z.string().min(3),
  secondaryCid10: z.string().optional().nullable(),
  clinicalJustification: z.string().min(15),
  formFields: z.record(z.string(), z.string()).optional(),
});

export const registerApacRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // GET /api/v1/sus/apac-clinical-fields-schema — campos administrativos/
  // descritivos do laudo que não têm coluna própria (diagnóstico, dados do
  // solicitante, bloco de autorização, estabelecimento executante).
  app.get(
    '/api/v1/sus/apac-clinical-fields-schema',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      return reply.status(200).send(success(APAC_CLINICAL_FIELDS_SCHEMA, req.id));
    },
  );

  // POST /api/v1/sus/apac-requests (Emissão de laudo APAC — irmão do AIH)
  app.post(
    '/api/v1/sus/apac-requests',
    { preHandler: requirePermission(pool, 'sus.issue_apac') },
    async (req, reply) => {
      const parsedBody = createApacSchema.parse(req.body);
      const identity = req.identity!;
      const requesterId = identity.appUserId!;

      validateApacRequestInput({
        encounterId: parsedBody.encounterId as UUID,
        patientId: parsedBody.patientId as UUID,
        mainProcedureCode: parsedBody.mainProcedureCode,
        secondaryProcedureCode: parsedBody.secondaryProcedureCode ?? null,
        mainCid10: parsedBody.mainCid10,
        secondaryCid10: parsedBody.secondaryCid10 ?? null,
        clinicalJustification: parsedBody.clinicalJustification,
      });

      const formFieldErrors = validateFormValues(APAC_CLINICAL_FIELDS_SCHEMA, parsedBody.formFields ?? {});
      if (formFieldErrors.length > 0) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'VALIDATION_APAC_CLINICAL_FIELDS',
          message: 'Campos administrativos do laudo de APAC inválidos.',
          details: formFieldErrors.map((e) => ({ field: e.fieldCode, issue: e.message })),
        });
      }
      const sanitizedFormFields = sanitizeFormValues(APAC_CLINICAL_FIELDS_SCHEMA, parsedBody.formFields ?? {});

      const apacRecord = await withSecurityContext(
        pool!,
        { userId: requesterId, roles: identity.roles },
        async (client) => {
          // 1. Busca paciente para calcular idade e sexo
          const patRes = await client.query('select birth_date, sex from app.patients where id = $1', [parsedBody.patientId]);
          if (patRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PATIENT_NOT_FOUND',
              message: 'Paciente não encontrado.',
            });
          }
          const pat = patRes.rows[0];
          const birthDate = pat.birth_date ? new Date(pat.birth_date) : new Date(2000, 0, 1);
          const ageMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
          const patientSex = pat.sex || 'female';

          // 2. Busca procedimento SIGTAP
          const procRes = await client.query('select * from app.sigtap_procedures where code = $1', [parsedBody.mainProcedureCode]);
          if (procRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PROCEDURE_NOT_FOUND',
              message: 'Procedimento SIGTAP principal não encontrado.',
            });
          }
          const rProc = procRes.rows[0];
          const procedure: SigtapProcedure = {
            code: rProc.code,
            name: rProc.name,
            ambulatoryValue: Number(rProc.ambulatory_value),
            hospitalValue: Number(rProc.hospital_value),
            minAgeMonths: rProc.min_age_months,
            maxAgeMonths: rProc.max_age_months,
            allowedSex: rProc.allowed_sex,
            requireCid: rProc.require_cid,
            isActive: rProc.is_active,
            createdAt: rProc.created_at.toISOString(),
          };

          // 3. Validação de compatibilidade SUS (mesma regra do AIH — SUS-005)
          const compCheck = validateSigtapCompatibility(procedure, ageMonths, patientSex, parsedBody.mainCid10);
          if (!compCheck.isValid) {
            throw new AppError({
              category: ErrorCategory.VALIDATION,
              code: 'INCOMPATIBLE_SUS_PROCEDURE',
              message: `Procedimento incompatível com as regras do SUS: ${compCheck.errors.join(' ')}`,
            });
          }

          // 4. Inserção do laudo APAC
          const res = await client.query(
            `insert into app.apac_requests
               (encounter_id, patient_id, requester_id, main_procedure_code, secondary_procedure_code, main_cid10, secondary_cid10, clinical_justification, form_fields, status)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'validated')
             returning *`,
            [
              parsedBody.encounterId,
              parsedBody.patientId,
              requesterId,
              parsedBody.mainProcedureCode,
              parsedBody.secondaryProcedureCode ?? null,
              parsedBody.mainCid10,
              parsedBody.secondaryCid10 ?? null,
              parsedBody.clinicalJustification,
              JSON.stringify(sanitizedFormFields),
            ],
          );
          const r = res.rows[0];
          const apac = mapApacRow(r);

          await auditAction(client, requesterId, 'create', 'apac_request', apac.id, req, {
            mainProcedureCode: apac.mainProcedureCode,
            mainCid10: apac.mainCid10,
          });

          return apac;
        },
      );

      return reply.status(201).send(success(apacRecord, req.id));
    },
  );

  // GET /api/v1/sus/apac-requests/:id
  app.get(
    '/api/v1/sus/apac-requests/:id',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;

      const apac = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.apac_requests where id = $1', [id]);
          if (res.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'APAC_REQUEST_NOT_FOUND',
              message: 'Laudo de APAC não encontrado.',
            });
          }
          return mapApacRow(res.rows[0]);
        },
      );

      return reply.status(200).send(success(apac, req.id));
    },
  );

  // GET /api/v1/sus/apac-requests — lista por atendimento e/ou status
  // (usado pela tela de autorização pra achar laudos pendentes).
  app.get<{ Querystring: { encounterId?: string; status?: string } }>(
    '/api/v1/sus/apac-requests',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      const { encounterId, status } = req.query;
      const identity = req.identity!;

      const list = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `select * from app.apac_requests
             where ($1::uuid is null or encounter_id = $1) and ($2::text is null or status = $2)
             order by created_at desc`,
            [encounterId ?? null, status ?? null],
          );
          return res.rows.map(mapApacRow);
        },
      );

      return reply.status(200).send(success(list, req.id));
    },
  );

  // GET /api/v1/sus/apac-authorization-fields-schema
  app.get(
    '/api/v1/sus/apac-authorization-fields-schema',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      return reply.status(200).send(success(APAC_AUTHORIZATION_FIELDS_SCHEMA, req.id));
    },
  );

  // POST /api/v1/sus/apac-requests/:id/authorize
  app.post(
    '/api/v1/sus/apac-requests/:id/authorize',
    { preHandler: requirePermission(pool, 'sus.authorize_apac') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const parsedBody = authorizeApacSchema.parse(req.body);
      const identity = req.identity!;
      const authorizerId = identity.appUserId!;

      const errors = validateFormValues(APAC_AUTHORIZATION_FIELDS_SCHEMA, parsedBody.formFields);
      if (errors.length > 0) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'VALIDATION_APAC_AUTHORIZATION_FIELDS',
          message: 'Campos de autorização do laudo de APAC inválidos.',
          details: errors.map((e) => ({ field: e.fieldCode, issue: e.message })),
        });
      }
      const sanitizedFields = sanitizeFormValues(APAC_AUTHORIZATION_FIELDS_SCHEMA, parsedBody.formFields);

      const apac = await withSecurityContext(
        pool!,
        { userId: authorizerId, roles: identity.roles },
        async (client) => {
          const existing = await client.query('select status from app.apac_requests where id = $1', [id]);
          if (existing.rows.length === 0) {
            throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'APAC_REQUEST_NOT_FOUND', message: 'Laudo de APAC não encontrado.' });
          }
          if (existing.rows[0].status === 'authorized') {
            throw new AppError({ category: ErrorCategory.VALIDATION, code: 'APAC_ALREADY_AUTHORIZED', message: 'Este laudo de APAC já foi autorizado.' });
          }

          const res = await client.query(
            `update app.apac_requests
             set status = 'authorized', form_fields = form_fields || $1::jsonb, updated_at = now()
             where id = $2
             returning *`,
            [JSON.stringify(sanitizedFields), id],
          );
          const apacRow = mapApacRow(res.rows[0]);

          await auditAction(client, authorizerId, 'update', 'apac_request', id, req, { action: 'authorize' });

          return apacRow;
        },
      );

      return reply.status(200).send(success(apac, req.id));
    },
  );
};
