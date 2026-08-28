/**
 * Rotas de Paciente (Fase 2, Etapa 2/6) — Doc 1 §11/§12; Doc 2 §64; PAT-001..017.
 *
 * Reaproveita integralmente as regras de `@vitaloop/domain` (packages/domain/src/patient) —
 * nenhuma regra de negócio é duplicada aqui. Autorização via `requirePermission`
 * (RBAC + Need-to-Know, `app.authorize()`), conexão real como `vitaloop_app`
 * (RLS efetiva — ver `docs/PHASE_2_STEP_1_REPORT.md`). Cada operação de escrita
 * roda em UMA transação (`withSecurityContext`): insert + evento de domínio +
 * auditoria juntos, ou nada.
 *
 * Decisão de design registrada (achado de RLS, Fase 2/Etapa 1): `INSERT ...
 * RETURNING` exige também a policy de SELECT da tabela. Por isso toda rota de
 * criação/edição exige a permissão de escrita E a de leitura do mesmo recurso
 * (`requireReadAndWrite`) — não contorna a policy, apenas reflete o que ela
 * já exige de fato.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { UUID } from '@vitaloop/shared';
import {
  assertAllergyContentUnchanged,
  assertNoImmutablePatientFieldsChanged,
  createPatientActiveProblemRecordedEvent,
  createPatientAllergyRecordedEvent,
  createPatientAllergyStatusChangedEvent,
  createPatientAntecedentRecordedEvent,
  createPatientContactAddedEvent,
  createPatientContinuousMedicationRecordedEvent,
  createPatientDuplicateDetectedEvent,
  createPatientInactivatedEvent,
  createPatientMergeRequestedEvent,
  createPatientMergeReviewedEvent,
  createPatientRegisteredEvent,
  createPatientUpdatedEvent,
  detectDuplicates,
  duplicateNotConfirmedError,
  mergeRequestStateMachine,
  normalizePatientCreateInput,
  patientNotFoundError,
  requiresHumanConfirmation,
  validateMergeRequestPatients,
  validatePatientActiveProblemCreateInput,
  validatePatientAllergyCreateInput,
  validatePatientAntecedentCreateInput,
  validatePatientContactCreateInput,
  validatePatientContinuousMedicationCreateInput,
} from '@vitaloop/domain';
import type { PatientDuplicateCandidateSource } from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

// ---------- Helpers de autorização compostos (apenas composição — não altera RBAC/RLS) ----------

/**
 * Exige permissão de escrita E de leitura do mesmo recurso — necessário para
 * qualquer rota que faça `INSERT/UPDATE ... RETURNING` (ver nota de topo).
 */
const requireReadAndWrite = (db: pg.Pool | null, writePerm: string, readPerm: string) => [
  requirePermission(db, writePerm),
  requirePermission(db, readPerm),
];

/**
 * Autoriza se o ator tiver QUALQUER uma das permissões informadas — usado
 * apenas onde a própria policy de RLS já usa `OR` entre duas permissões
 * (`patient_merge_requests_read`), para não bloquear na camada HTTP algo que
 * o banco permitiria.
 */
const requireAnyPermission =
  (db: pg.Pool | null, permCodes: readonly string[]) =>
  async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    let lastError: unknown;
    for (const perm of permCodes) {
      try {
        await requirePermission(db, perm)(req, reply);
        return;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError instanceof AppError
      ? lastError
      : new AppError({
          category: ErrorCategory.ACCESS,
          code: 'ACCESS_DENIED',
          message: 'Acesso negado.',
        });
  };

// ---------- Helpers de persistência transversal (evento de domínio + auditoria) ----------

interface DomainEventRow {
  readonly eventId: UUID;
  readonly type: string;
  readonly aggregateType: string;
  readonly aggregateId: UUID;
  readonly actorId: UUID | null;
  readonly occurredAt: string;
  readonly payload: unknown;
  readonly schemaVersion: number;
  readonly correlationId?: UUID;
  readonly causationId?: UUID;
  readonly idempotencyKey?: string;
}

/** Grava um evento de domínio já criado pelas fábricas de `@vitaloop/domain` — fonte única para a timeline (Doc 2 §38). */
const insertDomainEvent = async (
  client: pg.PoolClient,
  event: DomainEventRow,
  patientId: UUID,
): Promise<void> => {
  await client.query(
    `insert into app.domain_events
       (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id,
        payload, schema_version, correlation_id, causation_id, idempotency_key, occurred_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      event.eventId,
      event.type,
      event.aggregateType,
      event.aggregateId,
      event.actorId,
      patientId,
      JSON.stringify(event.payload),
      event.schemaVersion,
      event.correlationId ?? null,
      event.causationId ?? null,
      event.idempotencyKey ?? null,
      event.occurredAt,
    ],
  );
};

type AuditAction = 'create' | 'update' | 'view';

/** Grava trilha de auditoria append-only (Doc 2 §39) — mesma transação da operação. */
const insertAuditEvent = async (
  client: pg.PoolClient,
  params: {
    readonly actorUserId: UUID | null;
    readonly action: AuditAction;
    readonly resourceType: string;
    readonly resourceId: UUID;
    readonly patientId: UUID;
    readonly requestId: string;
    readonly beforeData?: unknown;
    readonly afterData?: unknown;
  },
): Promise<void> => {
  await client.query(
    `insert into app.audit_events
       (actor_user_id, action, resource_type, resource_id, patient_id, request_id, before_data, after_data)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      params.actorUserId,
      params.action,
      params.resourceType,
      params.resourceId,
      params.patientId,
      params.requestId,
      params.beforeData ? JSON.stringify(params.beforeData) : null,
      params.afterData ? JSON.stringify(params.afterData) : null,
    ],
  );
};

