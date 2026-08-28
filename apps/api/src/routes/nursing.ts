import type { FastifyInstance, FastifyRequest } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateNursingRecordInput,
  validateMedicationScheduleInput,
  validateAdministerMedicationInput,
  calculateDefaultScheduleTimes,
  validateNursingSaeInput,
  validateFluidBalanceInput,
  validateInvasiveDeviceInput,
  calculateScaleScore,
  createNursingRecordCreatedEvent,
  createPrescriptionScheduledEvent,
  createMedicationAdministeredEvent,
  createScaleAppliedEvent,
  createNursingSaeRecordedEvent,
  createFluidBalanceRecordedEvent,
  createInvasiveDeviceInsertedEvent,
  createInvasiveDeviceRemovedEvent,
  type NursingRecord,
  type MedicationSchedule,
  type MedicationAdministration,
  type DomainEvent,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update',
  resourceType: string,
  resourceId: string,
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

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEvent, patientId: UUID): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      ev.eventId,
      ev.type,
      ev.aggregateType,
      ev.aggregateId,
      ev.actorId,
      patientId,
      JSON.stringify(ev.payload),
      ev.schemaVersion,
    ],
  );
};

const createNursingRecordBodySchema = z.object({
  recordType: z.enum(['admission', 'evolution', 'annotation'] as const),
  content: z.string().min(5, 'Conteúdo deve ter no mínimo 5 caracteres.'),
  vitalSigns: z.record(z.unknown()).optional().nullable(),
});

const administerBodySchema = z.object({
  status: z.enum(['administered', 'not_administered', 'refused', 'suspended'] as const),
  notes: z.string().optional().nullable(),
  nonAdminReason: z.string().optional().nullable(),
  bedSideChecked: z.boolean().optional().default(true),
  batchNumber: z.string().optional().nullable(),
});

const scheduleBodySchema = z.object({
  scheduledTimes: z.array(z.string()).optional(),
});

