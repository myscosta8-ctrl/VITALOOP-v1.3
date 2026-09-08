import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSusApi, type AihRequestRecord, type ApacRequestRecord } from '../lib/sus-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface SusAuthorizationPanelProps {
  encounterId: string;
}

type DocType = 'aih' | 'apac';

// Autorização é uma etapa SEPARADA da solicitação (feita pela
// regulação/auditoria, não por quem solicitou) — ver
// packages/domain/src/sus/aih-clinical-schema.ts (AIH_AUTHORIZATION_FIELDS_SCHEMA)
// e apac-clinical-schema.ts. Painel único porque AIH e APAC compartilham o
// mesmo conceito de "laudo pendente de autorização" dentro da aba de
// Solicitações Médicas do atendimento.
export const SusAuthorizationPanel: React.FC<SusAuthorizationPanelProps> = ({ encounterId }) => {
  const { api } = useSession();
  const susApi = createSusApi(api);

  const [aihRequests, setAihRequests] = useState<AihRequestRecord[]>([]);
  const [apacRequests, setApacRequests] = useState<ApacRequestRecord[]>([]);
  const [msg, setMsg] = useState('');

  const [authorizing, setAuthorizing] = useState<{ type: DocType; id: string } | null>(null);
  const [aihAuthSchema, setAihAuthSchema] = useState<ClinicalFormSchema | null>(null);
  const [apacAuthSchema, setApacAuthSchema] = useState<ClinicalFormSchema | null>(null);
  const [formFields, setFormFields] = useState<Record<string, string>>({});

  const loadRequests = async () => {
    try {
      const [aih, apac] = await Promise.all([susApi.listAihRequests(encounterId), susApi.listApacRequests(encounterId)]);
      setAihRequests(aih);
      setApacRequests(apac);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  useEffect(() => {
    loadRequests();
    susApi
      .getAihAuthorizationFieldsSchema()
      .then(setAihAuthSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
    susApi
      .getApacAuthorizationFieldsSchema()
      .then(setApacAuthSchema)
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api, encounterId]);

  const startAuthorizing = (type: DocType, id: string) => {
    setAuthorizing({ type, id });
    setFormFields({});
    setMsg('');
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorizing) return;
    try {
      if (authorizing.type === 'aih') {
        await susApi.authorizeAihRequest(authorizing.id, formFields);
        setMsg('Laudo de AIH autorizado com sucesso!');
      } else {
        await susApi.authorizeApacRequest(authorizing.id, formFields);
        setMsg('Laudo de APAC autorizado com sucesso!');
      }
      setAuthorizing(null);
      await loadRequests();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const renderList = (type: DocType, requests: Array<AihRequestRecord | ApacRequestRecord>, label: string) => (
    <div>
      <h4>{label}</h4>
      {requests.length === 0 ? (
        <p role="status">Nenhum laudo de {label.toUpperCase()} para este atendimento.</p>
      ) : (
        <table data-testid={`${type}-authorization-table`}>
          <thead>
            <tr>
              <th>Procedimento</th>
              <th>CID-10</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.mainProcedureCode}</td>
                <td>{r.mainCid10}</td>
                <td>{r.status}</td>
                <td>
                  {r.status !== 'authorized' && (
                    <button type="button" onClick={() => startAuthorizing(type, r.id)} data-testid={`authorize-${type}-btn-${r.id}`}>
                      Autorizar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const activeSchema = authorizing?.type === 'aih' ? aihAuthSchema : apacAuthSchema;

  return (
    <div data-testid="sus-authorization-panel">
      <h3>Autorização de Laudos AIH/APAC</h3>
      {msg && <p data-testid="sus-authorization-msg">{msg}</p>}

      {renderList('aih', aihRequests, 'AIH')}
      {renderList('apac', apacRequests, 'APAC')}

      {authorizing && activeSchema && (
        <form onSubmit={handleAuthorize} data-testid="authorization-form">
          <h4>Autorizar laudo de {authorizing.type.toUpperCase()}</h4>
          <DynamicClinicalForm schema={activeSchema} values={formFields} onChange={setFormFields} />
          <button type="submit" data-testid="submit-authorization-btn">
            Confirmar Autorização
          </button>
          <button type="button" onClick={() => setAuthorizing(null)}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
};
