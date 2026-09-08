import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { getBodySchema, sanitizeBodyFieldValues, validateBodyFieldValues } from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';

const createNotificationSchema = z.object({
  diseaseId: z.string().uuid(),
  patientId: z.string().uuid(),
  encounterId: z.string().uuid().optional().nullable(),
  symptomOnsetDate: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  // Campos clínicos/epidemiológicos específicos da doença (campos 17+ do
  // SINAN) — chave = código do campo, valor = código/texto preenchido.
  // Validado contra o schema da doença (getBodySchema) antes de gravar; ver
  // packages/domain/src/notification.
  bodyFields: z.record(z.string(), z.string()).optional().nullable(),
});

export const registerCompulsoryNotificationRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // 1. GET /api/v1/notifiable-diseases — lista fixa de agravos notificáveis
  app.get(
    '/api/v1/notifiable-diseases',
    { preHandler: requirePermission(pool, 'notification.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const diseases = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select id, code, name from app.notifiable_diseases where active = true order by name asc`,
        );
        return rows;
      });

      return reply.status(200).send(success(diseases, req.id));
    },
  );

  // 2. GET /api/v1/compulsory-notifications
  app.get(
    '/api/v1/compulsory-notifications',
    { preHandler: requirePermission(pool, 'notification.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const notifications = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select n.id, n.disease_id as "diseaseId", d.name as "diseaseName",
                  n.patient_id as "patientId", p.full_name as "patientName",
                  n.encounter_id as "encounterId", n.notified_by as "notifiedBy", u.name as "notifiedByName",
                  n.symptom_onset_date as "symptomOnsetDate", n.clinical_notes as "clinicalNotes",
                  n.body_fields as "bodyFields",
                  n.created_at as "createdAt"
           from app.compulsory_notifications n
           join app.notifiable_diseases d on d.id = n.disease_id
           join app.patients p on p.id = n.patient_id
           join app.users u on u.id = n.notified_by
           order by n.created_at desc`,
        );
        return rows;
      });

      return reply.status(200).send(success(notifications, req.id));
    },
  );

  // 3. POST /api/v1/compulsory-notifications
  app.post(
    '/api/v1/compulsory-notifications',
    { preHandler: requirePermission(pool, 'notification.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const body = createNotificationSchema.parse(req.body);

      const notification = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: diseaseRows } = await client.query<{ code: string }>(
          `select code from app.notifiable_diseases where id = $1`,
          [body.diseaseId],
        );
        const diseaseCode = diseaseRows[0]?.code;
        if (!diseaseCode) {
          throw new AppError({
            category: ErrorCategory.VALIDATION,
            code: 'VALIDATION_DISEASE_NOT_FOUND',
            message: 'Agravo notificável não encontrado.',
          });
        }

        // Campos clínicos são opcionais na notificação (podem ser
        // preenchidos depois) — só valida contra o schema quando a doença
        // tem um mapeado. Doenças sem schema ainda (a maioria) simplesmente
        // não têm bodyFields validados nem gravados.
        let sanitizedBodyFields: Record<string, string> = {};
        const schema = getBodySchema(diseaseCode);
        if (schema && body.bodyFields) {
          const errors = validateBodyFieldValues(schema, body.bodyFields);
          if (errors.length > 0) {
            throw new AppError({
              category: ErrorCategory.VALIDATION,
              code: 'VALIDATION_BODY_FIELDS',
              message: 'Campos clínicos inválidos.',
              details: errors.map((e) => ({ field: e.fieldCode, issue: e.message })),
            });
          }
          sanitizedBodyFields = sanitizeBodyFieldValues(schema, body.bodyFields);
        }

        const { rows } = await client.query(
          `insert into app.compulsory_notifications
             (disease_id, patient_id, encounter_id, notified_by, symptom_onset_date, clinical_notes, body_fields)
           values ($1, $2, $3, $4, $5, $6, $7)
           returning id, disease_id as "diseaseId", patient_id as "patientId", encounter_id as "encounterId",
                     notified_by as "notifiedBy", symptom_onset_date as "symptomOnsetDate",
                     clinical_notes as "clinicalNotes", body_fields as "bodyFields", created_at as "createdAt"`,
          [
            body.diseaseId,
            body.patientId,
            body.encounterId || null,
            identity.appUserId,
            body.symptomOnsetDate || null,
            body.clinicalNotes || null,
            JSON.stringify(sanitizedBodyFields),
          ],
        );
        return rows[0];
      });

      return reply.status(201).send(success(notification, req.id));
    },
  );

  // 4. GET /api/v1/notifiable-diseases/:code/body-schema — schema de campos
  // clínicos da doença, pra tela montar o formulário dinâmico. `data: null`
  // (200, não é erro) quando a doença ainda não tem schema mapeado — a tela
  // trata isso como "sem campos clínicos além da observação livre".
  app.get<{ Params: { code: string } }>(
    '/api/v1/notifiable-diseases/:code/body-schema',
    { preHandler: requirePermission(pool, 'notification.read') },
    async (req, reply) => {
      const schema = getBodySchema(req.params.code) ?? null;
      return reply.status(200).send(success(schema, req.id));
    },
  );
};
