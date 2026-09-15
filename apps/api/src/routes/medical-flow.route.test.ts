/**
 * Cobertura de rota mínima para o Fluxo Médico pós-Triagem (Bloco 6,
 * 14/09/2026) — mesma limitação e mesmo padrão já documentados em
 * `triages.route.test.ts`: sem infraestrutura de emissão de JWT de teste
 * neste projeto, `app.inject()` só alcança a exigência de autenticação
 * (401) antes de qualquer lógica de negócio rodar. A verificação real do
 * fluxo (assumir atendimento, avaliação médica, decisão, bloqueio de
 * internação sem consulta) foi feita ao vivo contra o banco de
 * desenvolvimento real — documentada no relatório desta etapa, não aqui.
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { loadConfig } from '@vitaloop/config';

let app: FastifyInstance;

beforeAll(async () => {
  const config = loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'error' });
  app = buildServer(config).app;
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const ENCOUNTER_ID = '11111111-1111-1111-1111-111111111111';
const TICKET_ID = '22222222-2222-2222-2222-222222222222';

describe('rotas do Fluxo Médico (Bloco 6) — exigência de autenticação', () => {
  it('POST /api/v1/encounters/:id/consultation rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/consultation`,
      payload: {
        chiefComplaint: 'Dor no peito',
        historyPresentIllness: 'HMA',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Hipótese',
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('GET /api/v1/encounters/:id/consultation rejeita sem identidade autenticada', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/encounters/${ENCOUNTER_ID}/consultation` });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/encounters/:id/consultation/evolutions rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/consultation/evolutions`,
      payload: { evolutionText: 'Reavaliado' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/encounters/:id/outcome (decisão de internação) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/outcome`,
      payload: { outcomeType: 'admission_bed' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/queues/tickets/:id/status (Bloco 6: "médico assume o atendimento") rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/queues/tickets/${TICKET_ID}/status`,
      payload: { status: 'in_service' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });
});

const EXAM_ID = '33333333-3333-3333-3333-333333333333';
const PROCEDURE_ID = '44444444-4444-4444-4444-444444444444';

describe('rotas de Exames/Procedimentos pós-consulta (Bloco 7) — exigência de autenticação', () => {
  it('POST /api/v1/encounters/:id/exams (solicitar exame) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/exams`,
      payload: { examName: 'Hemograma', clinicalIndication: 'Suspeita de infecção' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/encounters/:id/exams/:examId/collect (Bloco 7: registrar coleta) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/exams/${EXAM_ID}/collect`,
      payload: { expectedUpdatedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/encounters/:id/exams/:examId/result rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/exams/${EXAM_ID}/result`,
      payload: { resultSummary: 'Normal', expectedUpdatedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/encounters/:id/procedures (solicitar procedimento) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/procedures`,
      payload: { procedureName: 'Troca de curativo' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/encounters/:id/procedures/:id/start (Bloco 7: iniciar execução) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/procedures/${PROCEDURE_ID}/start`,
      payload: { expectedUpdatedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('PATCH /api/v1/encounters/:id/procedures/:id/execute rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/procedures/${PROCEDURE_ID}/execute`,
      payload: { expectedUpdatedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });
});

const BED_ID = '55555555-5555-5555-5555-555555555555';
const ALLOCATION_ID = '66666666-6666-6666-6666-666666666666';

describe('rotas de Internação/Leitos (Bloco 8) — exigência de autenticação', () => {
  it('POST /api/v1/encounters/:id/admission (internar — regra: exige avaliação médica) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/admission`,
      payload: { admissionDiagnosisDescription: 'Pneumonia', admissionJustification: 'Necessita monitorização contínua' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('GET /api/v1/encounters/:id/admission rejeita sem identidade autenticada', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/encounters/${ENCOUNTER_ID}/admission` });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/encounters/:id/admission/discharge rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/admission/discharge`,
      payload: { status: 'discharged' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/encounters/:id/beds/allocate (alocação de leito) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${ENCOUNTER_ID}/beds/allocate`,
      payload: { bedId: BED_ID, patientId: '77777777-7777-7777-7777-777777777777' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('GET /api/v1/beds/map rejeita sem identidade autenticada', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/beds/map' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/bed-allocations/:id/transfer (concorrência de leito) rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bed-allocations/${ALLOCATION_ID}/transfer`,
      payload: { targetBedId: BED_ID, transferReason: 'Necessidade de isolamento respiratório' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/bed-allocations/:id/discharge rejeita sem identidade autenticada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bed-allocations/${ALLOCATION_ID}/discharge`,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });
});