export const registerNursingRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- POST /api/v1/encounters/:encounterId/nursing/records ----------
  app.post(
    '/api/v1/encounters/:encounterId/nursing/records',
    { preHandler: requirePermission(pool, 'nursing.write') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid() });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsedBody = createNursingRecordBodySchema.parse(req.body);
      const identity = req.identity!;
      const professionalId = identity.appUserId!;

      validateNursingRecordInput(parsedBody);

      try {
      const record = await withSecurityContext(
        pool!,
        { userId: professionalId, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select id, patient_id, status from app.encounters where id = $1', [encounterId]);
          if (encRes.rowCount === 0 || !encRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          const enc = encRes.rows[0];

          if (enc.status === 'completed' || enc.status === 'canceled') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'ENCOUNTER_CLOSED',
              message: 'Este atendimento já foi encerrado e não pode receber anotações de enfermagem.',
            });
          }

          const recRes = await client.query(
            `insert into app.nursing_records (encounter_id, patient_id, professional_id, record_type, content, vital_signs)
             values ($1, $2, $3, $4::app.nursing_record_type, $5, $6)
             returning *`,
            [
              encounterId,
              enc.patient_id,
              professionalId,
              parsedBody.recordType,
              parsedBody.content,
              parsedBody.vitalSigns ? JSON.stringify(parsedBody.vitalSigns) : null,
            ],
          );
          const r = recRes.rows[0];

          const createdRecord: NursingRecord = {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            professionalId: r.professional_id,
            recordType: r.record_type,
            content: r.content,
            vitalSigns: r.vital_signs,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };

          const ev = createNursingRecordCreatedEvent(
            createdRecord.id,
            encounterId as UUID,
            enc.patient_id as UUID,
            professionalId as UUID,
            parsedBody.recordType,
            parsedBody.content,
          );

          await persistDomainEvent(client, ev, enc.patient_id as UUID);

          await auditAction(client, professionalId, 'create', 'nursing_record', createdRecord.id, req, {
            encounterId,
            recordType: parsedBody.recordType,
          });

          return createdRecord;
        },
      );

      return reply.status(201).send(success(record, req.id));
      } catch (err) {
        console.error('CRITICAL NURSING POST ERROR:', err);
        throw err;
      }
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/nursing/records ----------
  app.get(
    '/api/v1/encounters/:encounterId/nursing/records',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid() });
      const { encounterId } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      const records = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `select * from app.nursing_records where encounter_id = $1 order by created_at desc`,
            [encounterId],
          );
          return res.rows.map((r) => ({
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            professionalId: r.professional_id,
            recordType: r.record_type,
            content: r.content,
            vitalSigns: r.vital_signs,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(records, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/prescriptions/:prescriptionId/schedule ----------
  app.post(
    '/api/v1/encounters/:encounterId/prescriptions/:prescriptionId/schedule',
    { preHandler: requirePermission(pool, 'medication.schedule') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid(), prescriptionId: z.string().uuid() });
      const { encounterId, prescriptionId } = paramsSchema.parse(req.params);
      const parsedBody = scheduleBodySchema.parse(req.body ?? {});
      const identity = req.identity!;
      const scheduledBy = identity.appUserId!;

      const createdSchedules = await withSecurityContext(
        pool!,
        { userId: scheduledBy, roles: identity.roles },
        async (client) => {
          const pRes = await client.query('select id, patient_id, status from app.prescriptions where id = $1 and encounter_id = $2', [prescriptionId, encounterId]);
          if (pRes.rowCount === 0 || !pRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PRESCRIPTION_NOT_FOUND',
              message: 'Prescrição médica não encontrada para este atendimento.',
            });
          }
          const p = pRes.rows[0];

          if (p.status !== 'active') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'PRESCRIPTION_NOT_ACTIVE',
              message: 'Somente prescrições médicas ativas podem ser aprazadas.',
            });
          }

          const itemsRes = await client.query('select * from app.prescription_items where prescription_id = $1', [prescriptionId]);
          if (itemsRes.rowCount === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PRESCRIPTION_ITEMS_EMPTY',
              message: 'A prescrição médica não possui itens para aprazar.',
            });
          }

          const schedules: MedicationSchedule[] = [];

          for (const item of itemsRes.rows) {
            let times: Date[] = [];

            if (parsedBody.scheduledTimes && parsedBody.scheduledTimes.length > 0) {
              validateMedicationScheduleInput(parsedBody.scheduledTimes);
              times = parsedBody.scheduledTimes.map((t) => new Date(t));
            } else {
              times = calculateDefaultScheduleTimes(item.frequency);
            }

            for (const t of times) {
              const sRes = await client.query(
                `insert into app.medication_schedules (
                   prescription_id, prescription_item_id, encounter_id, patient_id, scheduled_time, status, scheduled_by
                 ) values ($1, $2, $3, $4, $5, 'pending', $6)
                 returning *`,
                [prescriptionId, item.id, encounterId, p.patient_id, t.toISOString(), scheduledBy],
              );
              const r = sRes.rows[0];
              schedules.push({
                id: r.id,
                prescriptionId: r.prescription_id,
                prescriptionItemId: r.prescription_item_id,
                encounterId: r.encounter_id,
                patientId: r.patient_id,
                scheduledTime: r.scheduled_time.toISOString(),
                status: r.status,
                scheduledBy: r.scheduled_by,
                createdAt: r.created_at.toISOString(),
                updatedAt: r.updated_at.toISOString(),
              });
            }
          }

          const ev = createPrescriptionScheduledEvent(
            prescriptionId as UUID,
            encounterId as UUID,
            p.patient_id as UUID,
            scheduledBy as UUID,
            schedules.length,
          );

          await persistDomainEvent(client, ev, p.patient_id as UUID);

          await auditAction(client, scheduledBy, 'create', 'medication_schedule', prescriptionId, req, {
            encounterId,
            totalSchedules: schedules.length,
          });

          return schedules;
        },
      );

      return reply.status(201).send(success(createdSchedules, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/medication-schedules ----------
  app.get(
    '/api/v1/encounters/:encounterId/medication-schedules',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid() });
      const { encounterId } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      const schedules = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `select ms.*, pi.medication_name, pi.dose, pi.dose_unit, pi.route, pi.frequency
             from app.medication_schedules ms
             inner join app.prescription_items pi on ms.prescription_item_id = pi.id
             where ms.encounter_id = $1
             order by ms.scheduled_time asc`,
            [encounterId],
          );

          return res.rows.map((r) => ({
            id: r.id,
            prescriptionId: r.prescription_id,
            prescriptionItemId: r.prescription_item_id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            medicationName: r.medication_name,
            dose: parseFloat(r.dose),
            doseUnit: r.dose_unit,
            route: r.route,
            frequency: r.frequency,
            scheduledTime: r.scheduled_time.toISOString(),
            status: r.status,
            scheduledBy: r.scheduled_by,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(schedules, req.id));
    },
  );

  // ---------- POST /api/v1/medication-schedules/:scheduleId/administer ----------
  app.post(
    '/api/v1/medication-schedules/:scheduleId/administer',
    { preHandler: requirePermission(pool, 'medication.administer') },
    async (req, reply) => {
      const paramsSchema = z.object({ scheduleId: z.string().uuid() });
      const { scheduleId } = paramsSchema.parse(req.params);
      const parsedBody = administerBodySchema.parse(req.body);
      const identity = req.identity!;
      const executorId = identity.appUserId!;

      validateAdministerMedicationInput(parsedBody);

      const administration = await withSecurityContext(
        pool!,
        { userId: executorId, roles: identity.roles },
        async (client) => {
          const sRes = await client.query('select * from app.medication_schedules where id = $1', [scheduleId]);
          if (sRes.rowCount === 0 || !sRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'SCHEDULE_NOT_FOUND',
              message: 'Horário de aprazamento não encontrado.',
            });
          }
          const s = sRes.rows[0];

          if (s.status !== 'pending') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'SCHEDULE_ALREADY_PROCESSED',
              message: 'Este horário de aprazamento já foi processado ou administrado anteriormente.',
            });
          }

          // Atualiza status do horário aprazado
          await client.query('update app.medication_schedules set status = $1::app.medication_schedule_status, updated_at = now() where id = $2', [parsedBody.status, scheduleId]);

          // Grava a administração em app.medication_administrations
          const adminRes = await client.query(
            `insert into app.medication_administrations (
               schedule_id, encounter_id, patient_id, executor_id, status, notes, non_admin_reason, bed_side_checked, batch_number
             ) values ($1, $2, $3, $4, $5::app.medication_schedule_status, $6, $7, $8, $9)
             returning *`,
            [
              scheduleId,
              s.encounter_id,
              s.patient_id,
              executorId,
              parsedBody.status,
              parsedBody.notes ?? null,
              parsedBody.nonAdminReason ?? null,
              parsedBody.bedSideChecked ?? true,
              parsedBody.batchNumber ?? null,
            ],
          );
          const r = adminRes.rows[0];

          const createdAdmin: MedicationAdministration = {
            id: r.id,
            scheduleId: r.schedule_id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            executorId: r.executor_id,
            status: r.status,
            administeredAt: r.administered_at.toISOString(),
            notes: r.notes,
            nonAdminReason: r.non_admin_reason,
            bedSideChecked: r.bed_side_checked,
            batchNumber: r.batch_number,
            createdAt: r.created_at.toISOString(),
          };

          const ev = createMedicationAdministeredEvent(
            createdAdmin.id,
            scheduleId as UUID,
            s.encounter_id as UUID,
            s.patient_id as UUID,
            executorId as UUID,
            parsedBody.status,
            parsedBody.nonAdminReason,
          );

          await persistDomainEvent(client, ev, s.patient_id as UUID);

          await auditAction(client, executorId, 'create', 'medication_administration', createdAdmin.id, req, {
            encounterId: s.encounter_id,
            scheduleId,
            status: parsedBody.status,
          });

          return createdAdmin;
        },
      );

      return reply.status(201).send(success(administration, req.id));
    },
  );

  // 1. SAE (NUR-004..006)
  const createSaeSchema = z.object({
    diagnoses: z.array(
      z.object({
        code: z.string(),
        title: z.string(),
        domainName: z.string().optional(),
        relatedFactors: z.string().optional(),
        definingCharacteristics: z.string().optional(),
      }),
    ),
    prescriptions: z.array(
      z.object({
        careDescription: z.string(),
        frequencyHours: z.number().optional(),
      }),
    ),
  });

  app.post(
    '/api/v1/encounters/:encounterId/nursing/sae',
    { preHandler: requirePermission(pool, 'nursing.sae') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = createSaeSchema.parse(req.body);
      const identity = req.identity!;
      const nurseId = identity.appUserId!;

      validateNursingSaeInput(parsedBody);

      const result = await withSecurityContext(
        pool!,
        { userId: nurseId, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select patient_id from app.encounters where id = $1', [encounterId]);
          if (encRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          const patientId = encRes.rows[0].patient_id;

          const createdDiagnoses = [];
          for (const d of parsedBody.diagnoses) {
            const diagRes = await client.query(
              `insert into app.nursing_diagnoses (encounter_id, patient_id, nurse_id, code, title, domain_name, related_factors, defining_characteristics)
               values ($1, $2, $3, $4, $5, $6, $7, $8)
               returning *`,
              [encounterId, patientId, nurseId, d.code, d.title, d.domainName || null, d.relatedFactors || null, d.definingCharacteristics || null],
            );
            createdDiagnoses.push(diagRes.rows[0]);
          }

          const createdPrescriptions = [];
          for (const p of parsedBody.prescriptions) {
            const presRes = await client.query(
              `insert into app.nursing_prescriptions (encounter_id, patient_id, nurse_id, care_description, frequency_hours)
               values ($1, $2, $3, $4, $5)
               returning *`,
              [encounterId, patientId, nurseId, p.careDescription, p.frequencyHours || null],
            );
            createdPrescriptions.push(presRes.rows[0]);
          }

          const saeId = createdDiagnoses[0]?.id || createdPrescriptions[0]?.id;
          const ev = createNursingSaeRecordedEvent(
            saeId as UUID,
            encounterId,
            patientId,
            nurseId as UUID,
            createdDiagnoses.length,
            createdPrescriptions.length,
          );

          await persistDomainEvent(client, ev, patientId);
          await auditAction(client, nurseId, 'create', 'nursing_sae', saeId, req, {
            encounterId,
            diagnosesCount: createdDiagnoses.length,
            prescriptionsCount: createdPrescriptions.length,
          });

          return { diagnoses: createdDiagnoses, prescriptions: createdPrescriptions };
        },
      );

      return reply.status(201).send(success(result, req.id));
    },
  );

  // 2. Escalas Assistenciais (NUR-010)
  const applyScaleSchema = z.object({
    scaleType: z.enum(['braden', 'morse', 'glasgow', 'mews', 'ramsay']),
    scoreDetails: z.record(z.unknown()),
  });

  app.post(
    '/api/v1/encounters/:encounterId/nursing/scales',
    { preHandler: requirePermission(pool, 'nursing.scales') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = applyScaleSchema.parse(req.body);
      const identity = req.identity!;
      const evaluatorId = identity.appUserId!;

      const { totalScore, riskLevel } = calculateScaleScore(parsedBody.scaleType, parsedBody.scoreDetails);

      const evaluation = await withSecurityContext(
        pool!,
        { userId: evaluatorId, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select patient_id from app.encounters where id = $1', [encounterId]);
          if (encRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          const patientId = encRes.rows[0].patient_id;

          const evalRes = await client.query(
            `insert into app.nursing_scale_evaluations (encounter_id, patient_id, evaluator_id, scale_type, total_score, risk_level, score_details)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning *`,
            [encounterId, patientId, evaluatorId, parsedBody.scaleType, totalScore, riskLevel, JSON.stringify(parsedBody.scoreDetails)],
          );
          const evRow = evalRes.rows[0];

          if (riskLevel === 'high' || riskLevel === 'severe') {
            await client.query(
              `insert into app.patient_risk_assessments (encounter_id, patient_id, evaluator_id, risk_type, risk_level)
               values ($1, $2, $3, $4, $5)`,
              [encounterId, patientId, evaluatorId, parsedBody.scaleType, riskLevel],
            );
          }

          const ev = createScaleAppliedEvent(
            evRow.id,
            encounterId,
            patientId,
            evaluatorId as UUID,
            parsedBody.scaleType,
            totalScore,
            riskLevel,
          );

          await persistDomainEvent(client, ev, patientId);
          await auditAction(client, evaluatorId, 'create', 'nursing_scale_evaluation', evRow.id, req, {
            encounterId,
            scaleType: parsedBody.scaleType,
            totalScore,
            riskLevel,
          });

          return evRow;
        },
      );

      return reply.status(201).send(success(evaluation, req.id));
    },
  );

  app.get(
    '/api/v1/encounters/:encounterId/nursing/scales',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const evaluations = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.nursing_scale_evaluations where encounter_id = $1 order by evaluated_at desc',
            [encounterId],
          );
          return res.rows;
        },
      );

      return reply.status(200).send(success(evaluations, req.id));
    },
  );

  // 3. Balanço Hídrico (NUR-009)
  const createFluidBalanceSchema = z.object({
    direction: z.enum(['intake', 'output']),
    fluidType: z.enum(['oral', 'intravenous', 'enteral', 'blood_products', 'urine', 'emesis', 'drainage', 'feces']),
    volumeMl: z.number().int().positive(),
    description: z.string().optional(),
  });

  app.post(
    '/api/v1/encounters/:encounterId/nursing/fluid-balance',
    { preHandler: requirePermission(pool, 'nursing.balance') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = createFluidBalanceSchema.parse(req.body);
      const identity = req.identity!;
      const recorderId = identity.appUserId!;

      validateFluidBalanceInput(parsedBody);

      const record = await withSecurityContext(
        pool!,
        { userId: recorderId, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select patient_id from app.encounters where id = $1', [encounterId]);
          if (encRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          const patientId = encRes.rows[0].patient_id;

          const recRes = await client.query(
            `insert into app.fluid_balance_records (encounter_id, patient_id, recorder_id, direction, fluid_type, volume_ml, description)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning *`,
            [encounterId, patientId, recorderId, parsedBody.direction, parsedBody.fluidType, parsedBody.volumeMl, parsedBody.description || null],
          );
          const rRow = recRes.rows[0];

          const ev = createFluidBalanceRecordedEvent(
            rRow.id,
            encounterId,
            patientId,
            recorderId as UUID,
            parsedBody.direction,
            parsedBody.fluidType,
            parsedBody.volumeMl,
          );

          await persistDomainEvent(client, ev, patientId);
          await auditAction(client, recorderId, 'create', 'fluid_balance_record', rRow.id, req, {
            encounterId,
            direction: parsedBody.direction,
            volumeMl: parsedBody.volumeMl,
          });

          return rRow;
        },
      );

      return reply.status(201).send(success(record, req.id));
    },
  );

  app.get(
    '/api/v1/encounters/:encounterId/nursing/fluid-balance',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const result = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.fluid_balance_records where encounter_id = $1 order by recorded_at desc',
            [encounterId],
          );

          let intakeTotal = 0;
          let outputTotal = 0;
          for (const row of res.rows) {
            if (row.direction === 'intake') intakeTotal += Number(row.volume_ml);
            if (row.direction === 'output') outputTotal += Number(row.volume_ml);
          }
          const netBalance = intakeTotal - outputTotal;

          return { records: res.rows, summary: { intakeTotal, outputTotal, netBalance } };
        },
      );

      return reply.status(200).send(success(result, req.id));
    },
  );

  // 4. Dispositivos Invasivos (NUR-011)
  const insertDeviceSchema = z.object({
    deviceType: z.enum([
      'peripheral_venous_access', 'central_venous_access', 'urinary_catheter',
      'nasogastric_tube', 'nasoenteric_tube', 'chest_drain', 'endotracheal_tube', 'tracheostomy'
    ]),
    anatomicalSite: z.string(),
    expectedReplacementDays: z.number().int().positive().optional(),
    notes: z.string().optional(),
  });

  app.post(
    '/api/v1/encounters/:encounterId/nursing/devices',
    { preHandler: requirePermission(pool, 'nursing.device') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = insertDeviceSchema.parse(req.body);
      const identity = req.identity!;
      const inserterId = identity.appUserId!;

      validateInvasiveDeviceInput(parsedBody);

      let expectedReplacementAt: string | null = null;
      if (parsedBody.expectedReplacementDays) {
        const d = new Date();
        d.setDate(d.getDate() + parsedBody.expectedReplacementDays);
        expectedReplacementAt = d.toISOString();
      }

      const device = await withSecurityContext(
        pool!,
        { userId: inserterId, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select patient_id from app.encounters where id = $1', [encounterId]);
          if (encRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          const patientId = encRes.rows[0].patient_id;

          const devRes = await client.query(
            `insert into app.invasive_devices (encounter_id, patient_id, inserter_id, device_type, anatomical_site, expected_replacement_at, notes)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning *`,
            [encounterId, patientId, inserterId, parsedBody.deviceType, parsedBody.anatomicalSite, expectedReplacementAt, parsedBody.notes || null],
          );
          const dRow = devRes.rows[0];

          const ev = createInvasiveDeviceInsertedEvent(
            dRow.id,
            encounterId,
            patientId,
            inserterId as UUID,
            parsedBody.deviceType,
            parsedBody.anatomicalSite,
          );

          await persistDomainEvent(client, ev, patientId);
          await auditAction(client, inserterId, 'create', 'invasive_device', dRow.id, req, {
            encounterId,
            deviceType: parsedBody.deviceType,
            anatomicalSite: parsedBody.anatomicalSite,
          });

          return dRow;
        },
      );

      return reply.status(201).send(success(device, req.id));
    },
  );

  app.get(
    '/api/v1/encounters/:encounterId/nursing/devices',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const devices = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.invasive_devices where encounter_id = $1 order by inserted_at desc',
            [encounterId],
          );
          return res.rows;
        },
      );

      return reply.status(200).send(success(devices, req.id));
    },
  );

  const removeDeviceSchema = z.object({
    removalReason: z.string().min(5),
  });

  app.patch(
    '/api/v1/nursing/devices/:deviceId/remove',
    { preHandler: requirePermission(pool, 'nursing.device') },
    async (req, reply) => {
      const { deviceId } = req.params as { deviceId: UUID };
      const parsedBody = removeDeviceSchema.parse(req.body);
      const identity = req.identity!;
      const removerId = identity.appUserId!;

      const updatedDevice = await withSecurityContext(
        pool!,
        { userId: removerId, roles: identity.roles },
        async (client) => {
          const devRes = await client.query('select * from app.invasive_devices where id = $1', [deviceId]);
          if (devRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'DEVICE_NOT_FOUND',
              message: 'Dispositivo invasivo não encontrado.',
            });
          }
          const dev = devRes.rows[0];

          const upRes = await client.query(
            `update app.invasive_devices
             set status = 'removed', removed_at = now(), remover_id = $1, removal_reason = $2, updated_at = now()
             where id = $3
             returning *`,
            [removerId, parsedBody.removalReason, deviceId],
          );
          const r = upRes.rows[0];

          const ev = createInvasiveDeviceRemovedEvent(
            deviceId,
            dev.encounter_id,
            dev.patient_id,
            removerId as UUID,
            parsedBody.removalReason,
          );

          await persistDomainEvent(client, ev, dev.patient_id);
          await auditAction(client, removerId, 'update', 'invasive_device', deviceId, req, {
            status: 'removed',
            removalReason: parsedBody.removalReason,
          });

          return r;
        },
      );

      return reply.status(200).send(success(updatedDevice, req.id));
    },
  );
};

