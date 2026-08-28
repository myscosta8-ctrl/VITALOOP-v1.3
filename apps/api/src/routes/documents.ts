import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  numberToWords,
  validateClinicalDocumentInput,
  validateRevokeClinicalDocumentInput,
  createClinicalDocumentIssuedEvent,
  createClinicalDocumentRevokedEvent,
  type ClinicalDocument,
  type DocumentTemplate,
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

const createDocumentSchema = z.object({
  documentType: z.enum([
    'medical_certificate',
    'attendance_declaration',
    'companion_certificate',
    'medical_report',
    'procedure_request',
  ]),
  title: z.string().min(3),
  content: z.string().min(10),
  daysOff: z.number().int().positive().optional().nullable(),
  includeCid: z.boolean().optional(),
  cidCode: z.string().optional().nullable(),
  companionName: z.string().optional().nullable(),
});

const revokeDocumentSchema = z.object({
  revocationReason: z.string().min(10),
});

export const registerDocumentRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // GET /api/v1/document-templates
  app.get(
    '/api/v1/document-templates',
    { preHandler: requirePermission(pool, 'document.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const templates = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.document_templates where is_active = true order by document_type asc',
          );
          return res.rows.map((r): DocumentTemplate => ({
            id: r.id,
            documentType: r.document_type,
            title: r.title,
            bodyTemplate: r.body_template,
            isActive: r.is_active,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(templates, req.id));
    },
  );

  // POST /api/v1/encounters/:encounterId/documents (Emissão)
  app.post(
    '/api/v1/encounters/:encounterId/documents',
    { preHandler: requirePermission(pool, 'document.issue') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = createDocumentSchema.parse(req.body);
      const identity = req.identity!;
      const issuerId = identity.appUserId!;

      validateClinicalDocumentInput({
        documentType: parsedBody.documentType,
        title: parsedBody.title,
        content: parsedBody.content,
        daysOff: parsedBody.daysOff ?? null,
        includeCid: parsedBody.includeCid ?? false,
        cidCode: parsedBody.cidCode ?? null,
        companionName: parsedBody.companionName ?? null,
      });

      const daysOffText = parsedBody.daysOff ? numberToWords(parsedBody.daysOff) : null;
      const integrityHash = sha256Hex(`${parsedBody.title}:${parsedBody.content}:${Date.now()}`);

      const createdDoc = await withSecurityContext(
        pool!,
        { userId: issuerId, roles: identity.roles },
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

          const docRes = await client.query(
            `insert into app.clinical_documents 
               (encounter_id, patient_id, issuer_id, document_type, title, content, days_off, days_off_text, include_cid, cid_code, companion_name, integrity_hash)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             returning *`,
            [
              encounterId,
              patientId,
              issuerId,
              parsedBody.documentType,
              parsedBody.title,
              parsedBody.content,
              parsedBody.daysOff ?? null,
              daysOffText,
              parsedBody.includeCid ?? false,
              parsedBody.includeCid ? parsedBody.cidCode || null : null,
              parsedBody.companionName ?? null,
              integrityHash,
            ],
          );
          const r = docRes.rows[0];

          const doc: ClinicalDocument = {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            issuerId: r.issuer_id,
            documentType: r.document_type,
            status: r.status,
            title: r.title,
            content: r.content,
            daysOff: r.days_off,
            daysOffText: r.days_off_text,
            includeCid: r.include_cid,
            cidCode: r.cid_code,
            companionName: r.companion_name,
            integrityHash: r.integrity_hash,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };

          const ev = createClinicalDocumentIssuedEvent(
            doc.id,
            encounterId,
            patientId,
            issuerId as UUID,
            doc.documentType,
            doc.title,
            doc.integrityHash,
          );

          await persistDomainEvent(client, ev, patientId);
          await auditAction(client, issuerId, 'create', 'clinical_document', doc.id, req, {
            encounterId,
            documentType: doc.documentType,
            integrityHash: doc.integrityHash,
          });

          return doc;
        },
      );

      return reply.status(201).send(success(createdDoc, req.id));
    },
  );

  // GET /api/v1/encounters/:encounterId/documents
  app.get(
    '/api/v1/encounters/:encounterId/documents',
    { preHandler: requirePermission(pool, 'document.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const docs = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.clinical_documents where encounter_id = $1 order by created_at desc',
            [encounterId],
          );
          return res.rows.map((r): ClinicalDocument => ({
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            issuerId: r.issuer_id,
            documentType: r.document_type,
            status: r.status,
            title: r.title,
            content: r.content,
            daysOff: r.days_off,
            daysOffText: r.days_off_text,
            includeCid: r.include_cid,
            cidCode: r.cid_code,
            companionName: r.companion_name,
            integrityHash: r.integrity_hash,
            revocationReason: r.revocation_reason,
            revokedAt: r.revoked_at ? r.revoked_at.toISOString() : null,
            revokedBy: r.revoked_by,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(docs, req.id));
    },
  );

  // POST /api/v1/documents/:documentId/revoke
  app.post(
    '/api/v1/documents/:documentId/revoke',
    { preHandler: requirePermission(pool, 'document.revoke') },
    async (req, reply) => {
      const { documentId } = req.params as { documentId: UUID };
      const parsedBody = revokeDocumentSchema.parse(req.body);
      const identity = req.identity!;
      const revokedBy = identity.appUserId!;

      validateRevokeClinicalDocumentInput(parsedBody);

      const revokedDoc = await withSecurityContext(
        pool!,
        { userId: revokedBy, roles: identity.roles },
        async (client) => {
          const docRes = await client.query('select * from app.clinical_documents where id = $1', [documentId]);
          if (docRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'DOCUMENT_NOT_FOUND',
              message: 'Documento clínico não encontrado.',
            });
          }
          const doc = docRes.rows[0];

          if (doc.status === 'revoked') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'DOCUMENT_ALREADY_REVOKED',
              message: 'O documento já se encontra cancelado/revogado.',
            });
          }

          const upRes = await client.query(
            `update app.clinical_documents
             set status = 'revoked', revocation_reason = $1, revoked_at = now(), revoked_by = $2, updated_at = now()
             where id = $3
             returning *`,
            [parsedBody.revocationReason, revokedBy, documentId],
          );
          const r = upRes.rows[0];

          const ev = createClinicalDocumentRevokedEvent(
            documentId,
            doc.encounter_id,
            doc.patient_id,
            revokedBy as UUID,
            parsedBody.revocationReason,
          );

          await persistDomainEvent(client, ev, doc.patient_id);
          await auditAction(client, revokedBy, 'update', 'clinical_document', documentId, req, {
            status: 'revoked',
            revocationReason: parsedBody.revocationReason,
          });

          return {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            issuerId: r.issuer_id,
            documentType: r.document_type,
            status: r.status,
            title: r.title,
            content: r.content,
            integrityHash: r.integrity_hash,
            revocationReason: r.revocation_reason,
            revokedAt: r.revoked_at.toISOString(),
            revokedBy: r.revoked_by,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };
        },
      );

      return reply.status(200).send(success(revokedDoc, req.id));
    },
  );
};
