/**
 * Rotas de Internação (ADM-001..008, proposto) — handoff 2026-09-12.
 *
 * `app.admissions` é o período ATIVO de internação (diagnóstico/justificativa
 * de admissão, médico responsável). O fechamento final (alta/óbito/
 * transferência externa) continua no fluxo de desfecho já existente
 * (`POST /api/v1/encounters/:id/outcome`, `outcomeType: 'admission_bed'`) —
 * esta rota só marca `app.admissions` como encerrada e libera o caminho pro
 * atendimento poder ir para `completed` (o gatilho `encounters_guard_admission`
 * do banco, migration 0082, rejeita `completed` com internação ainda ativa).
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  assertValidEncounterStatusTransition,
  validateAdmissionCreateInput,
  validateAdmissionUpdateInput,
  validateAdmissionDischargeInput,
  createPatientAdmittedEvent,
  createAdmissionUpdatedEvent,
  createPatientDischargedFromAdmissionEvent,
  type DomainEvent,
  type EncounterStatus,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update',
  resourceId: string,
  req: FastifyRequest,
  details?: Record<string, unknown>,
): Promise<void> => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  await client.query(
    `insert into app.audit_events (actor_user_id, action, resource_type, resource_id, request_id, ip_hash, after_data)
     values ($1, $2, 'admission', $3, $4, $5, $6)`,
    [actorUserId, action, resourceId, req.id, sha256Hex(ip), details ? JSON.stringify(details) : null],
  );
};

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEvent, patientId: UUID): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [ev.eventId, ev.type, ev.aggregateType, ev.aggregateId, ev.actorId, patientId, JSON.stringify(ev.payload), ev.schemaVersion],
  );
};

// Traduz o erro 23514 (check/raise do gatilho `encounters_guard_admission`,
// migration 0082) numa resposta HTTP clara — a mensagem já vem em português
// direto do banco, só muda o "envelope" pra AppError/409.
const rethrowAdmissionGuardError = (err: unknown): never => {
  const pgErr = err as { code?: string; message?: string };
  if (pgErr.code === '23514' && pgErr.message) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'ADMISSION_GUARD_REJECTED',
      message: pgErr.message,
    });
  }
  throw err;
};

const mapAdmissionRow = (row: Record<string, unknown>) => ({
  id: row.id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  admittingDoctorId: row.admitting_doctor_id,
  admissionDiagnosisCode: row.admission_diagnosis_code,
  admissionDiagnosisDescription: row.admission_diagnosis_description,
  admissionJustification: row.admission_justification,
  status: row.status,
  admittedAt: row.admitted_at,
  endedAt: row.ended_at,
  endReason: row.end_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const createAdmissionSchema = z.object({
  admissionDiagnosisCode: z.string().optional().nullable(),
  admissionDiagnosisDescription: z.string().min(1),
  admissionJustification: z.string().min(1),
});

const updateAdmissionSchema = z.object({
  admittingDoctorId: z.string().uuid().optional(),
  admissionDiagnosisCode: z.string().optional().nullable(),
  admissionDiagnosisDescription: z.string().min(1).optional(),
  admissionJustification: z.string().min(1).optional(),
});

const dischargeAdmissionSchema = z.object({
  status: z.enum(['discharged', 'transferred_out', 'deceased']),
  endReason: z.string().optional().nullable(),
});

export const registerAdmissionRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // 1. GET /api/v1/encounters/:encounterId/admission
  app.get(
    '/api/v1/encounters/:encounterId/admission',
    { preHandler: requirePermission(pool, 'admission.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const { encounterId } = req.params as { encounterId: UUID };

      const admission = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select * from app.admissions where encounter_id = $1 order by admitted_at desc limit 1`,
          [encounterId],
        );
        return rows[0] ? mapAdmissionRow(rows[0]) : null;
      });

      return reply.status(200).send(success(admission, req.id));
    },
  );

  // 2. POST /api/v1/encounters/:encounterId/admission (Internar - ADM-001)
  app.post(
    '/api/v1/encounters/:encounterId/admission',
    { preHandler: requirePermission(pool, 'admission.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { encounterId } = req.params as { encounterId: UUID };
      const body = createAdmissionSchema.parse(req.body);
      const admittingDoctorId = identity.appUserId!;

      const admission = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: encRows } = await client.query<{ id: string; patient_id: string; status: EncounterStatus }>(
          `select id, patient_id, status from app.encounters where id = $1 for update`,
          [encounterId],
        );
        if (encRows.length === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'ENCOUNTER_NOT_FOUND', message: 'Atendimento não encontrado.' });
        }
        const enc = encRows[0]!;

        const { rows: activeAdmRows } = await client.query(
          `select id from app.admissions where encounter_id = $1 and status = 'active'`,
          [encounterId],
        );
        if (activeAdmRows.length > 0) {
          throw new AppError({
            category: ErrorCategory.CONFLICT,
            code: 'ACTIVE_ADMISSION_EXISTS',
            message: 'O atendimento já possui uma internação ativa.',
          });
        }

        // Bloco 8 (regra absoluta: "internação só após avaliação médica") —
        // achado de auditoria: nem esta rota nem a máquina de estados
        // exigiam uma consulta médica de fato registrada antes de internar.
        // `encounter.status` chega a 'in_consultation' assim que o médico
        // "assume" o atendimento na fila (Bloco 6, antes de preencher
        // qualquer campo da consulta) — sem esta checagem, seria possível
        // internar um paciente que nunca foi de fato avaliado. Mesmo padrão
        // já usado em outcomes.ts para 'admission_bed' (Bloco 6).
        const { rows: consRows } = await client.query(
          'select id from app.medical_consultations where encounter_id = $1',
          [encounterId],
        );
        if (consRows.length === 0) {
          throw new AppError({
            category: ErrorCategory.VALIDATION,
            code: 'ADMISSION_REQUIRES_MEDICAL_CONSULTATION',
            message: 'Internação só pode ser decidida após avaliação médica — registre a consulta médica antes de internar.',
          });
        }

        assertValidEncounterStatusTransition(enc.status, 'admitted');

        const input = {
          encounterId,
          patientId: enc.patient_id as UUID,
          admittingDoctorId: admittingDoctorId as UUID,
          admissionDiagnosisCode: body.admissionDiagnosisCode ?? null,
          admissionDiagnosisDescription: body.admissionDiagnosisDescription,
          admissionJustification: body.admissionJustification,
        };
        validateAdmissionCreateInput(input);

        const { rows: admRows } = await client.query(
          `insert into app.admissions (
             encounter_id, patient_id, admitting_doctor_id, admission_diagnosis_code,
             admission_diagnosis_description, admission_justification, created_by, updated_by
           ) values ($1, $2, $3, $4, $5, $6, $7, $7)
           returning *`,
          [
            encounterId,
            enc.patient_id,
            admittingDoctorId,
            input.admissionDiagnosisCode,
            input.admissionDiagnosisDescription,
            input.admissionJustification,
            admittingDoctorId,
          ],
        );
        const createdAdmission = admRows[0]!;

        try {
          await client.query(`update app.encounters set status = 'admitted', updated_by = $1, updated_at = now() where id = $2`, [
            admittingDoctorId,
            encounterId,
          ]);
        } catch (err) {
          rethrowAdmissionGuardError(err);
        }

        const domainEvent = createPatientAdmittedEvent({
          admissionId: createdAdmission.id as UUID,
          encounterId,
          patientId: enc.patient_id as UUID,
          admittingDoctorId: admittingDoctorId as UUID,
          admissionDiagnosisCode: input.admissionDiagnosisCode,
          admissionDiagnosisDescription: input.admissionDiagnosisDescription,
        });
        await persistDomainEvent(client, domainEvent, enc.patient_id as UUID);
        await auditAction(client, admittingDoctorId, 'create', createdAdmission.id, req, createdAdmission);

        return mapAdmissionRow(createdAdmission);
      });

      return reply.status(201).send(success(admission, req.id));
    },
  );

  // 3. PATCH /api/v1/encounters/:encounterId/admission (Evolução/handover - ADM-00x)
  app.patch(
    '/api/v1/encounters/:encounterId/admission',
    { preHandler: requirePermission(pool, 'admission.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { encounterId } = req.params as { encounterId: UUID };
      const body = updateAdmissionSchema.parse(req.body);
      const updatedBy = identity.appUserId!;

      const admission = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: admRows } = await client.query(
          `select * from app.admissions where encounter_id = $1 and status = 'active' for update`,
          [encounterId],
        );
        if (admRows.length === 0) {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'ACTIVE_ADMISSION_NOT_FOUND',
            message: 'Internação ativa não encontrada para este atendimento.',
          });
        }
        const current = admRows[0]!;

        validateAdmissionUpdateInput({
          admissionId: current.id as UUID,
          updatedBy: updatedBy as UUID,
          admittingDoctorId: body.admittingDoctorId as UUID | undefined,
          admissionDiagnosisCode: body.admissionDiagnosisCode,
          admissionDiagnosisDescription: body.admissionDiagnosisDescription,
          admissionJustification: body.admissionJustification,
        });

        const { rows: updatedRows } = await client.query(
          `update app.admissions set
             admitting_doctor_id = coalesce($1, admitting_doctor_id),
             admission_diagnosis_code = coalesce($2, admission_diagnosis_code),
             admission_diagnosis_description = coalesce($3, admission_diagnosis_description),
             admission_justification = coalesce($4, admission_justification),
             updated_by = $5,
             updated_at = now()
           where id = $6
           returning *`,
          [
            body.admittingDoctorId ?? null,
            body.admissionDiagnosisCode ?? null,
            body.admissionDiagnosisDescription ?? null,
            body.admissionJustification ?? null,
            updatedBy,
            current.id,
          ],
        );
        const updated = updatedRows[0]!;

        const domainEvent = createAdmissionUpdatedEvent({
          admissionId: updated.id as UUID,
          encounterId,
          patientId: updated.patient_id as UUID,
          updatedBy: updatedBy as UUID,
        });
        await persistDomainEvent(client, domainEvent, updated.patient_id as UUID);
        await auditAction(client, updatedBy, 'update', updated.id, req, { changes: body });

        return mapAdmissionRow(updated);
      });

      return reply.status(200).send(success(admission, req.id));
    },
  );

  // 4. POST /api/v1/encounters/:encounterId/admission/discharge (Encerrar internação - ADM-00x)
  //
  // Só encerra `app.admissions` — o desfecho/status `completed` do atendimento
  // continua exigindo `POST /api/v1/encounters/:id/outcome` (outcomeType
  // 'admission_bed'), chamado separadamente pelo frontend depois desta rota.
  app.post(
    '/api/v1/encounters/:encounterId/admission/discharge',
    { preHandler: requirePermission(pool, 'admission.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { encounterId } = req.params as { encounterId: UUID };
      const body = dischargeAdmissionSchema.parse(req.body);
      const dischargedBy = identity.appUserId!;

      const result = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: admRows } = await client.query(
          `select * from app.admissions where encounter_id = $1 and status = 'active' for update`,
          [encounterId],
        );
        if (admRows.length === 0) {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'ACTIVE_ADMISSION_NOT_FOUND',
            message: 'Internação ativa não encontrada para este atendimento.',
          });
        }
        const current = admRows[0]!;

        validateAdmissionDischargeInput({
          admissionId: current.id as UUID,
          encounterId,
          patientId: current.patient_id as UUID,
          dischargedBy: dischargedBy as UUID,
          status: body.status,
          endReason: body.endReason,
        });

        const { rows: updatedRows } = await client.query(
          `update app.admissions set status = $1, ended_at = now(), end_reason = $2, updated_by = $3, updated_at = now()
           where id = $4
           returning *`,
          [body.status, body.endReason ?? null, dischargedBy, current.id],
        );
        const updated = updatedRows[0]!;

        const domainEvent = createPatientDischargedFromAdmissionEvent({
          admissionId: updated.id as UUID,
          encounterId,
          patientId: updated.patient_id as UUID,
          dischargedBy: dischargedBy as UUID,
          status: body.status,
        });
        await persistDomainEvent(client, domainEvent, updated.patient_id as UUID);
        await auditAction(client, dischargedBy, 'update', updated.id, req, { status: body.status, endReason: body.endReason ?? null });

        return mapAdmissionRow(updated);
      });

      return reply.status(200).send(success(result, req.id));
    },
  );
};
