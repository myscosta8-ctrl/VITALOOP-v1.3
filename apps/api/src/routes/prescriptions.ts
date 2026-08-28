/**
 * Rotas de Prescrição Médica Estruturada e Alertas de Alergia (Fase 3, Etapa 4/6) — MEDC-001..019.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/prescription).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  createAllergyAlertOverriddenEvent,
  createPrescriptionCanceledEvent,
  createPrescriptionRecordedEvent,
  validatePrescriptionCancelInput,
  validatePrescriptionCreateInput,
  type AllergyAlert,
  type MedicationItem,
  type Prescription,
  type PrescriptionItem,
  type PrescriptionStatus,
  type AllergyAlertSeverity,
  type RouteOfAdministration,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const requirePrescriptionWriteAndRead = (db: pg.Pool | null) => [
  requirePermission(db, 'prescription.write'),
  requirePermission(db, 'prescription.read'),
];

interface DomainEventRecord {
  readonly id: UUID;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: UUID;
  readonly actorUserId: UUID | null;
  readonly patientId: UUID;
  readonly payload: unknown;
  readonly schemaVersion: number;
}

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEventRecord): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      ev.id,
      ev.eventType,
      ev.aggregateType,
      ev.aggregateId,
      ev.actorUserId,
      ev.patientId,
      JSON.stringify(ev.payload),
      ev.schemaVersion,
    ],
  );
};

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

interface DbPrescriptionRow {
  id: string;
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id: string;
  status: PrescriptionStatus;
  notes: string | null;
  canceled_at: Date | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbItemRow {
  id: string;
  prescription_id: string;
  medication_id: string | null;
  medication_name: string;
  dose: number | string;
  dose_unit: string;
  route: RouteOfAdministration;
  frequency: string;
  duration: string | null;
  instructions: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbAlertRow {
  id: string;
  prescription_id: string;
  prescription_item_id: string | null;
  allergen: string;
  severity: AllergyAlertSeverity;
  overridden: boolean;
  override_reason: string;
  overridden_by: string;
  overridden_at: Date;
  created_at: Date;
}

const mapRowToPrescriptionItem = (row: DbItemRow): PrescriptionItem => ({
  id: row.id,
  prescriptionId: row.prescription_id,
  medicationId: row.medication_id,
  medicationName: row.medication_name,
  dose: typeof row.dose === 'number' ? row.dose : Number.parseFloat(row.dose),
  doseUnit: row.dose_unit,
  route: row.route,
  frequency: row.frequency,
  duration: row.duration,
  instructions: row.instructions,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const mapRowToAllergyAlert = (row: DbAlertRow): AllergyAlert => ({
  id: row.id,
  prescriptionId: row.prescription_id,
  prescriptionItemId: row.prescription_item_id,
  allergen: row.allergen,
  severity: row.severity,
  overridden: row.overridden,
  overrideReason: row.override_reason,
  overriddenBy: row.overridden_by,
  overriddenAt: new Date(row.overridden_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
});

const mapRowToPrescription = (
  row: DbPrescriptionRow,
  items?: readonly PrescriptionItem[],
  alerts?: readonly AllergyAlert[],
): Prescription => ({
  id: row.id,
  consultationId: row.consultation_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  status: row.status,
  notes: row.notes,
  canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
  canceledBy: row.canceled_by,
  cancelReason: row.cancel_reason,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
  items: items || [],
  alerts: alerts || [],
});

const prescriptionItemSchema = z.object({
  medicationId: z.string().optional().nullable(),
  medicationName: z.string().min(1, 'Nome do medicamento é obrigatório.'),
  activeSubstance: z.string().optional().nullable(),
  dose: z.number().gt(0, 'Dose deve ser maior que zero.'),
  doseUnit: z.string().min(1, 'Unidade da dose é obrigatória.'),
  route: z.enum(['VO', 'EV', 'IM', 'SC', 'SL', 'Inalatoria', 'Topica', 'Outra'] as const),
  frequency: z.string().min(1, 'Frequência é obrigatória.'),
  duration: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
});

const createPrescriptionBodySchema = z.object({
  items: z.array(prescriptionItemSchema).min(1, 'Adicione pelo menos um item à prescrição.'),
  notes: z.string().optional().nullable(),
  overrideJustification: z.string().optional().nullable(),
});

const cancelPrescriptionBodySchema = z.object({
  cancelReason: z.string().min(1, 'Motivo do cancelamento é obrigatório.'),
});

export const registerPrescriptionRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- GET /api/v1/medications/search (Pesquisa no Catálogo de Medicamentos) ----------
  app.get(
    '/api/v1/medications/search',
    { preHandler: requirePermission(pool, 'prescription.read') },
    async (req, reply) => {
      const querySchema = z.object({ q: z.string().default('') });
      const { q } = querySchema.parse(req.query);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const term = q.trim();

      const items = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          if (!term) {
            const res = await client.query(
              'select id, code, name, active_substance, pharmaceutical_form, default_route, is_active from app.medication_catalog where is_active = true order by name asc limit 20',
            );
            return res.rows.map((r) => ({
              id: r.id,
              code: r.code,
              name: r.name,
              activeSubstance: r.active_substance,
              pharmaceuticalForm: r.pharmaceutical_form,
              defaultRoute: r.default_route,
              isActive: r.is_active,
            })) as MedicationItem[];
          }

          const res = await client.query(
            `select id, code, name, active_substance, pharmaceutical_form, default_route, is_active
             from app.medication_catalog
             where is_active = true and (name ilike $1 or active_substance ilike $1 or code ilike $1)
             order by name asc
             limit 20`,
            [`%${term}%`],
          );

          return res.rows.map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            activeSubstance: r.active_substance,
            pharmaceuticalForm: r.pharmaceutical_form,
            defaultRoute: r.default_route,
            isActive: r.is_active,
          })) as MedicationItem[];
        },
      );

      return reply.send(success(items, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/prescriptions (Criar Prescrição Médica) ----------
  app.post(
    '/api/v1/encounters/:encounterId/prescriptions',
    { preHandler: requirePrescriptionWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsedBody = createPrescriptionBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const createdPrescription = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          // 1. Busca consulta médica ativa para o atendimento
          const consRes = await client.query(
            'select id, patient_id from app.medical_consultations where encounter_id = $1',
            [encounterId],
          );

          if (consRes.rowCount === 0 || !consRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'CONSULTATION_NOT_FOUND',
              message: 'Não é possível prescrever sem uma consulta médica iniciada.',
            });
          }

          const cons = consRes.rows[0];

          // 2. Busca histórico de alergias do paciente registradas na triagem / anamnese
          const knownAllergies: string[] = [];

          const triRes = await client.query('select history from app.triages where encounter_id = $1', [encounterId]);
          if (triRes.rowCount! > 0 && triRes.rows[0].history) {
            knownAllergies.push(triRes.rows[0].history);
          }

          const pmhRes = await client.query(
            'select past_medical_history from app.medical_consultations where id = $1',
            [cons.id],
          );
          if (pmhRes.rowCount! > 0 && pmhRes.rows[0].past_medical_history) {
            knownAllergies.push(pmhRes.rows[0].past_medical_history);
          }

          // 3. Valida no domínio e executa checagem de alergias (MEDC-011..019)
          const { validatedInput, detectedAllergies } = validatePrescriptionCreateInput({
            consultationId: cons.id,
            encounterId,
            patientId: cons.patient_id,
            items: parsedBody.items,
            notes: parsedBody.notes,
            overrideJustification: parsedBody.overrideJustification,
            knownPatientAllergies: knownAllergies,
          });

          // 4. Inserção do cabeçalho da prescrição em app.prescriptions
          const prescRes = await client.query<DbPrescriptionRow>(
            `insert into app.prescriptions (consultation_id, encounter_id, patient_id, doctor_id, status, notes)
             values ($1, $2, $3, $4, 'active', $5)
             returning *`,
            [cons.id, encounterId, cons.patient_id, doctorId, validatedInput.notes ?? null],
          );

          const prescriptionRow = prescRes.rows[0]!;

          // 5. Inserção dos itens em app.prescription_items
          const createdItems: PrescriptionItem[] = [];

          for (const itemInput of validatedInput.items) {
            const itemRes = await client.query<DbItemRow>(
              `insert into app.prescription_items (
                 prescription_id, medication_id, medication_name, dose, dose_unit, route, frequency, duration, instructions
               ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               returning *`,
              [
                prescriptionRow.id,
                itemInput.medicationId ?? null,
                itemInput.medicationName,
                itemInput.dose,
                itemInput.doseUnit,
                itemInput.route,
                itemInput.frequency,
                itemInput.duration ?? null,
                itemInput.instructions ?? null,
              ],
            );

            createdItems.push(mapRowToPrescriptionItem(itemRes.rows[0]!));
          }

          // 6. Inserção dos alertas de alergia sobrepostos em app.allergy_alerts
          const createdAlerts: AllergyAlert[] = [];

          if (detectedAllergies.length > 0) {
            for (const { item, allergen } of detectedAllergies) {
              const matchingItem = createdItems.find((i) => i.medicationName === item.medicationName);
              const alertRes = await client.query<DbAlertRow>(
                `insert into app.allergy_alerts (
                   prescription_id, prescription_item_id, allergen, severity, overridden, override_reason, overridden_by
                 ) values ($1, $2, $3, 'critical', true, $4, $5)
                 returning *`,
                [
                  prescriptionRow.id,
                  matchingItem ? matchingItem.id : null,
                  allergen,
                  validatedInput.overrideJustification!,
                  doctorId,
                ],
              );

              const alert = mapRowToAllergyAlert(alertRes.rows[0]!);
              createdAlerts.push(alert);

              const alertEvent = createAllergyAlertOverriddenEvent(
                prescriptionRow.id as UUID,
                encounterId as UUID,
                cons.patient_id as UUID,
                allergen,
                validatedInput.overrideJustification!,
                doctorId as UUID,
              );

              await persistDomainEvent(client, {
                id: alertEvent.eventId,
                eventType: alertEvent.type,
                aggregateType: alertEvent.aggregateType,
                aggregateId: alertEvent.aggregateId,
                actorUserId: (alertEvent.actorId as UUID) || (doctorId as UUID),
                patientId: cons.patient_id as UUID,
                payload: alertEvent.payload,
                schemaVersion: alertEvent.schemaVersion,
              });
            }
          }

          const newPrescription = mapRowToPrescription(prescriptionRow, createdItems, createdAlerts);

          // 7. Evento de Domínio e Auditoria de Prescrição
          const recEvent = createPrescriptionRecordedEvent(newPrescription, doctorId as UUID);
          await persistDomainEvent(client, {
            id: recEvent.eventId,
            eventType: recEvent.type,
            aggregateType: recEvent.aggregateType,
            aggregateId: recEvent.aggregateId,
            actorUserId: (recEvent.actorId as UUID) || (doctorId as UUID),
            patientId: newPrescription.patientId as UUID,
            payload: recEvent.payload,
            schemaVersion: recEvent.schemaVersion,
          });

          await auditAction(client, doctorId, 'create', 'prescription', newPrescription.id, req, {
            encounterId,
            itemCount: createdItems.length,
            allergyAlertsOverridden: createdAlerts.length,
          });

          return newPrescription;
        },
      );

      return reply.status(201).send(success(createdPrescription, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/prescriptions (Listar Prescrições do Atendimento) ----------
  app.get(
    '/api/v1/encounters/:encounterId/prescriptions',
    { preHandler: requirePermission(pool, 'prescription.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const list = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const prescRes = await client.query<DbPrescriptionRow>(
            'select * from app.prescriptions where encounter_id = $1 order by created_at desc',
            [encounterId],
          );

          const result: Prescription[] = [];

          for (const pRow of prescRes.rows) {
            const itemsRes = await client.query<DbItemRow>(
              'select * from app.prescription_items where prescription_id = $1 order by created_at asc',
              [pRow.id],
            );
            const alertsRes = await client.query<DbAlertRow>(
              'select * from app.allergy_alerts where prescription_id = $1 order by created_at asc',
              [pRow.id],
            );

            const items = itemsRes.rows.map(mapRowToPrescriptionItem);
            const alerts = alertsRes.rows.map(mapRowToAllergyAlert);

            result.push(mapRowToPrescription(pRow, items, alerts));
          }

          return result;
        },
      );

      return reply.send(success(list, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/prescriptions/:prescriptionId/cancel (Cancelar Prescrição) ----------
  app.post(
    '/api/v1/encounters/:encounterId/prescriptions/:prescriptionId/cancel',
    { preHandler: requirePrescriptionWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({
        encounterId: z.string().uuid('ID de atendimento inválido.'),
        prescriptionId: z.string().uuid('ID de prescrição inválido.'),
      });
      const { encounterId, prescriptionId } = paramsSchema.parse(req.params);
      const parsedBody = cancelPrescriptionBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const canceledPrescription = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          const validated = validatePrescriptionCancelInput({
            prescriptionId,
            cancelReason: parsedBody.cancelReason,
          });

          const pRes = await client.query<DbPrescriptionRow>(
            'select * from app.prescriptions where id = $1 and encounter_id = $2',
            [prescriptionId, encounterId],
          );

          if (pRes.rowCount === 0 || !pRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PRESCRIPTION_NOT_FOUND',
              message: 'Prescrição médica não encontrada para este atendimento.',
            });
          }

          const updateRes = await client.query<DbPrescriptionRow>(
            `update app.prescriptions
             set status = 'canceled', canceled_at = now(), canceled_by = $1, cancel_reason = $2, updated_at = now()
             where id = $3
             returning *`,
            [doctorId, validated.cancelReason, prescriptionId],
          );

          const updatedRow = updateRes.rows[0]!;

          const itemsRes = await client.query<DbItemRow>(
            'select * from app.prescription_items where prescription_id = $1',
            [prescriptionId],
          );
          const items = itemsRes.rows.map(mapRowToPrescriptionItem);

          const canceled = mapRowToPrescription(updatedRow, items);

          const cancelEv = createPrescriptionCanceledEvent(
            prescriptionId as UUID,
            encounterId as UUID,
            canceled.patientId as UUID,
            validated.cancelReason,
            doctorId as UUID,
          );

          await persistDomainEvent(client, {
            id: cancelEv.eventId,
            eventType: cancelEv.type,
            aggregateType: cancelEv.aggregateType,
            aggregateId: cancelEv.aggregateId,
            actorUserId: (cancelEv.actorId as UUID) || (doctorId as UUID),
            patientId: canceled.patientId as UUID,
            payload: cancelEv.payload,
            schemaVersion: cancelEv.schemaVersion,
          });

          await auditAction(client, doctorId, 'update', 'prescription', prescriptionId, req, {
            encounterId,
            status: 'canceled',
            cancelReason: validated.cancelReason,
          });

          return canceled;
        },
      );

      return reply.send(success(canceledPrescription, req.id));
    },
  );
};
