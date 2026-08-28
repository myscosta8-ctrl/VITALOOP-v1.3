/**
 * Testes de integração REAIS da API de Pacientes (Fase 2, Etapa 2/6).
 *
 * Conexão real ao Supabase oficial como `vitaloop_app` (RLS efetiva, sem
 * bypass — ver `docs/PHASE_2_STEP_1_REPORT.md`). Auto-skip quando
 * `DATABASE_URL` não está definida (mesmo padrão de
 * `tests/integration/db.foundation.test.ts`).
 *
 * A identidade é injetada diretamente no `FastifyRequest` (mesmo padrão já
 * usado em `apps/api/src/routes/auth.test.ts`), evitando depender de um
 * login JWT real do Supabase Auth só para testar autorização — o que
 * importa aqui é que `requirePermission`/RLS decidam com base em papéis
 * REAIS gravados em `app.role_permissions` e avaliados por `app.authorize()`
 * / policies reais no banco, não que o token em si seja real (isso já foi
 * testado na Fase 1).
 */

import { afterAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import type { RequestIdentity } from '../../apps/api/src/security/request-identity.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

const NETWORK_TIMEOUT_MS = 90_000;

/**
 * Gera um CPF com dígito verificador REAL e válido (mesmo algoritmo de
 * `packages/domain/src/patient/identifiers.ts`), a partir de uma semente —
 * evita colisão com dados residuais de execuções anteriores desta suíte sem
 * depender de limpeza perfeita entre rodadas (`vitaloop_app` não tem GRANT
 * de DELETE na maioria das tabelas de paciente, por design — ver `afterAll`).
 */
const makeValidCpf = (seed: number): string => {
  const base = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  const calcDv = (digits: number[], factorStart: number): number => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += digits[i] * (factorStart - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const dv1 = calcDv(base, 10);
  const dv2 = calcDv([...base, dv1], 11);
  return [...base, dv1, dv2].join('');
};

// Fixtures criados manualmente via Supabase MCP antes desta rodada (ver
// PHASE_2_STEP_2_REPORT.md) — reaproveitados aqui, removidos ao final deste arquivo.
const FIXTURE = {
  institutionId: '11c93126-f2b2-47d4-9dd4-88dd547becc1',
  actorFullId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  actorReadonlyId: '10243fdf-2cc4-4f35-8544-1f1d2e338472',
  actorNoPermId: '464ef92a-6d14-446e-9a9b-95801b515c6d',
} as const;

type TestIdentity = RequestIdentity | null;

const identityFull: TestIdentity = {
  authUserId: 'auth-full',
  appUserId: FIXTURE.actorFullId,
  appUserStatus: 'active',
  roles: ['test_patient_full'],
};
const identityReadonly: TestIdentity = {
  authUserId: 'auth-readonly',
  appUserId: FIXTURE.actorReadonlyId,
  appUserStatus: 'active',
  roles: ['test_patient_readonly'],
};
const identityNoPerm: TestIdentity = {
  authUserId: 'auth-noperm',
  appUserId: FIXTURE.actorNoPermId,
  appUserStatus: 'active',
  roles: [],
};

/** Constrói uma app Fastify real (rotas reais, banco real) com identidade injetada via header de teste. */
const buildTestApp = (pool: pg.Pool): FastifyInstance => {
  const app = Fastify({ genReqId: (req) => (req.headers['x-request-id'] as string) || newUuid() });

  app.addHook('onRequest', (req, reply, done) => {
    reply.header('X-Request-Id', req.id);
    const identityHeader = req.headers['x-test-identity'];
    if (typeof identityHeader === 'string') {
      req.identity =
        identityHeader === 'null'
          ? null
          : ({ full: identityFull, readonly: identityReadonly, noperm: identityNoPerm }[
              identityHeader
            ] ?? null);
    } else {
      req.identity = null;
    }
    done();
  });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      reply.code(error.httpStatus).send(failure(error.toJSON(), req.id));
      return;
    }
    reply.code(500).send(
      failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, req.id),
    );
  });

  registerPatientRoutes(app, pool);
  return app;
};

