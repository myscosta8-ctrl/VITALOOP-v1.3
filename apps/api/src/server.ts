/**
 * Construção do servidor HTTP (Fastify).
 *
 * Fundação transversal (Doc 2 §4/§5/§31/§34/§54): request-id/correlação,
 * logs estruturados, envelope de erro estável, headers de segurança, CORS
 * negado por padrão, health/readiness. Fase 1 adiciona identidade/autenticação
 * (Doc 1 §5-§10; Doc 2 §20-§28; ADR-0003) — sem regra clínica aqui.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import type { LoadedConfig } from '@vitaloop/config';
import { failure } from './http/envelope.js';
import { securityHeaders } from './http/security-headers.js';
import { makeCorsHook } from './http/cors.js';
import { createPool, type Db } from './db/pool.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerMeRoutes } from './routes/me.js';
import { registerSecurityRoutes } from './routes/security.js';
import { registerPatientRoutes } from './routes/patients.js';
import { registerEncounterRoutes } from './routes/encounters.js';
import { registerTriageRoutes } from './routes/triages.js';
import { registerQueueRoutes } from './routes/queues.js';
import { registerMedicalRoutes } from './routes/medical.js';
import { registerDiagnosisRoutes } from './routes/diagnoses.js';
import { registerPrescriptionRoutes } from './routes/prescriptions.js';
import { registerExamRoutes } from './routes/exams.js';
import { registerOutcomeRoutes } from './routes/outcomes.js';
import { registerNursingRoutes } from './routes/nursing.js';
import { registerBedRoutes } from './routes/beds.js';
import { registerDocumentRoutes } from './routes/documents.js';
import { registerSafetyRoutes } from './routes/safety.js';
import { registerManagementRoutes } from './routes/management.js';
import { registerSusRoutes } from './routes/sus.js';
import { registerRegulationRoutes } from './routes/regulation.js';
import { registerIntegrationRoutes } from './routes/integration.js';
import { registerObservabilityRoutes } from './routes/observability.js';
import { createSupabaseJwtVerifier, type JwtVerifier } from './security/jwt-verifier.js';
import { createSupabaseAuthClient } from './security/supabase-auth-client.js';
import { createRateLimiter } from './security/rate-limiter.js';
import { registerIdentityPlugin } from './security/identity-plugin.js';

export interface BuiltServer {
  readonly app: FastifyInstance;
  readonly db: Db;
}

export const buildServer = (config: LoadedConfig): BuiltServer => {
  const app = Fastify({
    logger: {
      level: config.env.LOG_LEVEL,
      // Não logar cabeçalhos sensíveis nem corpo clínico (Doc 2 §53; Doc 4 §15).
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        remove: true,
      },
    },
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      return typeof header === 'string' && header.length > 0 ? header : newUuid();
    },
    disableRequestLogging: false,
  });

  const db = createPool(config.env.DATABASE_URL);

  // Correlação: ecoa o request id em toda resposta.
  app.addHook('onRequest', (req, reply, done) => {
    reply.header('X-Request-Id', req.id);
    done();
  });
  app.addHook('onRequest', securityHeaders);
  app.addHook('onRequest', makeCorsHook(config.env.CORS_ALLOWED_ORIGINS));

  // Preflight CORS.
  app.options('/*', (_req, reply) => {
    reply.code(204).send();
  });

  // --- Identidade/autenticação (Fase 1) ---
  const verifier: JwtVerifier | null = config.env.SUPABASE_URL
    ? createSupabaseJwtVerifier(config.env.SUPABASE_URL)
    : null;
  registerIdentityPlugin(app, verifier, db);

  if (config.env.SUPABASE_URL && config.env.SUPABASE_ANON_KEY) {
    const authClient = createSupabaseAuthClient({
      supabaseUrl: config.env.SUPABASE_URL,
      anonKey: config.env.SUPABASE_ANON_KEY,
    });
    registerAuthRoutes(app, {
      authClient,
      db,
      loginLimiter: createRateLimiter({ maxAttempts: 5, windowMs: 15 * 60_000 }),
      recoveryLimiter: createRateLimiter({ maxAttempts: 3, windowMs: 60 * 60_000 }),
    });
  } else {
    app.log.warn(
      'SUPABASE_URL/SUPABASE_ANON_KEY ausentes — rotas de autenticação não registradas.',
    );
  }
  registerMeRoutes(app);
  registerSecurityRoutes(app, db);
  registerPatientRoutes(app, db);
  registerEncounterRoutes(app, db);
  registerTriageRoutes(app, db);
  registerQueueRoutes(app, db);
  registerMedicalRoutes(app, db);
  registerDiagnosisRoutes(app, db);
  registerPrescriptionRoutes(app, db);
  registerExamRoutes(app, db);
  registerOutcomeRoutes(app, db);
  registerNursingRoutes(app, db);
  registerBedRoutes(app, db);
  registerDocumentRoutes(app, db);
  registerSafetyRoutes(app, db);
  registerManagementRoutes(app, db);
  registerSusRoutes(app, db);
  registerRegulationRoutes(app, db);
  registerIntegrationRoutes(app, db);
  registerObservabilityRoutes(app, db);

  // 404 padronizado.
  app.setNotFoundHandler((req, reply) => {
    reply
      .code(404)
      .send(
        failure(
          {
            category: ErrorCategory.NOT_FOUND,
            code: 'NOT_FOUND_ROUTE',
            message: 'Recurso não encontrado.',
          },
          req.id,
        ),
      );
  });

  // Erro padronizado — nunca expõe stack ao cliente (Doc 2 §31).
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      req.log.warn({ code: error.code, category: error.category }, 'app error');
      reply.code(error.httpStatus).send(failure(error.toJSON(), req.id));
      return;
    }
    req.log.error({ err: error }, 'unhandled error');
    reply.code(500).send(
      failure(
        {
          category: ErrorCategory.INTERNAL,
          code: 'INTERNAL_ERROR',
          message: 'Erro interno.',
        },
        req.id,
      ),
    );
  });

  registerHealthRoutes(app, {
    db,
    ...(config.env.SUPABASE_URL ? { supabaseUrl: config.env.SUPABASE_URL } : {}),
  });

  return { app, db };
};
