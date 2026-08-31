import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  parseHl7OruMessage,
  parseHl7OrmMessage,
  mapPatientToFhirResource,
  mapEncounterToFhirResource,
  validatePharmacyDispensationInput,
  validateAndBuildAihBatch,
  buildRndsBundle,
  validateIdentityProviderConfig,
  type IntegrationMessageRecord,
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

const hl7PayloadSchema = z.object({
  rawPayload: z.string().min(10),
  encounterId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid().optional().nullable(),
});

const dicomWadoSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  studyInstanceUid: z.string().min(5),
  modality: z.string().min(1),
  description: z.string().min(3),
  seriesCount: z.number().int().positive().default(1),
  instanceCount: z.number().int().positive().default(1),
  wadoUrl: z.string().url(),
});

const pharmacyDispensationSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  prescriptionId: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    medicationName: z.string().min(2),
    quantity: z.number().positive(),
    dosage: z.string().min(1),
  })).min(1),
});

const rndsSendSchema = z.object({
  patientCns: z.string().min(11),
  encounterId: z.string().uuid(),
  clinicalSummary: z.string().min(5),
});

const aihBatchExportSchema = z.object({
  aihIds: z.array(z.string().uuid()).min(1),
});

const federatedIdpSchema = z.object({
  providerType: z.enum(['oidc', 'oauth2', 'saml2']),
  providerName: z.string().min(3),
  clientId: z.string().min(4),
});

