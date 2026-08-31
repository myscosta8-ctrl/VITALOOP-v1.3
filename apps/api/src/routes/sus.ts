import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateAihRequestInput,
  validateSigtapCompatibility,
  type SigtapProcedure,
  type AihRequest,
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

const createAihSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  mainProcedureCode: z.string().min(10),
  secondaryProcedureCode: z.string().optional().nullable(),
  mainCid10: z.string().min(3),
  secondaryCid10: z.string().optional().nullable(),
  clinicalJustification: z.string().min(15),
});

const validateCompatibilitySchema = z.object({
  procedureCode: z.string().min(10),
  patientAgeMonths: z.number().int().nonnegative(),
  patientSex: z.enum(['male', 'female', 'undetermined']),
  cid10: z.string().optional().nullable(),
});

export const registerSusRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // GET /api/v1/sus/sigtap/search (Busca no catálogo SIGTAP SUS-002)
  app.get(
    '/api/v1/sus/sigtap/search',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      const { q } = req.query as { q?: string };
      const identity = req.identity!;

      const procedures = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const searchTerm = q ? `%${q}%` : '%';
          const res = await client.query(
            `select * from app.sigtap_procedures
             where (code ilike $1 or name ilike $1) and is_active = true
             order by name asc limit 50`,
            [searchTerm],
          );
          return res.rows.map((r): SigtapProcedure => ({
            code: r.code,
            name: r.name,
            ambulatoryValue: Number(r.ambulatory_value),
            hospitalValue: Number(r.hospital_value),
            minAgeMonths: r.min_age_months,
            maxAgeMonths: r.max_age_months,
            allowedSex: r.allowed_sex,
            requireCid: r.require_cid,
            isActive: r.is_active,
            createdAt: r.created_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(procedures, req.id));
    },
  );

  // POST /api/v1/sus/validate-compatibility (Validação de compatibilidade SUS-005)
  app.post(
    '/api/v1/sus/validate-compatibility',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      const parsed = validateCompatibilitySchema.parse(req.body);
      const identity = req.identity!;

      const result = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const procRes = await client.query('select * from app.sigtap_procedures where code = $1', [parsed.procedureCode]);
          if (procRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PROCEDURE_NOT_FOUND',
              message: 'Procedimento SIGTAP não encontrado.',
            });
          }
          const r = procRes.rows[0];
          const procedure: SigtapProcedure = {
            code: r.code,
            name: r.name,
            ambulatoryValue: Number(r.ambulatory_value),
            hospitalValue: Number(r.hospital_value),
            minAgeMonths: r.min_age_months,
            maxAgeMonths: r.max_age_months,
            allowedSex: r.allowed_sex,
            requireCid: r.require_cid,
            isActive: r.is_active,
            createdAt: r.created_at.toISOString(),
          };

          return validateSigtapCompatibility(
            procedure,
            parsed.patientAgeMonths,
            parsed.patientSex,
            parsed.cid10 ?? null,
          );
        },
      );

      return reply.status(200).send(success(result, req.id));
    },
  );

  // POST /api/v1/sus/aih-requests (Emissão de laudo AIH SUS-001/003/004/005/006)
  app.post(
    '/api/v1/sus/aih-requests',
    { preHandler: requirePermission(pool, 'sus.issue_aih') },
    async (req, reply) => {
      const parsedBody = createAihSchema.parse(req.body);
      const identity = req.identity!;
      const requesterId = identity.appUserId!;

      validateAihRequestInput({
        encounterId: parsedBody.encounterId as UUID,
        patientId: parsedBody.patientId as UUID,
        mainProcedureCode: parsedBody.mainProcedureCode,
        secondaryProcedureCode: (parsedBody.secondaryProcedureCode as UUID) ?? null,
        mainCid10: parsedBody.mainCid10,
        secondaryCid10: parsedBody.secondaryCid10 ?? null,
        clinicalJustification: parsedBody.clinicalJustification,
      });

      const aihRecord = await withSecurityContext(
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

          // 3. Validação de compatibilidade SUS (SUS-005)
          const compCheck = validateSigtapCompatibility(procedure, ageMonths, patientSex, parsedBody.mainCid10);
          if (!compCheck.isValid) {
            throw new AppError({
              category: ErrorCategory.VALIDATION,
              code: 'INCOMPATIBLE_SUS_PROCEDURE',
              message: `Procedimento incompatível com as regras do SUS: ${compCheck.errors.join(' ')}`,
            });
          }

          // 4. Inserção do laudo AIH (SUS-001)
          const res = await client.query(
            `insert into app.aih_requests
               (encounter_id, patient_id, requester_id, main_procedure_code, secondary_procedure_code, main_cid10, secondary_cid10, clinical_justification, status)
             values ($1, $2, $3, $4, $5, $6, $7, $8, 'validated')
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
            ],
          );
          const r = res.rows[0];

          const aih: AihRequest = {
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
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };

          await auditAction(client, requesterId, 'create', 'aih_request', aih.id, req, {
            mainProcedureCode: aih.mainProcedureCode,
            mainCid10: aih.mainCid10,
          });

          return aih;
        },
      );

      return reply.status(201).send(success(aihRecord, req.id));
    },
  );

  // GET /api/v1/sus/aih-requests/:id
  app.get(
    '/api/v1/sus/aih-requests/:id',
    { preHandler: requirePermission(pool, 'sus.read') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;

      const aih = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.aih_requests where id = $1', [id]);
          if (res.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'AIH_REQUEST_NOT_FOUND',
              message: 'Laudo de AIH não encontrado.',
            });
          }
          const r = res.rows[0];
          return {
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
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };
        },
      );

      return reply.status(200).send(success(aih, req.id));
    },
  );
};
