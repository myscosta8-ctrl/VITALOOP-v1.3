/**
 * Cobertura de rota mínima para Triagem (Bloco 2.1, 14/09/2026).
 *
 * IMPORTANTE — leia antes de estender: este projeto NÃO possui hoje uma
 * infraestrutura de teste com banco real via Vitest (confirmado por
 * inspeção de `apps/api/src/server.test.ts`, o único teste de rota
 * existente antes deste arquivo — ele roda com `DATABASE_URL` ausente de
 * propósito, testando só os endpoints transversais que não tocam banco).
 * `requirePermission`/`requireAuth` exigem uma identidade autenticada
 * (`req.identity`) ANTES de qualquer validação de corpo/banco rodar — sem
 * um mecanismo de emissão de JWT de teste (que não existe no projeto),
 * não é possível simular um POST/PATCH/GET autenticado via `app.inject()`
 * e chegar à lógica de negócio (histórico, lock otimista, etc.) por este
 * caminho.
 *
 * Este arquivo cobre exatamente o que é alcançável sem essa infraestrutura:
 * a exigência de autenticação nas 3 rotas de Triagem (nenhuma delas responde
 * sem identidade, mesmo com banco ausente). NÃO finge ser um teste de
 * integração completo — a verificação real do histórico imutável, do lock
 * otimista (`expectedUpdatedAt`) e da resolução de nome do profissional foi
 * feita diretamente contra o banco de desenvolvimento real (mesmo Postgres
 * que a API usa) via SQL equivalente ao executado pela rota; os comandos e
 * resultados observados estão documentados no relatório desta etapa, não
 * neste arquivo, porque não usam Vitest.
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { loadConfig } from '@vitaloop/config';
import { changeDestinationBodySchema, destinationSchema } from './triages.js';

let app: FastifyInstance;

beforeAll(async () => {
  const config = loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'error' });
  app = buildServer(config).app;
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('rotas de Triagem — exigência de autenticação', () => {
  it('POST /api/v1/encounters/:id/triage rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters/11111111-1111-1111-1111-111111111111/triage',
      payload: { chiefComplaint: 'Dor no peito', riskColor: 'red' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('GET /api/v1/encounters/:id/triage rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/encounters/11111111-1111-1111-1111-111111111111/triage',
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/encounters/:id/triage/reclassify rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/encounters/11111111-1111-1111-1111-111111111111/triage/reclassify',
      payload: {
        newRiskColor: 'yellow',
        reclassificationReason: 'Piora clínica',
        expectedUpdatedAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/encounters/:id/triage/destination rejeita sem identidade autenticada (Bloco 4)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/encounters/11111111-1111-1111-1111-111111111111/triage/destination',
      payload: {
        type: 'red_room',
        reason: 'Piora clínica',
        expectedUpdatedAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });
});

/**
 * Bloco 4 (item 18/19) — validação do schema Zod de encaminhamento isolada de
 * banco/autenticação. Prova diretamente, sem precisar de um atendimento real,
 * que nenhum valor de "leito"/"internação" é aceito como `destination.type` —
 * a rota rejeitaria a requisição na validação de corpo antes mesmo de chegar
 * à lógica de negócio.
 */
describe('destinationSchema / changeDestinationBodySchema — validação (Bloco 4)', () => {
  it('aceita os 4 tipos de destino permitidos pela regra institucional', () => {
    for (const type of ['medical_consultation', 'red_room', 'exam', 'procedure'] as const) {
      const input: Record<string, unknown> = { type };
      if (type === 'medical_consultation') input.roomId = '11111111-1111-1111-1111-111111111111';
      if (type === 'exam') input.examCategory = 'laboratory';
      if (type === 'procedure') input.procedureKind = 'dressing_change';
      expect(destinationSchema.safeParse(input).success).toBe(true);
    }
  });

  it('rejeita "leito"/variações de internação como destination.type — nunca aceito pelo schema', () => {
    for (const type of ['bed', 'internment', 'internacao', 'leito', 'admission_bed', 'ward']) {
      const result = destinationSchema.safeParse({ type });
      expect(result.success).toBe(false);
    }
  });

  it('rejeita destination.type ausente ou vazio', () => {
    expect(destinationSchema.safeParse({}).success).toBe(false);
    expect(destinationSchema.safeParse({ type: '' }).success).toBe(false);
  });

  it('changeDestinationBodySchema exige reason e expectedUpdatedAt válidos, além do destino', () => {
    const base = { type: 'red_room' as const };
    expect(changeDestinationBodySchema.safeParse(base).success).toBe(false);
    expect(
      changeDestinationBodySchema.safeParse({
        ...base,
        reason: '',
        expectedUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
    expect(
      changeDestinationBodySchema.safeParse({
        ...base,
        reason: 'Piora clínica',
        expectedUpdatedAt: 'not-a-date',
      }).success,
    ).toBe(false);
    expect(
      changeDestinationBodySchema.safeParse({
        ...base,
        reason: 'Piora clínica',
        expectedUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});