run('API de Pacientes — integração real (vitaloop_app, RLS efetiva)', () => {
  const pool = new pg.Pool({ connectionString: url });
  const app = buildTestApp(pool);
  const createdPatientIds: string[] = [];

  afterAll(async () => {
    // IMPORTANTE: `vitaloop_app` NÃO tem GRANT de DELETE na maioria das
    // tabelas de paciente (0017: só `patient_contacts` tem `delete`; todas
    // as outras — `patients`, `patient_allergies`, `patient_antecedents`,
    // `patient_continuous_medications`, `patient_active_problems`,
    // `patient_duplicate_candidates`, `patient_merge_requests` — têm apenas
    // select/insert/update). Isso é INTENCIONAL (retenção de dados clínicos,
    // Doc 1 §72 LGPD) — o próprio papel de aplicação NUNCA apaga fisicamente
    // um paciente, só inativa via `status`. Por isso a limpeza dos dados
    // desta suíte NÃO é feita aqui (tentar geraria `permission denied`,
    // corretamente, pois é a mesma restrição que protegeria dados reais em
    // produção) — é feita administrativamente (Supabase MCP/`postgres`)
    // logo após a execução, registrada com evidência em
    // `docs/PHASE_2_STEP_2_REPORT.md`.
    console.log(
      `Pacientes de teste criados nesta execução (limpeza administrativa pendente): ${createdPatientIds.join(', ')}`,
    );
    await pool.end();
  });

  // ---------- 1/2/3: criação autorizada / sem autenticação / sem permissão ----------
  it(
    '1. criação autorizada (patient.write + patient.read) -> 201',
    async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente API Teste 1' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBeDefined();
      expect(body.data.medicalRecordNumber).toBeDefined();
      createdPatientIds.push(body.data.id);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '2. criação sem autenticação -> 401 AUTH_REQUIRED',
    async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'null' },
        payload: { fullName: 'Não deveria ser criado' },
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error.code).toBe('AUTH_REQUIRED');
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '3. criação sem permissão -> 403 ACCESS_DENIED',
    async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'noperm' },
        payload: { fullName: 'Não deveria ser criado' },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error.code).toBe('ACCESS_DENIED');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 4/5: consulta autorizada / sem permissão ----------
  let queryTargetId: string;

  it(
    '4. consulta autorizada -> 200 (setup do paciente usado nos testes 4-9)',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente API Teste Consulta' },
      });
      expect(create.statusCode).toBe(201);
      queryTargetId = JSON.parse(create.body).data.id;
      createdPatientIds.push(queryTargetId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}`,
        headers: { 'x-test-identity': 'readonly' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.fullName).toBe('Paciente API Teste Consulta');
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '5. consulta sem permissão -> 403',
    async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}`,
        headers: { 'x-test-identity': 'noperm' },
      });
      expect(res.statusCode).toBe(403);
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 6: isolamento por RLS (camada de banco, independente do guard HTTP) ----------
  it(
    '6. isolamento por RLS — SELECT direto sem contexto de permissão retorna 0 linhas mesmo para um paciente que existe de fato',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('vitaloop.roles', '', true)`);
        const res = await client.query('select count(*)::int as n from app.patients where id = $1', [
          queryTargetId,
        ]);
        expect(res.rows[0].n).toBe(0);
        await client.query('rollback');
      } finally {
        client.release();
      }
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 7/8: atualização autorizada / campo imutável ----------
  it(
    '7. atualização autorizada -> 200',
    async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/${queryTargetId}`,
        headers: { 'x-test-identity': 'full' },
        payload: { phone: '11999998888' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.phone).toBe('11999998888');
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '8. atualização de campo imutável (medicalRecordNumber) -> 409 PATIENT_IMMUTABLE_FIELD',
    async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/${queryTargetId}`,
        headers: { 'x-test-identity': 'full' },
        payload: { medicalRecordNumber: '9999999999' },
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).error.code).toBe('PATIENT_IMMUTABLE_FIELD');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 9: CPF/CNS inválidos ----------
  it(
    '9. CPF inválido -> 400 PATIENT_INVALID_CPF; CNS inválido -> 400 PATIENT_INVALID_CNS',
    async () => {
      const resCpf = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'CPF Invalido', cpf: '123.456.789-00' },
      });
      expect(resCpf.statusCode).toBe(400);
      expect(JSON.parse(resCpf.body).error.code).toBe('PATIENT_INVALID_CPF');

      const resCns = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'CNS Invalido', cns: '000000000000000' },
      });
      expect(resCns.statusCode).toBe(400);
      expect(JSON.parse(resCns.body).error.code).toBe('PATIENT_INVALID_CNS');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 10/11/12: duplicidade forte / fraca / conflito ----------
  it(
    '10. duplicidade forte (mesmo CPF, mesmo nome) exige confirmação -> 409, depois 201 com confirmDuplicate',
    async () => {
      const cpf = makeValidCpf(Date.now()); // CPF válido, único por execução
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Duplicidade Forte', cpf },
      });
      expect(first.statusCode).toBe(201);
      createdPatientIds.push(JSON.parse(first.body).data.id);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Duplicidade Forte', cpf },
      });
      expect(second.statusCode).toBe(409);
      expect(JSON.parse(second.body).error.code).toBe('PATIENT_DUPLICATE_NOT_CONFIRMED');

      const confirmed = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Duplicidade Forte', cpf, confirmDuplicate: true },
      });
      expect(confirmed.statusCode).toBe(201);
      createdPatientIds.push(JSON.parse(confirmed.body).data.id);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '11. duplicidade fraca (nome+nascimento iguais, sem CPF/CNS) NÃO exige confirmação -> 201 direto',
    async () => {
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'José Duplicidade Fraca', birthDate: '1980-01-01' },
      });
      expect(first.statusCode).toBe(201);
      createdPatientIds.push(JSON.parse(first.body).data.id);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'jose   DUPLICIDADE fraca', birthDate: '1980-01-01' },
      });
      expect(second.statusCode).toBe(201); // fraca não bloqueia, apenas forte/conflito
      createdPatientIds.push(JSON.parse(second.body).data.id);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '12. conflito para revisão humana (mesmo CPF, nome diferente) -> 409, depois 201 com confirmDuplicate; detecção persistida classifica como conflict',
    async () => {
      const cpf = makeValidCpf(Date.now() + 1); // CPF válido, único por execução e distinto do teste 10
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Carlos Eduardo Conflito', cpf },
      });
      expect(first.statusCode).toBe(201);
      const firstId = JSON.parse(first.body).data.id;
      createdPatientIds.push(firstId);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Carla Eduarda Conflito Distinta', cpf, confirmDuplicate: true },
      });
      expect(second.statusCode).toBe(201);
      const secondId = JSON.parse(second.body).data.id;
      createdPatientIds.push(secondId);

      const detect = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${firstId}/duplicates/detect`,
        headers: { 'x-test-identity': 'full' },
      });
      expect(detect.statusCode).toBe(200);

      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${firstId}/duplicates`,
        headers: { 'x-test-identity': 'full' },
      });
      expect(list.statusCode).toBe(200);
      const candidates = JSON.parse(list.body).data;
      expect(candidates.some((c: { matchStrength: string }) => c.matchStrength === 'conflict')).toBe(true);
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 13/14/15/16: contatos, antecedentes, medicamentos, problemas ----------
  it(
    '13. contatos -> 201, listagem -> 200',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${queryTargetId}/contacts`,
        headers: { 'x-test-identity': 'full' },
        payload: { name: 'Maria Contato', phone: '11988887777', isEmergency: true },
      });
      expect(create.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}/contacts`,
        headers: { 'x-test-identity': 'readonly' },
      });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).data.length).toBeGreaterThan(0);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '14. antecedentes -> 201, listagem -> 200',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${queryTargetId}/antecedents`,
        headers: { 'x-test-identity': 'full' },
        payload: { description: 'Hipertensão arterial', category: 'clinical' },
      });
      expect(create.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}/antecedents`,
        headers: { 'x-test-identity': 'readonly' },
      });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).data.length).toBeGreaterThan(0);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '15. medicamentos de uso contínuo -> 201, listagem -> 200',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${queryTargetId}/continuous-medications`,
        headers: { 'x-test-identity': 'full' },
        payload: { medication: 'Losartana', dose: '50mg', frequency: '1x/dia' },
      });
      expect(create.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}/continuous-medications`,
        headers: { 'x-test-identity': 'readonly' },
      });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).data.length).toBeGreaterThan(0);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '16. problemas/condições ativas -> 201, listagem -> 200; alergia + status transition -> 200',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${queryTargetId}/active-problems`,
        headers: { 'x-test-identity': 'full' },
        payload: { description: 'Diabetes tipo 2' },
      });
      expect(create.statusCode).toBe(201);
      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}/active-problems`,
        headers: { 'x-test-identity': 'readonly' },
      });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).data.length).toBeGreaterThan(0);

      // Alergia — bônus: cobre PAT-009/010 e a rota de mudança de status.
      const allergy = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${queryTargetId}/allergies`,
        headers: { 'x-test-identity': 'full' },
        payload: { substance: 'Dipirona', reaction: 'Urticária', severity: 'moderate' },
      });
      expect(allergy.statusCode).toBe(201);
      const allergyId = JSON.parse(allergy.body).data.id;

      const statusChange = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/${queryTargetId}/allergies/${allergyId}`,
        headers: { 'x-test-identity': 'full' },
        payload: { status: 'resolved' },
      });
      expect(statusChange.statusCode).toBe(200);
      expect(JSON.parse(statusChange.body).data.status).toBe('resolved');
      expect(JSON.parse(statusChange.body).data.substance).toBe('Dipirona'); // conteúdo preservado
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 17: idempotência ----------
  it(
    '17. idempotência — mesma Idempotency-Key + mesmo corpo replica a resposta; corpo diferente -> conflito',
    async () => {
      const key = `idem-test-${Date.now()}`;
      const payload = { fullName: 'Paciente Idempotente' };

      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full', 'idempotency-key': key },
        payload,
      });
      expect(first.statusCode).toBe(201);
      const firstId = JSON.parse(first.body).data.id;
      createdPatientIds.push(firstId);

      const replay = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full', 'idempotency-key': key },
        payload,
      });
      expect(replay.statusCode).toBe(201);
      const replayBody = JSON.parse(replay.body);
      expect(replayBody.data.id).toBe(firstId); // mesmo paciente, não duplicou
      expect(replayBody.meta.replayed).toBe(true);

      const conflicting = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full', 'idempotency-key': key },
        payload: { fullName: 'Corpo Diferente' },
      });
      expect(conflicting.statusCode).toBe(409);
      expect(JSON.parse(conflicting.body).error.code).toBe(
        'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_BODY',
      );
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 18: rollback transacional ----------
  it(
    '18. rollback transacional — violação de constraint no meio de uma transação desfaz TUDO, inclusive o insert anterior',
    async () => {
      const { withSecurityContext } = await import('../../apps/api/src/db/security-context.js');
      const patientMrn = 'ROLLBACKTEST' + Date.now();

      await expect(
        withSecurityContext(pool, { userId: FIXTURE.actorFullId, roles: ['test_patient_full'] }, async (client) => {
          const ins = await client.query(
            `insert into app.patients (full_name, medical_record_number) values ($1,$2) returning id`,
            ['Paciente Rollback', patientMrn],
          );
          const id = ins.rows[0].id;
          // Viola patient_duplicate_distinct_ck (patient_a_id <> patient_b_id) de propósito,
          // dentro da MESMA transação usada pela API real — mesmo mecanismo, não um atalho.
          await client.query(
            `insert into app.patient_duplicate_candidates (patient_a_id, patient_b_id, match_strength, match_reason)
             values ($1,$1,'strong','teste de rollback')`,
            [id],
          );
        }),
      ).rejects.toThrow();

      const check = await pool.query('select count(*)::int as n from app.patients where medical_record_number = $1', [
        patientMrn,
      ]);
      expect(check.rows[0].n).toBe(0); // o insert do paciente NÃO persistiu
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 19/20: auditoria e eventos de domínio ----------
  //
  // IMPORTANTE sobre a verificação de app.audit_events: a policy
  // `audit_read` (migration 0010) exige papel `auditoria` ou `direcao` —
  // nenhum desses papéis existe ainda no projeto (nenhuma linha em
  // app.roles), e criar um só para este teste violaria a instrução
  // explícita de não inventar papéis/permissões novos. Por isso a
  // gravação em audit_events é verificada ADMINISTRATIVAMENTE (Supabase
  // MCP, papel postgres — o mesmo canal usado em toda a Fase 0-2 para
  // verificação, nunca para regra de produção) e documentada com
  // evidência em `docs/PHASE_2_STEP_2_REPORT.md`, não como asserção
  // automatizada aqui (que seria bloqueada pela própria RLS — corretamente).
  it(
    '19. auditoria — POST /patients retorna sucesso; gravação em app.audit_events confirmada administrativamente (ver PHASE_2_STEP_2_REPORT.md)',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente Auditoria' },
      });
      expect(create.statusCode).toBe(201);
      const id = JSON.parse(create.body).data.id;
      createdPatientIds.push(id);
      console.log(`Paciente para verificação administrativa de auditoria: ${id}`);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '20. eventos de domínio — POST /patients grava PatientRegistered em app.domain_events, populando patient_id (verificado com contexto autenticado real — domain_events_read exige apenas is_authenticated())',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente Evento Dominio' },
      });
      expect(create.statusCode).toBe(201);
      const id = JSON.parse(create.body).data.id;
      createdPatientIds.push(id);

      const { withSecurityContext } = await import('../../apps/api/src/db/security-context.js');
      const events = await withSecurityContext(
        pool,
        { userId: FIXTURE.actorFullId, roles: ['test_patient_full'] },
        async (client) => {
          const res = await client.query(
            `select event_type, aggregate_type, patient_id from app.domain_events
               where aggregate_id = $1 and event_type = 'PatientRegistered'`,
            [id],
          );
          return res;
        },
      );
      expect(events.rowCount).toBe(1);
      expect(events.rows[0].aggregate_type).toBe('patient');
      expect(events.rows[0].patient_id).toBe(id);
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 21: request-id/correlation-id ----------
  it(
    '21. request-id — eco do header x-request-id na resposta e no envelope',
    async () => {
      const requestId = 'meu-request-id-de-teste-123';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${queryTargetId}`,
        headers: { 'x-test-identity': 'readonly', 'x-request-id': requestId },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-request-id']).toBe(requestId);
      expect(JSON.parse(res.body).requestId).toBe(requestId);
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 22: erros HTTP padronizados ----------
  it(
    '22. erros HTTP padronizados — envelope {error:{code,message,requestId}} consistente em 400/403/404',
    async () => {
      const notFound = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/00000000-0000-4000-8000-000000000000`,
        headers: { 'x-test-identity': 'full' },
      });
      expect(notFound.statusCode).toBe(404);
      const notFoundBody = JSON.parse(notFound.body);
      expect(notFoundBody.error.code).toBe('PATIENT_NOT_FOUND');
      expect(notFoundBody.error.requestId).toBeDefined();

      const badBody = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: '' },
      });
      expect(badBody.statusCode).toBe(400);
      expect(JSON.parse(badBody.body).error.code).toBe('VALIDATION_INVALID_BODY');

      const forbidden = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'noperm' },
        payload: { fullName: 'x' },
      });
      expect(forbidden.statusCode).toBe(403);
      expect(JSON.parse(forbidden.body).error.code).toBe('ACCESS_DENIED');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- Etapa 4/6: consolidação (timeline, inativação, auditoria de duplicidade) ----------
  it(
    '23. timeline (PAT-014) — reflete o evento real gravado pela própria criação do paciente, via RLS real (patient.read)',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente Timeline Etapa4' },
      });
      expect(create.statusCode).toBe(201);
      const id = JSON.parse(create.body).data.id;
      createdPatientIds.push(id);

      const timeline = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${id}/timeline`,
        headers: { 'x-test-identity': 'readonly' },
      });
      expect(timeline.statusCode).toBe(200);
      const events = JSON.parse(timeline.body).data;
      expect(events.some((e: { type: string }) => e.type === 'PatientRegistered')).toBe(true);

      const denied = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${id}/timeline`,
        headers: { 'x-test-identity': 'noperm' },
      });
      expect(denied.statusCode).toBe(403);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '24. inativação de paciente — autorizada, audita, é idempotentemente rejeitada na segunda tentativa; negada sem permissão',
    async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente Inativação Etapa4' },
      });
      expect(create.statusCode).toBe(201);
      const id = JSON.parse(create.body).data.id;
      createdPatientIds.push(id);

      const deniedNoPerm = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/${id}/inactivate`,
        headers: { 'x-test-identity': 'noperm' },
        payload: { reason: 'teste sem permissão' },
      });
      expect(deniedNoPerm.statusCode).toBe(403);

      const inactivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/${id}/inactivate`,
        headers: { 'x-test-identity': 'full' },
        payload: { reason: 'Óbito confirmado (teste)' },
      });
      expect(inactivate.statusCode).toBe(200);
      expect(JSON.parse(inactivate.body).data.status).toBe('inactive');

      const again = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/${id}/inactivate`,
        headers: { 'x-test-identity': 'full' },
        payload: { reason: 'tentativa duplicada' },
      });
      expect(again.statusCode).toBe(409);
      expect(JSON.parse(again.body).error.code).toBe('PATIENT_ALREADY_INACTIVE');
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '25. auditoria de duplicidade — detecção e revisão de candidato gravam app.audit_events (verificado administrativamente)',
    async () => {
      const cpf = makeValidCpf(Date.now() + 2);
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Etapa4 Auditoria Dup A', cpf },
      });
      expect(first.statusCode).toBe(201);
      const firstId = JSON.parse(first.body).data.id;
      createdPatientIds.push(firstId);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Etapa4 Auditoria Dup A', cpf, confirmDuplicate: true },
      });
      expect(second.statusCode).toBe(201);
      createdPatientIds.push(JSON.parse(second.body).data.id);

      const detect = await app.inject({
        method: 'POST',
        url: `/api/v1/patients/${firstId}/duplicates/detect`,
        headers: { 'x-test-identity': 'full' },
      });
      expect(detect.statusCode).toBe(200);
      const detectBody = JSON.parse(detect.body).data;
      expect(detectBody.candidateCount).toBeGreaterThan(0);

      const list = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${firstId}/duplicates`,
        headers: { 'x-test-identity': 'full' },
      });
      const candidateId = JSON.parse(list.body).data[0].id;

      const review = await app.inject({
        method: 'PATCH',
        url: `/api/v1/patients/duplicates/${candidateId}/review`,
        headers: { 'x-test-identity': 'full' },
        payload: { reviewStatus: 'confirmed_distinct' },
      });
      expect(review.statusCode).toBe(200);
      expect(JSON.parse(review.body).data.reviewStatus).toBe('confirmed_distinct');

      console.log(
        `Etapa 4 — verificar administrativamente app.audit_events para resource_type='patient_duplicate_candidate' e resource_id in ('${firstId}', '${candidateId}')`,
      );
    },
    180_000,
  );

  // ---------- Etapa 4/6 — correção do GATE BLOCKED: regressão de segurança das views de timeline ----------
  it(
    '26. regressão de segurança — app.timeline/app.patient_timeline NÃO podem contornar a RLS de app.domain_events (achado da auditoria cruzada, corrigido na migration 0023)',
    async () => {
      const eventType = `RegressionProbe${Date.now()}`;

      // Grava o evento de sonda como vitaloop_app AUTENTICADO (domain_events_insert exige is_authenticated()).
      const writer = await pool.connect();
      try {
        await writer.query('begin');
        await writer.query(`select set_config('vitaloop.user_id', $1, true)`, [FIXTURE.actorFullId]);
        await writer.query(
          `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
           values (gen_random_uuid(), $1, 'patient', gen_random_uuid(), $2, gen_random_uuid(), '{}'::jsonb, 1, now())`,
          [eventType, FIXTURE.actorFullId],
        );
        await writer.query('commit');
      } finally {
        writer.release();
      }

      // Lê em uma conexão TOTALMENTE NOVA, sem NENHUM contexto de sessão —
      // exatamente o cenário que expôs o bypass total na auditoria.
      const reader = await pool.connect();
      try {
        await reader.query('begin');
        const auth = await reader.query('select app.is_authenticated() as auth');
        expect(auth.rows[0].auth).toBe(false);

        // As views expõem a coluna como `type` (não `event_type` — esse é o
        // nome apenas na tabela base `app.domain_events`).
        const t = await reader.query('select count(*)::int as n from app.timeline where type = $1', [
          eventType,
        ]);
        expect(t.rows[0].n).toBe(0);

        const pt = await reader.query(
          'select count(*)::int as n from app.patient_timeline where type = $1',
          [eventType],
        );
        expect(pt.rows[0].n).toBe(0);
        await reader.query('rollback');
      } finally {
        reader.release();
      }

      // Limpeza do evento de sonda (postgres/admin necessário — vitaloop_app não tem DELETE em domain_events).
    },
    NETWORK_TIMEOUT_MS,
  );
});
