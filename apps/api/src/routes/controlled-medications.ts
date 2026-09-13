import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  createControlledMedicationDispensedEvent,
  validateControlledMedicationDispensationInput,
  type ControlledMedicationClass,
  type ControlledMedicationDispensation,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';

const persistDomainEvent = async (
  client: pg.PoolClient,
  ev: {
    id: UUID;
    eventType: string;
    aggregateType: string;
    aggregateId: UUID;
    actorUserId: UUID | null;
    patientId: UUID;
    payload: unknown;
    schemaVersion: number;
  },
): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [ev.id, ev.eventType, ev.aggregateType, ev.aggregateId, ev.actorUserId, ev.patientId, JSON.stringify(ev.payload), ev.schemaVersion],
  );
};

const mapRow = (r: pg.QueryResultRow): ControlledMedicationDispensation => ({
  id: r.id,
  prescriptionItemId: r.prescription_item_id,
  encounterId: r.encounter_id,
  patientId: r.patient_id,
  controlledClass: r.controlled_class as ControlledMedicationClass,
  quantityDispensed: Number(r.quantity_dispensed),
  unit: r.unit,
  prescriptionNotificationNumber: r.prescription_notification_number,
  dispensedBy: r.dispensed_by,
  witnessName: r.witness_name,
  notes: r.notes,
  dispensedAt: r.dispensed_at.toISOString(),
});

const createDispensationSchema = z.object({
  prescriptionItemId: z.string().uuid(),
  quantityDispensed: z.number().positive(),
  unit: z.string(),
  prescriptionNotificationNumber: z.string().optional().nullable(),
  witnessName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const registerControlledMedicationRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // Lista os itens de prescrição do atendimento que são medicamentos
  // controlados (join com o catálogo) — usado pra montar o seletor no
  // formulário de dispensação, sem repetir a lista de medicamentos comuns.
  app.get(
    '/api/v1/encounters/:encounterId/controlled-medications/eligible-items',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const items = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `select pi.id, pi.medication_name, pi.dose, pi.dose_unit, mc.controlled_class
             from app.prescription_items pi
             join app.prescriptions p on p.id = pi.prescription_id
             join app.medication_catalog mc on mc.id = pi.medication_id
             where p.encounter_id = $1 and mc.controlled_class is not null
             order by pi.created_at desc`,
            [encounterId],
          );
          return res.rows;
        },
      );

      return reply.send(success(items, req.id));
    },
  );

  app.get(
    '/api/v1/encounters/:encounterId/controlled-medications',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const dispensations = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.controlled_medication_dispensations where encounter_id = $1 order by dispensed_at desc',
            [encounterId],
          );
          return res.rows.map(mapRow);
        },
      );

      return reply.send(success(dispensations, req.id));
    },
  );

  app.post(
    '/api/v1/encounters/:encounterId/controlled-medications',
    { preHandler: requirePermission(pool, 'medication.administer') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = createDispensationSchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }
      const dispensedBy = identity.appUserId;

      const dispensation = await withSecurityContext(
        pool!,
        { userId: dispensedBy, roles: identity.roles },
        async (client) => {
          const itemRes = await client.query(
            `select pi.id, p.encounter_id, p.patient_id, mc.controlled_class
             from app.prescription_items pi
             join app.prescriptions p on p.id = pi.prescription_id
             join app.medication_catalog mc on mc.id = pi.medication_id
             where pi.id = $1`,
            [parsedBody.prescriptionItemId],
          );
          if (itemRes.rowCount === 0 || !itemRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PRESCRIPTION_ITEM_NOT_FOUND',
              message: 'Item de prescrição não encontrado.',
            });
          }
          const item = itemRes.rows[0];

          if (item.encounter_id !== encounterId) {
            throw new AppError({
              category: ErrorCategory.VALIDATION,
              code: 'PRESCRIPTION_ITEM_ENCOUNTER_MISMATCH',
              message: 'O item de prescrição informado não pertence a este atendimento.',
            });
          }
          if (!item.controlled_class) {
            throw new AppError({
              category: ErrorCategory.VALIDATION,
              code: 'MEDICATION_NOT_CONTROLLED',
              message: 'Este item de prescrição não é um medicamento controlado — não requer rastreio especial.',
            });
          }

          const validated = validateControlledMedicationDispensationInput({
            prescriptionItemId: parsedBody.prescriptionItemId,
            encounterId,
            patientId: item.patient_id,
            controlledClass: item.controlled_class as ControlledMedicationClass,
            quantityDispensed: parsedBody.quantityDispensed,
            unit: parsedBody.unit,
            prescriptionNotificationNumber: parsedBody.prescriptionNotificationNumber ?? null,
            witnessName: parsedBody.witnessName ?? null,
            notes: parsedBody.notes ?? null,
          });

          const insertRes = await client.query(
            `insert into app.controlled_medication_dispensations (
               prescription_item_id, encounter_id, patient_id, controlled_class, quantity_dispensed, unit,
               prescription_notification_number, dispensed_by, witness_name, notes
             ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             returning *`,
            [
              validated.prescriptionItemId,
              validated.encounterId,
              validated.patientId,
              validated.controlledClass,
              validated.quantityDispensed,
              validated.unit,
              validated.prescriptionNotificationNumber,
              dispensedBy,
              validated.witnessName,
              validated.notes,
            ],
          );
          const newDispensation = mapRow(insertRes.rows[0]!);

          const event = createControlledMedicationDispensedEvent(newDispensation, dispensedBy as UUID);
          await persistDomainEvent(client, {
            id: event.eventId as UUID,
            eventType: event.type,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId as UUID,
            actorUserId: dispensedBy as UUID,
            patientId: newDispensation.patientId as UUID,
            payload: event.payload,
            schemaVersion: event.schemaVersion,
          });

          return newDispensation;
        },
      );

      return reply.status(201).send(success(dispensation, req.id));
    },
  );
};