export const registerIntegrationRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // 1. FHIR R4 Patient Resource (INT-009)
  app.get(
    '/api/v1/fhir/R4/Patient/:id',
    { preHandler: requirePermission(pool, 'integration.read') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;

      const fhirResource = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.patients where id = $1', [id]);
          if (res.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PATIENT_NOT_FOUND',
              message: 'Paciente não encontrado para conversão FHIR R4.',
            });
          }
          const p = res.rows[0];
          return mapPatientToFhirResource({
            id: p.id,
            fullName: p.full_name,
            sex: p.sex,
            birthDate: p.birth_date ? p.birth_date.toISOString().split('T')[0] : undefined,
          });
        },
      );

      return reply.status(200).send(success(fhirResource, req.id));
    },
  );

  // 2. FHIR R4 Encounter Resource (INT-009)
  app.get(
    '/api/v1/fhir/R4/Encounter/:id',
    { preHandler: requirePermission(pool, 'integration.read') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;

      const fhirResource = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.encounters where id = $1', [id]);
          if (res.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado para conversão FHIR R4.',
            });
          }
          const e = res.rows[0];
          return mapEncounterToFhirResource({
            id: e.id,
            patientId: e.patient_id,
            status: e.status,
            encounterType: e.encounter_type,
          });
        },
      );

      return reply.status(200).send(success(fhirResource, req.id));
    },
  );

  // 3. POST /api/v1/integration/hl7/oru (Laboratório LIS INT-001)
  app.post(
    '/api/v1/integration/hl7/oru',
    { preHandler: requirePermission(pool, 'integration.write') },
    async (req, reply) => {
      const parsed = hl7PayloadSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const parsedHl7 = parseHl7OruMessage(parsed.rawPayload);

      const record = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.integration_messages
               (message_type, sender, raw_payload, parsed_json, status, encounter_id, patient_id)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning *`,
            [
              'HL7_ORU_R01',
              'LIS_LABORATORY',
              parsed.rawPayload,
              JSON.stringify(parsedHl7),
              'processed',
              parsed.encounterId ?? null,
              parsed.patientId ?? null,
            ],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'integration_message', r.id, req, {
            messageType: 'HL7_ORU_R01',
            controlId: parsedHl7.controlId,
          });

          return {
            id: r.id,
            messageType: r.message_type,
            sender: r.sender,
            rawPayload: r.raw_payload,
            parsedJson: r.parsed_json,
            status: r.status,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(201).send(success(record, req.id));
    },
  );

  // 4. POST /api/v1/integration/hl7/orm (Radiologia RIS INT-002)
  app.post(
    '/api/v1/integration/hl7/orm',
    { preHandler: requirePermission(pool, 'integration.write') },
    async (req, reply) => {
      const parsed = hl7PayloadSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const parsedHl7 = parseHl7OrmMessage(parsed.rawPayload);

      const record = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.integration_messages
               (message_type, sender, raw_payload, parsed_json, status, encounter_id, patient_id)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning *`,
            [
              'HL7_ORM_O01',
              'RIS_RADIOLOGY',
              parsed.rawPayload,
              JSON.stringify(parsedHl7),
              'processed',
              parsed.encounterId ?? null,
              parsed.patientId ?? null,
            ],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'integration_message', r.id, req, {
            messageType: 'HL7_ORM_O01',
            controlId: parsedHl7.controlId,
          });

          return {
            id: r.id,
            messageType: r.message_type,
            sender: r.sender,
            rawPayload: r.raw_payload,
            parsedJson: r.parsed_json,
            status: r.status,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(201).send(success(record, req.id));
    },
  );

  // 5. POST /api/v1/integration/dicom/wado (PACS / DICOM Web INT-003)
  app.post(
    '/api/v1/integration/dicom/wado',
    { preHandler: requirePermission(pool, 'integration.write') },
    async (req, reply) => {
      const parsed = dicomWadoSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const dicomRecord = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const resStudy = await client.query(
            `insert into app.dicom_studies
               (encounter_id, patient_id, study_instance_uid, modality, description, series_count, instance_count, wado_url)
             values ($1, $2, $3, $4, $5, $6, $7, $8)
             returning *`,
            [
              parsed.encounterId,
              parsed.patientId,
              parsed.studyInstanceUid,
              parsed.modality,
              parsed.description,
              parsed.seriesCount,
              parsed.instanceCount,
              parsed.wadoUrl,
            ],
          );
          const r = resStudy.rows[0];

          await client.query(
            `insert into app.integration_messages
               (message_type, sender, raw_payload, parsed_json, status, encounter_id, patient_id)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [
              'DICOM_WADO',
              'PACS_SERVER',
              `WADO-RS UID: ${parsed.studyInstanceUid}`,
              JSON.stringify(r),
              'processed',
              parsed.encounterId,
              parsed.patientId,
            ],
          );

          await auditAction(client, actorId, 'create', 'dicom_study', r.id, req, {
            studyInstanceUid: r.study_instance_uid,
            modality: r.modality,
          });

          return {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            studyInstanceUid: r.study_instance_uid,
            modality: r.modality,
            description: r.description,
            wadoUrl: r.wado_url,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(201).send(success(dicomRecord, req.id));
    },
  );

  // 6. GET /api/v1/integration/messages (Listagem de mensagens no barramento)
  app.get(
    '/api/v1/integration/messages',
    { preHandler: requirePermission(pool, 'integration.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const messages = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.integration_messages order by created_at desc limit 50');
          return res.rows.map((r): IntegrationMessageRecord => ({
            id: r.id,
            messageType: r.message_type,
            sender: r.sender,
            rawPayload: r.raw_payload,
            parsedJson: r.parsed_json,
            status: r.status,
            errorMessage: r.error_message,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(messages, req.id));
    },
  );

  // 7. POST /api/v1/integration/pharmacy/dispense (Farmácia Central INT-004)
  app.post(
    '/api/v1/integration/pharmacy/dispense',
    { preHandler: requirePermission(pool, 'integration.write') },
    async (req, reply) => {
      const parsed = pharmacyDispensationSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      validatePharmacyDispensationInput(parsed.items);

      const dispensation = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.pharmacy_dispensations
               (encounter_id, patient_id, prescription_id, dispenser_user_id, status, items_json)
             values ($1, $2, $3, $4, 'dispensed', $5)
             returning *`,
            [
              parsed.encounterId,
              parsed.patientId,
              parsed.prescriptionId ?? null,
              actorId,
              JSON.stringify(parsed.items),
            ],
          );
          const r = res.rows[0];

          await client.query(
            `insert into app.integration_messages
               (message_type, sender, raw_payload, parsed_json, status, encounter_id, patient_id)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [
              'PHARMACY_DISPENSE',
              'PHARMACY_CENTRAL',
              `Dispensação de ${parsed.items.length} itens`,
              JSON.stringify(r),
              'processed',
              parsed.encounterId,
              parsed.patientId,
            ],
          );

          await auditAction(client, actorId, 'create', 'pharmacy_dispensation', r.id, req, {
            itemCount: parsed.items.length,
          });

          return {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            prescriptionId: r.prescription_id,
            status: r.status,
            items: r.items_json,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(201).send(success(dispensation, req.id));
    },
  );

  // 8. POST /api/v1/integration/rnds/send-bundle (Barramento RNDS/DATASUS INT-006)
  app.post(
    '/api/v1/integration/rnds/send-bundle',
    { preHandler: requirePermission(pool, 'integration.write') },
    async (req, reply) => {
      const parsed = rndsSendSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const fhirBundle = buildRndsBundle(parsed);

      const rndsLog = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.integration_messages
               (message_type, sender, raw_payload, parsed_json, status, encounter_id)
             values ($1, $2, $3, $4, $5, $6)
             returning *`,
            [
              'FHIR_REST',
              'RNDS_DATASUS',
              `Bundle FHIR enviado para RNDS para CNS ${parsed.patientCns}`,
              JSON.stringify(fhirBundle),
              'processed',
              parsed.encounterId,
            ],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'rnds_bundle', r.id, req, {
            patientCns: parsed.patientCns,
          });

          return {
            id: r.id,
            status: r.status,
            fhirBundle,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(200).send(success(rndsLog, req.id));
    },
  );

  // 9. POST /api/v1/sus/aih-batches/export (Exportação de Lote AIH INT-007)
  app.post(
    '/api/v1/sus/aih-batches/export',
    { preHandler: requirePermission(pool, 'sus.issue_aih') },
    async (req, reply) => {
      const parsed = aihBatchExportSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const batchData = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const resAihs = await client.query(
            'select id, main_procedure_code, main_cid10, status, closed_at from app.aih_requests where id = any($1::uuid[])',
            [parsed.aihIds],
          );

          const itemsToValidate = resAihs.rows.map((r) => ({
            id: r.id,
            mainProcedureCode: r.main_procedure_code,
            mainCid10: r.main_cid10,
            status: r.status,
            closedAt: r.closed_at ? r.closed_at.toISOString() : null,
            hospitalValue: 650.0,
          }));

          const builtBatch = validateAndBuildAihBatch(itemsToValidate);

          const resInsert = await client.query(
            `insert into app.aih_export_batches
               (batch_number, created_by, total_items, total_value, status, aih_ids)
             values ($1, $2, $3, $4, 'exported', $5)
             returning *`,
            [
              builtBatch.batchNumber,
              actorId,
              builtBatch.totalItems,
              builtBatch.totalValue,
              JSON.stringify(builtBatch.aihIds),
            ],
          );
          const r = resInsert.rows[0];

          await auditAction(client, actorId, 'create', 'aih_export_batch', r.id, req, {
            batchNumber: r.batch_number,
            totalItems: r.total_items,
          });

          return {
            id: r.id,
            batchNumber: r.batch_number,
            totalItems: r.total_items,
            totalValue: Number(r.total_value),
            status: r.status,
            aihIds: r.aih_ids,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(201).send(success(batchData, req.id));
    },
  );

  // 10. POST /api/v1/auth/federated/config (Identidade Institucional INT-008)
  app.post(
    '/api/v1/auth/federated/config',
    { preHandler: requirePermission(pool, 'integration.write') },
    async (req, reply) => {
      const parsed = federatedIdpSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      validateIdentityProviderConfig(parsed);

      const idpRecord = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.identity_providers
               (provider_type, provider_name, client_id, is_enabled)
             values ($1, $2, $3, true)
             returning *`,
            [parsed.providerType, parsed.providerName, parsed.clientId],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'identity_provider', r.id, req, {
            providerName: r.provider_name,
            providerType: r.provider_type,
          });

          return {
            id: r.id,
            providerType: r.provider_type,
            providerName: r.provider_name,
            clientId: r.client_id,
            isEnabled: r.is_enabled,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(201).send(success(idpRecord, req.id));
    },
  );
};
