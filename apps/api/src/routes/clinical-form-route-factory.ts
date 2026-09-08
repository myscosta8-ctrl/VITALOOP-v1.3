import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import type { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { sanitizeFormValues, validateFormValues, type ClinicalFormSchema } from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';

/**
 * Fábrica de rotas pra qualquer "solicitação clínica" construída em cima do
 * motor de schema genérico (`@vitaloop/domain`'s `clinical-forms`): schema
 * fixo, lista filtrável por atendimento, criação com validação/saneamento.
 *
 * Extraído depois de `hemotherapy.ts` e `pharmacy-atm.ts` terem nascido como
 * cópias quase idênticas uma da outra (achado numa revisão) — próximas
 * fichas do mesmo tipo (APAC, TFD, SER) devem usar isto em vez de copiar um
 * arquivo de rota existente.
 *
 * `extraColumns` cobre o único ponto que varia de verdade entre as
 * features: colunas fora de encounter_id/patient_id/requested_by/
 * form_fields que valem a pena existir de verdade no banco (pra
 * busca/relatório), com sua própria forma de calcular o valor — vem de um
 * campo solto do corpo da requisição (ex.: `clinicalIndication` na
 * Solicitação de Sangue) ou de dentro do próprio form_fields já validado
 * (ex.: `medication` no ATM, extraído do campo `medicamento` do schema).
 */
export interface ClinicalFormExtraColumn<TBody> {
  /** Nome da coluna no banco (snake_case). */
  column: string;
  /** Nome no JSON de retorno (camelCase). */
  alias: string;
  /** Calcula o valor a partir do corpo já validado pelo zod e dos form_fields já saneados. */
  value: (body: TBody, sanitizedFields: Record<string, string>) => string;
}

export interface ClinicalFormRouteConfig<TBody extends { patientId: string; encounterId: string; formFields: Record<string, string> }> {
  schemaRoutePath: string;
  listRoutePath: string;
  createRoutePath: string;
  /** Nome completo da tabela (schema.tabela), ex.: 'app.blood_product_requests'. Vem só de código nosso, nunca de entrada do usuário. */
  table: string;
  schema: ClinicalFormSchema;
  readPermission: string;
  writePermission: string;
  createBodySchema: z.ZodType<TBody>;
  /** Código de erro pra quando a validação dos campos do formulário falha. */
  validationErrorCode: string;
  extraColumns: ClinicalFormExtraColumn<TBody>[];
}

export const registerClinicalFormRoutes = <
  TBody extends { patientId: string; encounterId: string; formFields: Record<string, string> },
>(
  app: FastifyInstance,
  pool: pg.Pool | null,
  config: ClinicalFormRouteConfig<TBody>,
): void => {
  app.get(config.schemaRoutePath, { preHandler: requirePermission(pool, config.readPermission) }, async (req, reply) => {
    return reply.status(200).send(success(config.schema, req.id));
  });

  app.get<{ Querystring: { encounterId?: string } }>(
    config.listRoutePath,
    { preHandler: requirePermission(pool, config.readPermission) },
    async (req, reply) => {
      const identity = req.identity!;
      const { encounterId } = req.query;
      const extraSelect = config.extraColumns.map((c) => `r.${c.column} as "${c.alias}"`).join(', ');

      const rows = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select r.id, r.encounter_id as "encounterId", r.patient_id as "patientId", p.full_name as "patientName",
                  r.requested_by as "requestedBy", u.name as "requestedByName"
                  ${extraSelect ? `, ${extraSelect}` : ''},
                  r.form_fields as "formFields", r.created_at as "createdAt"
           from ${config.table} r
           join app.patients p on p.id = r.patient_id
           join app.users u on u.id = r.requested_by
           where ($1::uuid is null or r.encounter_id = $1)
           order by r.created_at desc`,
          [encounterId ?? null],
        );
        return rows;
      });

      return reply.status(200).send(success(rows, req.id));
    },
  );

  app.post(config.createRoutePath, { preHandler: requirePermission(pool, config.writePermission) }, async (req, reply) => {
    const identity = req.identity!;
    const body = config.createBodySchema.parse(req.body);

    const errors = validateFormValues(config.schema, body.formFields);
    if (errors.length > 0) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: config.validationErrorCode,
        message: 'Campos da solicitação inválidos.',
        details: errors.map((e) => ({ field: e.fieldCode, issue: e.message })),
      });
    }
    const sanitizedFields = sanitizeFormValues(config.schema, body.formFields);

    const extraCols = config.extraColumns.map((c) => c.column);
    const extraVals = config.extraColumns.map((c) => c.value(body, sanitizedFields));
    const columns = ['encounter_id', 'patient_id', 'requested_by', ...extraCols, 'form_fields'];
    const values: unknown[] = [body.encounterId, body.patientId, identity.appUserId, ...extraVals, JSON.stringify(sanitizedFields)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const returningExtra = config.extraColumns.map((c) => `${c.column} as "${c.alias}"`).join(', ');

    const request = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
      const { rows } = await client.query(
        `insert into ${config.table} (${columns.join(', ')})
         values (${placeholders})
         returning id, encounter_id as "encounterId", patient_id as "patientId", requested_by as "requestedBy"
                   ${returningExtra ? `, ${returningExtra}` : ''},
                   form_fields as "formFields", created_at as "createdAt"`,
        values,
      );
      return rows[0];
    });

    return reply.status(201).send(success(request, req.id));
  });
};