// ---------- Idempotência (Doc 2 §48) — aplicada à criação de paciente ----------

interface IdempotencyOutcome<T> {
  readonly replayed: boolean;
  readonly status: number;
  readonly body: T;
}

/**
 * Doc 2 §48: chave por (scope, actor, key). Se a MESMA chave+ator+escopo já
 * respondeu antes com o MESMO corpo (hash), reproduz a resposta gravada sem
 * repetir a operação. Se a chave existe com corpo DIFERENTE, é um erro de
 * conflito (reuso indevido da chave) — nunca executa a operação de novo
 * silenciosamente com dados diferentes.
 */
const withIdempotency = async <T>(
  client: pg.PoolClient,
  params: { readonly scope: string; readonly actorUserId: UUID; readonly key: string; readonly requestBody: unknown },
  fn: () => Promise<{ status: number; body: T }>,
): Promise<IdempotencyOutcome<T>> => {
  const requestHash = sha256Hex(JSON.stringify(params.requestBody));
  const existing = await client.query<{
    request_hash: string;
    response_status: number | null;
    response_body: T | null;
  }>(
    `select request_hash, response_status, response_body
       from app.idempotency_keys
      where scope = $1 and actor_user_id = $2 and key = $3`,
    [params.scope, params.actorUserId, params.key],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    const row = existing.rows[0]!;
    if (row.request_hash !== requestHash) {
      throw new AppError({
        category: ErrorCategory.CONFLICT,
        code: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_BODY',
        message: 'Idempotency-Key já usada para uma requisição com corpo diferente.',
      });
    }
    if (row.response_status !== null && row.response_body !== null) {
      return { replayed: true, status: row.response_status, body: row.response_body };
    }
  }

  const result = await fn();

  await client.query(
    `insert into app.idempotency_keys (key, scope, actor_user_id, request_hash, response_status, response_body)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (scope, actor_user_id, key) do update
       set response_status = excluded.response_status, response_body = excluded.response_body`,
    [params.key, params.scope, params.actorUserId, requestHash, result.status, JSON.stringify(result.body)],
  );

  return { replayed: false, status: result.status, body: result.body };
};

// ---------- Zod: validação de forma do corpo (regras de negócio ficam no domínio) ----------

const PatientCreateBody = z.object({
  fullName: z.string().min(1),
  socialName: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  sex: z.enum(['female', 'male', 'undetermined']).optional().nullable(),
  cpf: z.string().optional().nullable(),
  cns: z.string().optional().nullable(),
  rg: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  institutionId: z.string().uuid().optional().nullable(),
  /** Confirmação explícita exigida quando há duplicidade forte/conflito (Doc 1 §11). */
  confirmDuplicate: z.boolean().optional(),
});

// `.passthrough()`: campos imutáveis (ex.: medicalRecordNumber) NÃO fazem parte
// deste schema de propósito — mas precisam CHEGAR ao domínio para serem
// rejeitados por `assertNoImmutablePatientFieldsChanged` com o erro correto
// (PATIENT_IMMUTABLE_FIELD), em vez de serem silenciosamente descartados pelo
// comportamento padrão do zod (strip de chaves desconhecidas), que mascararia
// a tentativa como se o campo nunca tivesse sido enviado.
const PatientUpdateBody = PatientCreateBody.partial()
  .omit({ confirmDuplicate: true })
  .extend({ confirmDuplicate: z.boolean().optional() })
  .passthrough();

const ContactBody = z.object({
  name: z.string().min(1),
  relationship: z.string().optional().nullable(),
  phone: z.string().min(1),
  isEmergency: z.boolean().optional(),
});

const AllergyBody = z.object({
  substance: z.string().min(1),
  reaction: z.string().optional().nullable(),
  severity: z.enum(['mild', 'moderate', 'severe', 'unknown']).optional(),
});

const AllergyStatusBody = z.object({
  status: z.enum(['active', 'resolved', 'entered_in_error']),
});

const AntecedentBody = z.object({
  description: z.string().min(1),
  category: z.string().optional().nullable(),
});

const ContinuousMedicationBody = z.object({
  medication: z.string().min(1),
  dose: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
});

const ActiveProblemBody = z.object({
  description: z.string().min(1),
  cidCode: z.string().optional().nullable(),
});

const MergeRequestBody = z.object({
  targetPatientId: z.string().uuid(),
  reason: z.string().min(1),
});

const MergeReviewBody = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional().nullable(),
});

const DuplicateReviewBody = z.object({
  reviewStatus: z.enum(['confirmed_duplicate', 'confirmed_distinct', 'dismissed']),
});

/**
 * Remove chaves com valor `undefined` (mantém `null`) — necessário porque o
 * `zod` tipa campos opcionais como `T | undefined` mesmo quando ausentes, e o
 * projeto usa `exactOptionalPropertyTypes: true` (tsconfig.base.json), que
 * distingue "propriedade ausente" de "propriedade presente com undefined".
 * Os tipos de domínio (`PatientCreateInput` etc.) esperam a primeira forma.
 */
type WithoutUndefined<T> = { [K in keyof T]: Exclude<T[K], undefined> };
const stripUndefined = <T extends object>(obj: T): WithoutUndefined<T> => {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as WithoutUndefined<T>;
};

const parseOrThrow = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_INVALID_BODY',
      message: 'Corpo da requisição inválido.',
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message,
      })),
    });
  }
  return parsed.data;
};

const uuidParam = (req: FastifyRequest, name: string): UUID => {
  const value = (req.params as Record<string, string>)[name];
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_INVALID_PARAM',
      message: `Parâmetro '${name}' precisa ser um UUID válido.`,
    });
  }
  return value as UUID;
};

// ---------- Row -> DTO mappers (snake_case do banco -> camelCase da API) ----------

const mapPatientRow = (row: Record<string, unknown>) => ({
  id: row.id,
  medicalRecordNumber: row.medical_record_number,
  fullName: row.full_name,
  socialName: row.social_name,
  motherName: row.mother_name,
  birthDate: row.birth_date,
  sex: row.sex,
  cpf: row.cpf,
  cns: row.cns,
  rg: row.rg,
  phone: row.phone,
  address: row.address,
  city: row.city,
  state: row.state,
  institutionId: row.institution_id,
  status: row.status,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapContactRow = (row: Record<string, unknown>) => ({
  id: row.id,
  patientId: row.patient_id,
  name: row.name,
  relationship: row.relationship,
  phone: row.phone,
  isEmergency: row.is_emergency,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAllergyRow = (row: Record<string, unknown>) => ({
  id: row.id,
  patientId: row.patient_id,
  substance: row.substance,
  reaction: row.reaction,
  severity: row.severity,
  status: row.status,
  recordedBy: row.recorded_by,
  recordedAt: row.recorded_at,
});

const mapAntecedentRow = (row: Record<string, unknown>) => ({
  id: row.id,
  patientId: row.patient_id,
  description: row.description,
  category: row.category,
  status: row.status,
  recordedBy: row.recorded_by,
  recordedAt: row.recorded_at,
});

const mapMedicationRow = (row: Record<string, unknown>) => ({
  id: row.id,
  patientId: row.patient_id,
  medication: row.medication,
  dose: row.dose,
  frequency: row.frequency,
  status: row.status,
  recordedBy: row.recorded_by,
  recordedAt: row.recorded_at,
});

const mapProblemRow = (row: Record<string, unknown>) => ({
  id: row.id,
  patientId: row.patient_id,
  description: row.description,
  cidCode: row.cid_code,
  status: row.status,
  recordedBy: row.recorded_by,
  recordedAt: row.recorded_at,
  resolvedAt: row.resolved_at,
});

const mapMergeRequestRow = (row: Record<string, unknown>) => ({
  id: row.id,
  sourcePatientId: row.source_patient_id,
  targetPatientId: row.target_patient_id,
  reason: row.reason,
  status: row.status,
  requestedBy: row.requested_by,
  requestedAt: row.requested_at,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNotes: row.review_notes,
});

const mapDuplicateCandidateRow = (row: Record<string, unknown>) => ({
  id: row.id,
  patientAId: row.patient_a_id,
  patientBId: row.patient_b_id,
  matchStrength: row.match_strength,
  matchReason: row.match_reason,
  reviewStatus: row.review_status,
  detectedAt: row.detected_at,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
});

// ---------- Registro das rotas ----------

export const registerPatientRoutes = (app: FastifyInstance, db: pg.Pool | null): void => {
  const readAndWritePatient = requireReadAndWrite(db, 'patient.write', 'patient.read');
  const readPatient = requirePermission(db, 'patient.read');

  const requireDb = (): pg.Pool => {
    if (!db) {
      throw new AppError({
        category: ErrorCategory.INTERNAL,
        code: 'PATIENTS_BACKEND_UNAVAILABLE',
        message: 'Banco indisponível.',
      });
    }
    return db;
  };

  // ===== POST /api/v1/patients — PAT-001..008 =====
  app.post('/api/v1/patients', { preHandler: readAndWritePatient }, async (req, reply) => {
    const body = parseOrThrow(PatientCreateBody, req.body);
    const pool = requireDb();
    const identity = req.identity!;
    const actorId = identity.appUserId as UUID;

    // institutionId: já validado como UUID pelo zod (`.uuid()`) — cast de marca (branding), não de tipo estrutural.
    const normalized = normalizePatientCreateInput(
      stripUndefined(body) as unknown as Parameters<typeof normalizePatientCreateInput>[0],
    );
    if (!normalized.ok) throw normalized.error;

    const idempotencyKey = req.headers['idempotency-key'];

    const outcome = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const runCreate = async (): Promise<{ status: number; body: ReturnType<typeof mapPatientRow> }> => {
          // Pré-checagem de duplicidade (Doc 1 §11: confirmação antes de criar
          // provável duplicado) — usa o MESMO algoritmo determinístico já
          // testado real no banco (T3/T4), aqui em TS pura via `@vitaloop/domain`.
          const candidatesRes = await client.query<{
            id: UUID;
            full_name: string;
            cpf: string | null;
            cns: string | null;
            birth_date: string | null;
            status: PatientDuplicateCandidateSource['status'];
          }>(
            `select id, full_name, cpf, cns, birth_date, status
               from app.patients
              where status = 'active'
                and (
                  ($1::text is not null and cpf = $1)
                  or ($2::text is not null and cns = $2)
                  or ($3::date is not null and birth_date = $3::date)
                )`,
            [normalized.value.cpf, normalized.value.cns, normalized.value.birthDate],
          );
          const candidates: PatientDuplicateCandidateSource[] = candidatesRes.rows.map((r) => ({
            id: r.id,
            fullName: r.full_name,
            cpf: r.cpf,
            cns: r.cns,
            birthDate: r.birth_date,
            status: r.status,
          }));
          const matches = detectDuplicates(
            {
              fullName: normalized.value.fullName,
              cpf: normalized.value.cpf,
              cns: normalized.value.cns,
              birthDate: normalized.value.birthDate,
            },
            candidates,
          );
          if (requiresHumanConfirmation(matches) && !body.confirmDuplicate) {
            const strongest = matches.find((m) => m.matchStrength === 'conflict') ?? matches[0]!;
            throw new AppError({
              ...duplicateNotConfirmedError(
                strongest.matchStrength === 'conflict' ? 'conflict' : 'strong',
              ).toJSON(),
              details: matches.map((m) => ({
                field: 'duplicate',
                issue: `${m.candidateId}:${m.matchStrength}`,
              })),
            });
          }

          const institutionId = normalized.value.institutionId ?? null;
          const mrnRes = await client.query<{ mrn: string }>(
            'select app.generate_medical_record_number($1) as mrn',
            [institutionId],
          );
          const mrn = mrnRes.rows[0]!.mrn;

          const insertRes = await client.query(
            `insert into app.patients
               (full_name, social_name, mother_name, birth_date, sex, cpf, cns, rg,
                phone, address, city, state, institution_id, medical_record_number,
                created_by, updated_by)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
             returning *`,
            [
              normalized.value.fullName,
              normalized.value.socialName ?? null,
              normalized.value.motherName ?? null,
              normalized.value.birthDate,
              normalized.value.sex ?? null,
              normalized.value.cpf,
              normalized.value.cns,
              normalized.value.rg ?? null,
              normalized.value.phone ?? null,
              normalized.value.address ?? null,
              normalized.value.city ?? null,
              normalized.value.state ?? null,
              institutionId,
              mrn,
              actorId,
            ],
          );
          const patientRow = insertRes.rows[0] as Record<string, unknown>;
          const patientId = patientRow.id as UUID;

          const event = createPatientRegisteredEvent(patientId, actorId, {
            medicalRecordNumber: mrn,
            fullName: normalized.value.fullName,
            cpf: normalized.value.cpf,
            cns: normalized.value.cns,
            birthDate: normalized.value.birthDate,
            sex: normalized.value.sex ?? null,
            institutionId,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient',
            resourceId: patientId,
            patientId,
            requestId: req.id,
            afterData: mapPatientRow(patientRow),
          });

          return { status: 201, body: mapPatientRow(patientRow) };
        };

        if (idempotencyKey && typeof idempotencyKey === 'string') {
          return withIdempotency(
            client,
            { scope: 'patient.create', actorUserId: actorId, key: idempotencyKey, requestBody: body },
            runCreate,
          );
        }
        const r = await runCreate();
        return { replayed: false, ...r };
      },
    );

    reply.code(outcome.status).send(success(outcome.body, req.id, { replayed: outcome.replayed }));
  });

  // ===== GET /api/v1/patients — busca (PAT-002/003/004/005/006) =====
  app.get('/api/v1/patients', { preHandler: readPatient }, async (req, reply) => {
    const pool = requireDb();
    const identity = req.identity!;
    const q = req.query as Record<string, string | undefined>;

    const filters: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (q.name) {
      filters.push(`lower(full_name) like lower($${i})`);
      params.push(`%${q.name}%`);
      i++;
    }
    if (q.cpf) {
      filters.push(`cpf = $${i}`);
      params.push(q.cpf.replace(/\D/g, ''));
      i++;
    }
    if (q.cns) {
      filters.push(`cns = $${i}`);
      params.push(q.cns.replace(/\D/g, ''));
      i++;
    }
    if (q.mrn) {
      filters.push(`medical_record_number = $${i}`);
      params.push(q.mrn);
      i++;
    }
    const where = filters.length > 0 ? `where ${filters.join(' and ')}` : '';
    const limit = Math.min(Number(q.limit ?? '20') || 20, 100);

    const rows = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          `select * from app.patients ${where} order by full_name limit ${limit}`,
          params,
        );
        return res.rows as Record<string, unknown>[];
      },
    );
    reply.code(200).send(success(rows.map(mapPatientRow), req.id));
  });

  // ===== GET /api/v1/patients/:id =====
  app.get('/api/v1/patients/:id', { preHandler: readPatient }, async (req, reply) => {
    const id = uuidParam(req, 'id');
    const pool = requireDb();
    const identity = req.identity!;
    const row = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query('select * from app.patients where id = $1', [id]);
        return res.rows[0] as Record<string, unknown> | undefined;
      },
    );
    if (!row) throw patientNotFoundError();
    reply.code(200).send(success(mapPatientRow(row), req.id));
  });

  // ===== GET /api/v1/patients/:id/timeline (PAT-014) =====
  // Fonte única: `app.patient_timeline` (view sobre `app.domain_events`,
  // Doc 2 §38) — nenhuma tabela paralela de histórico é criada aqui.
  app.get('/api/v1/patients/:id/timeline', { preHandler: readPatient }, async (req, reply) => {
    const patientId = uuidParam(req, 'id');
    const pool = requireDb();
    const identity = req.identity!;
    const rows = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          `select event_id, type, aggregate_type, actor_user_id, occurred_at, payload
             from app.patient_timeline
            where patient_id = $1
            order by occurred_at desc`,
          [patientId],
        );
        return res.rows as Record<string, unknown>[];
      },
    );
    reply.code(200).send(
      success(
        rows.map((r) => ({
          eventId: r.event_id,
          type: r.type,
          aggregateType: r.aggregate_type,
          actorUserId: r.actor_user_id,
          occurredAt: r.occurred_at,
          payload: r.payload,
        })),
        req.id,
      ),
    );
  });

  // ===== PATCH /api/v1/patients/:id =====
  app.patch('/api/v1/patients/:id', { preHandler: readAndWritePatient }, async (req, reply) => {
    const id = uuidParam(req, 'id');
    const body = parseOrThrow(PatientUpdateBody, req.body);
    const pool = requireDb();
    const identity = req.identity!;
    const actorId = identity.appUserId as UUID;

    const immutableCheck = assertNoImmutablePatientFieldsChanged(body as Record<string, unknown>);
    if (!immutableCheck.ok) throw immutableCheck.error;

    const patched: Record<string, unknown> = { ...body };
    delete patched.confirmDuplicate;
    if ('cpf' in patched) {
      const r = normalizePatientCreateInput({ fullName: 'x', cpf: patched.cpf as string | null });
      if (!r.ok) throw r.error;
      patched.cpf = r.value.cpf;
    }
    if ('cns' in patched) {
      const r = normalizePatientCreateInput({ fullName: 'x', cns: patched.cns as string | null });
      if (!r.ok) throw r.error;
      patched.cns = r.value.cns;
    }
    if ('birthDate' in patched) {
      const r = normalizePatientCreateInput({ fullName: 'x', birthDate: patched.birthDate as string | null });
      if (!r.ok) throw r.error;
      patched.birthDate = r.value.birthDate;
    }

    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      socialName: 'social_name',
      motherName: 'mother_name',
      birthDate: 'birth_date',
      sex: 'sex',
      cpf: 'cpf',
      cns: 'cns',
      rg: 'rg',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      institutionId: 'institution_id',
    };
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const [field, value] of Object.entries(patched)) {
      const column = columnMap[field];
      if (!column) continue;
      setClauses.push(`${column} = $${i}`);
      params.push(value);
      i++;
    }
    if (setClauses.length === 0) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'VALIDATION_EMPTY_UPDATE',
        message: 'Nenhum campo editável informado.',
      });
    }
    setClauses.push(`updated_by = $${i}`);
    params.push(actorId);
    i++;
    params.push(id);

    const row = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const before = await client.query('select * from app.patients where id = $1', [id]);
        if (before.rowCount === 0) throw patientNotFoundError();

        const res = await client.query(
          `update app.patients set ${setClauses.join(', ')} where id = $${i} returning *`,
          params,
        );
        const afterRow = res.rows[0] as Record<string, unknown>;

        const event = createPatientUpdatedEvent(id, actorId, {
          changedFields: Object.keys(patched),
        });
        await insertDomainEvent(client, event, id);
        await insertAuditEvent(client, {
          actorUserId: actorId,
          action: 'update',
          resourceType: 'patient',
          resourceId: id,
          patientId: id,
          requestId: req.id,
          beforeData: mapPatientRow(before.rows[0] as Record<string, unknown>),
          afterData: mapPatientRow(afterRow),
        });
        return afterRow;
      },
    );
    reply.code(200).send(success(mapPatientRow(row), req.id));
  });

  // ===== PATCH /api/v1/patients/:id/inactivate =====
  // Etapa 4/6 — consolidação: `createPatientInactivatedEvent` já existia em
  // `@vitaloop/domain` desde a Etapa 1/6 e a coluna `status` (enum
  // `entity_status`, herdado da Fase 0) já suportava o valor `inactive`,
  // mas nenhuma rota expunha a operação — gap fechado aqui, sem nova
  // permissão (reaproveita `patient.write`/`patient.read`, mesma policy de
  // UPDATE já usada por PATCH /:id).
  app.patch(
    '/api/v1/patients/:id/inactivate',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const id = uuidParam(req, 'id');
      const body = parseOrThrow(z.object({ reason: z.string().min(1) }), req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const before = await client.query('select * from app.patients where id = $1', [id]);
          if (before.rowCount === 0) throw patientNotFoundError();
          const beforeRow = before.rows[0] as Record<string, unknown>;
          if (beforeRow.status === 'inactive') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'PATIENT_ALREADY_INACTIVE',
              message: 'Paciente já está inativo.',
            });
          }

          const res = await client.query(
            `update app.patients set status = 'inactive', updated_by = $1 where id = $2 returning *`,
            [actorId, id],
          );
          const afterRow = res.rows[0] as Record<string, unknown>;

          const event = createPatientInactivatedEvent(id, actorId, { reason: body.reason });
          await insertDomainEvent(client, event, id);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'update',
            resourceType: 'patient',
            resourceId: id,
            patientId: id,
            requestId: req.id,
            beforeData: mapPatientRow(beforeRow),
            afterData: mapPatientRow(afterRow),
          });
          return afterRow;
        },
      );
      reply.code(200).send(success(mapPatientRow(row), req.id));
    },
  );

  // ===== Contatos (PAT-007/008) =====
  app.post(
    '/api/v1/patients/:id/contacts',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const body = parseOrThrow(ContactBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const validated = validatePatientContactCreateInput(stripUndefined(body));
      if (!validated.ok) throw validated.error;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.patient_contacts (patient_id, name, relationship, phone, is_emergency, created_by)
             values ($1,$2,$3,$4,$5,$6) returning *`,
            [
              patientId,
              validated.value.name,
              validated.value.relationship ?? null,
              validated.value.phone,
              validated.value.isEmergency ?? false,
              actorId,
            ],
          );
          const contactRow = res.rows[0] as Record<string, unknown>;
          const event = createPatientContactAddedEvent(patientId, actorId, {
            contactId: contactRow.id as UUID,
            name: validated.value.name,
            isEmergency: (validated.value.isEmergency ?? false) as boolean,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_contact',
            resourceId: contactRow.id as UUID,
            patientId,
            requestId: req.id,
            afterData: mapContactRow(contactRow),
          });
          return contactRow;
        },
      );
      reply.code(201).send(success(mapContactRow(row), req.id));
    },
  );

  app.get('/api/v1/patients/:id/contacts', { preHandler: readPatient }, async (req, reply) => {
    const patientId = uuidParam(req, 'id');
    const pool = requireDb();
    const identity = req.identity!;
    const rows = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          'select * from app.patient_contacts where patient_id = $1 order by created_at',
          [patientId],
        );
        return res.rows as Record<string, unknown>[];
      },
    );
    reply.code(200).send(success(rows.map(mapContactRow), req.id));
  });

  // ===== Alergias (PAT-009/010) =====
  app.post(
    '/api/v1/patients/:id/allergies',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const body = parseOrThrow(AllergyBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const validated = validatePatientAllergyCreateInput(stripUndefined(body));
      if (!validated.ok) throw validated.error;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.patient_allergies (patient_id, substance, reaction, severity, recorded_by)
             values ($1,$2,$3,$4,$5) returning *`,
            [
              patientId,
              validated.value.substance,
              validated.value.reaction ?? null,
              validated.value.severity ?? 'unknown',
              actorId,
            ],
          );
          const allergyRow = res.rows[0] as Record<string, unknown>;
          const event = createPatientAllergyRecordedEvent(patientId, actorId, {
            allergyId: allergyRow.id as UUID,
            substance: validated.value.substance,
            severity: (validated.value.severity ?? 'unknown') as never,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_allergy',
            resourceId: allergyRow.id as UUID,
            patientId,
            requestId: req.id,
            afterData: mapAllergyRow(allergyRow),
          });
          return allergyRow;
        },
      );
      reply.code(201).send(success(mapAllergyRow(row), req.id));
    },
  );

  app.get('/api/v1/patients/:id/allergies', { preHandler: readPatient }, async (req, reply) => {
    const patientId = uuidParam(req, 'id');
    const pool = requireDb();
    const identity = req.identity!;
    const rows = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          'select * from app.patient_allergies where patient_id = $1 order by recorded_at',
          [patientId],
        );
        return res.rows as Record<string, unknown>[];
      },
    );
    reply.code(200).send(success(rows.map(mapAllergyRow), req.id));
  });

  // Apenas STATUS pode mudar (imutabilidade de conteúdo — trigger + `assertAllergyContentUnchanged`).
  app.patch(
    '/api/v1/patients/:id/allergies/:allergyId',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const allergyId = uuidParam(req, 'allergyId');
      const body = parseOrThrow(AllergyStatusBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const before = await client.query(
            'select * from app.patient_allergies where id = $1 and patient_id = $2',
            [allergyId, patientId],
          );
          if (before.rowCount === 0) throw patientNotFoundError();
          const beforeRow = before.rows[0] as Record<string, unknown>;

          const unchanged = assertAllergyContentUnchanged(
            {
              substance: beforeRow.substance as string,
              reaction: beforeRow.reaction as string | null,
              severity: beforeRow.severity as never,
              patientId: beforeRow.patient_id as UUID,
            },
            {
              substance: beforeRow.substance as string,
              reaction: beforeRow.reaction as string | null,
              severity: beforeRow.severity as never,
              patientId: beforeRow.patient_id as UUID,
            },
          );
          if (!unchanged.ok) throw unchanged.error;

          const res = await client.query(
            'update app.patient_allergies set status = $1 where id = $2 returning *',
            [body.status, allergyId],
          );
          const afterRow = res.rows[0] as Record<string, unknown>;

          const event = createPatientAllergyStatusChangedEvent(patientId, actorId, {
            allergyId,
            fromStatus: beforeRow.status as never,
            toStatus: body.status,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'update',
            resourceType: 'patient_allergy',
            resourceId: allergyId,
            patientId,
            requestId: req.id,
            beforeData: mapAllergyRow(beforeRow),
            afterData: mapAllergyRow(afterRow),
          });
          return afterRow;
        },
      );
      reply.code(200).send(success(mapAllergyRow(row), req.id));
    },
  );

  // ===== Antecedentes (PAT-011) =====
  app.post(
    '/api/v1/patients/:id/antecedents',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const body = parseOrThrow(AntecedentBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const validated = validatePatientAntecedentCreateInput(stripUndefined(body));
      if (!validated.ok) throw validated.error;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.patient_antecedents (patient_id, description, category, recorded_by)
             values ($1,$2,$3,$4) returning *`,
            [patientId, validated.value.description, validated.value.category ?? null, actorId],
          );
          const antRow = res.rows[0] as Record<string, unknown>;
          const event = createPatientAntecedentRecordedEvent(patientId, actorId, {
            antecedentId: antRow.id as UUID,
            description: validated.value.description,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_antecedent',
            resourceId: antRow.id as UUID,
            patientId,
            requestId: req.id,
            afterData: mapAntecedentRow(antRow),
          });
          return antRow;
        },
      );
      reply.code(201).send(success(mapAntecedentRow(row), req.id));
    },
  );

  app.get('/api/v1/patients/:id/antecedents', { preHandler: readPatient }, async (req, reply) => {
    const patientId = uuidParam(req, 'id');
    const pool = requireDb();
    const identity = req.identity!;
    const rows = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          'select * from app.patient_antecedents where patient_id = $1 order by recorded_at',
          [patientId],
        );
        return res.rows as Record<string, unknown>[];
      },
    );
    reply.code(200).send(success(rows.map(mapAntecedentRow), req.id));
  });

  // ===== Medicamentos de uso contínuo (PAT-012) =====
  app.post(
    '/api/v1/patients/:id/continuous-medications',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const body = parseOrThrow(ContinuousMedicationBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const validated = validatePatientContinuousMedicationCreateInput(stripUndefined(body));
      if (!validated.ok) throw validated.error;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.patient_continuous_medications (patient_id, medication, dose, frequency, recorded_by)
             values ($1,$2,$3,$4,$5) returning *`,
            [
              patientId,
              validated.value.medication,
              validated.value.dose ?? null,
              validated.value.frequency ?? null,
              actorId,
            ],
          );
          const medRow = res.rows[0] as Record<string, unknown>;
          const event = createPatientContinuousMedicationRecordedEvent(patientId, actorId, {
            medicationId: medRow.id as UUID,
            medication: validated.value.medication,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_continuous_medication',
            resourceId: medRow.id as UUID,
            patientId,
            requestId: req.id,
            afterData: mapMedicationRow(medRow),
          });
          return medRow;
        },
      );
      reply.code(201).send(success(mapMedicationRow(row), req.id));
    },
  );

  app.get(
    '/api/v1/patients/:id/continuous-medications',
    { preHandler: readPatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const pool = requireDb();
      const identity = req.identity!;
      const rows = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.patient_continuous_medications where patient_id = $1 order by recorded_at',
            [patientId],
          );
          return res.rows as Record<string, unknown>[];
        },
      );
      reply.code(200).send(success(rows.map(mapMedicationRow), req.id));
    },
  );

  // ===== Problemas ativos (PAT-013) =====
  app.post(
    '/api/v1/patients/:id/active-problems',
    { preHandler: readAndWritePatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const body = parseOrThrow(ActiveProblemBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const validated = validatePatientActiveProblemCreateInput(stripUndefined(body));
      if (!validated.ok) throw validated.error;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.patient_active_problems (patient_id, description, cid_code, recorded_by)
             values ($1,$2,$3,$4) returning *`,
            [patientId, validated.value.description, validated.value.cidCode ?? null, actorId],
          );
          const probRow = res.rows[0] as Record<string, unknown>;
          const event = createPatientActiveProblemRecordedEvent(patientId, actorId, {
            problemId: probRow.id as UUID,
            description: validated.value.description,
          });
          await insertDomainEvent(client, event, patientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_active_problem',
            resourceId: probRow.id as UUID,
            patientId,
            requestId: req.id,
            afterData: mapProblemRow(probRow),
          });
          return probRow;
        },
      );
      reply.code(201).send(success(mapProblemRow(row), req.id));
    },
  );

  app.get(
    '/api/v1/patients/:id/active-problems',
    { preHandler: readPatient },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const pool = requireDb();
      const identity = req.identity!;
      const rows = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.patient_active_problems where patient_id = $1 order by recorded_at',
            [patientId],
          );
          return res.rows as Record<string, unknown>[];
        },
      );
      reply.code(200).send(success(rows.map(mapProblemRow), req.id));
    },
  );

  // ===== Duplicidade (PAT-015) =====
  // Persistência dos candidatos exige `patient.duplicate.review` (mesma
  // permissão exigida pela policy de escrita `patient_duplicate_candidates_write`
  // — não é ampliada nem contornada aqui).
  // Etapa 4/6 — consolidação: a função SQL já detectava e persistia os
  // candidatos desde a Etapa 2/6, mas nem o evento de domínio
  // `PatientDuplicateDetected` (já existente em `@vitaloop/domain` desde a
  // Etapa 1/6, nunca conectado) nem a auditoria eram gravados para esta
  // ação — gap de integração entre domínio e API, fechado aqui.
  app.post(
    '/api/v1/patients/:id/duplicates/detect',
    { preHandler: requirePermission(db, 'patient.duplicate.review') },
    async (req, reply) => {
      const patientId = uuidParam(req, 'id');
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;
      const { count, candidates } = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const detectRes = await client.query<{ detect_patient_duplicates: number }>(
            'select app.detect_patient_duplicates($1) as detect_patient_duplicates',
            [patientId],
          );
          const n = detectRes.rows[0]!.detect_patient_duplicates;

          const candidatesRes = await client.query<{
            id: UUID;
            patient_a_id: UUID;
            patient_b_id: UUID;
            match_strength: 'strong' | 'weak' | 'conflict';
            match_reason: string;
          }>(
            `select id, patient_a_id, patient_b_id, match_strength, match_reason
               from app.patient_duplicate_candidates
              where patient_a_id = $1 or patient_b_id = $1`,
            [patientId],
          );

          for (const c of candidatesRes.rows) {
            const otherPatientId = c.patient_a_id === patientId ? c.patient_b_id : c.patient_a_id;
            const event = createPatientDuplicateDetectedEvent(patientId, actorId, {
              candidatePatientId: otherPatientId,
              matchStrength: c.match_strength,
              matchReason: c.match_reason,
            });
            await insertDomainEvent(client, event, patientId);
          }
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_duplicate_candidate',
            resourceId: patientId,
            patientId,
            requestId: req.id,
            afterData: { candidatesDetected: n, candidateIds: candidatesRes.rows.map((c) => c.id) },
          });

          return { count: n, candidates: candidatesRes.rows };
        },
      );
      reply.code(200).send(success({ candidatesDetected: count, candidateCount: candidates.length }, req.id));
    },
  );

  app.get('/api/v1/patients/:id/duplicates', { preHandler: readPatient }, async (req, reply) => {
    const patientId = uuidParam(req, 'id');
    const pool = requireDb();
    const identity = req.identity!;
    const rows = await withSecurityContext(
      pool,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          `select * from app.patient_duplicate_candidates
             where patient_a_id = $1 or patient_b_id = $1
             order by detected_at desc`,
          [patientId],
        );
        return res.rows as Record<string, unknown>[];
      },
    );
    reply.code(200).send(success(rows.map(mapDuplicateCandidateRow), req.id));
  });

  app.patch(
    '/api/v1/patients/duplicates/:candidateId/review',
    { preHandler: requirePermission(db, 'patient.duplicate.review') },
    async (req, reply) => {
      const candidateId = uuidParam(req, 'candidateId');
      const body = parseOrThrow(DuplicateReviewBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const before = await client.query(
            'select * from app.patient_duplicate_candidates where id = $1',
            [candidateId],
          );
          if (before.rowCount === 0) throw patientNotFoundError();
          const beforeRow = before.rows[0] as Record<string, unknown>;

          const res = await client.query(
            `update app.patient_duplicate_candidates
                set review_status = $1, reviewed_by = $2, reviewed_at = now()
              where id = $3
              returning *`,
            [body.reviewStatus, actorId, candidateId],
          );
          const afterRow = res.rows[0] as Record<string, unknown>;
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'update',
            resourceType: 'patient_duplicate_candidate',
            resourceId: candidateId,
            patientId: beforeRow.patient_a_id as UUID,
            requestId: req.id,
            beforeData: mapDuplicateCandidateRow(beforeRow),
            afterData: mapDuplicateCandidateRow(afterRow),
          });
          return afterRow;
        },
      );
      reply.code(200).send(success(mapDuplicateCandidateRow(row), req.id));
    },
  );

  // ===== Merge (PAT-016) — apenas solicitação/aprovação/rejeição; execução NÃO DEFINIDA =====
  app.post(
    '/api/v1/patients/:id/merge-requests',
    { preHandler: requirePermission(db, 'patient.merge.request') },
    async (req, reply) => {
      const sourcePatientId = uuidParam(req, 'id');
      const body = parseOrThrow(MergeRequestBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const validated = validateMergeRequestPatients(sourcePatientId, body.targetPatientId as UUID);
      if (!validated.ok) throw validated.error;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.patient_merge_requests (source_patient_id, target_patient_id, reason, requested_by)
             values ($1,$2,$3,$4) returning *`,
            [sourcePatientId, body.targetPatientId, body.reason, actorId],
          );
          const mergeRow = res.rows[0] as Record<string, unknown>;
          const event = createPatientMergeRequestedEvent(sourcePatientId, actorId, {
            mergeRequestId: mergeRow.id as UUID,
            targetPatientId: body.targetPatientId as UUID,
            reason: body.reason,
          });
          await insertDomainEvent(client, event, sourcePatientId);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'create',
            resourceType: 'patient_merge_request',
            resourceId: mergeRow.id as UUID,
            patientId: sourcePatientId,
            requestId: req.id,
            afterData: mapMergeRequestRow(mergeRow),
          });
          return mergeRow;
        },
      );
      reply.code(201).send(success(mapMergeRequestRow(row), req.id));
    },
  );

  app.get(
    '/api/v1/patients/merge-requests/:id',
    { preHandler: requireAnyPermission(db, ['patient.merge.request', 'patient.merge.approve']) },
    async (req, reply) => {
      const id = uuidParam(req, 'id');
      const pool = requireDb();
      const identity = req.identity!;
      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.patient_merge_requests where id = $1', [id]);
          return res.rows[0] as Record<string, unknown> | undefined;
        },
      );
      if (!row) throw patientNotFoundError();
      reply.code(200).send(success(mapMergeRequestRow(row), req.id));
    },
  );

  app.patch(
    '/api/v1/patients/merge-requests/:id/review',
    { preHandler: requirePermission(db, 'patient.merge.approve') },
    async (req, reply) => {
      const id = uuidParam(req, 'id');
      const body = parseOrThrow(MergeReviewBody, req.body);
      const pool = requireDb();
      const identity = req.identity!;
      const actorId = identity.appUserId as UUID;

      const row = await withSecurityContext(
        pool,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const before = await client.query(
            'select * from app.patient_merge_requests where id = $1',
            [id],
          );
          if (before.rowCount === 0) throw patientNotFoundError();
          const beforeRow = before.rows[0] as Record<string, unknown>;

          const transition = mergeRequestStateMachine.transition(
            beforeRow.status as 'requested' | 'approved' | 'rejected' | 'executed',
            body.decision === 'approved' ? 'APPROVE' : 'REJECT',
            { actorId, occurredAt: new Date().toISOString() as never },
          );
          if (!transition.ok) throw transition.error;

          const res = await client.query(
            `update app.patient_merge_requests
                set status = $1, reviewed_by = $2, reviewed_at = now(), review_notes = $3
              where id = $4
              returning *`,
            [transition.value.to, actorId, body.reviewNotes ?? null, id],
          );
          const afterRow = res.rows[0] as Record<string, unknown>;

          const event = createPatientMergeReviewedEvent(beforeRow.source_patient_id as UUID, actorId, {
            mergeRequestId: id,
            status: transition.value.to as 'approved' | 'rejected',
            reviewNotes: body.reviewNotes ?? null,
          });
          await insertDomainEvent(client, event, beforeRow.source_patient_id as UUID);
          await insertAuditEvent(client, {
            actorUserId: actorId,
            action: 'update',
            resourceType: 'patient_merge_request',
            resourceId: id,
            patientId: beforeRow.source_patient_id as UUID,
            requestId: req.id,
            beforeData: mapMergeRequestRow(beforeRow),
            afterData: mapMergeRequestRow(afterRow),
          });
          return afterRow;
        },
      );
      reply.code(200).send(success(mapMergeRequestRow(row), req.id));
    },
  );
};
