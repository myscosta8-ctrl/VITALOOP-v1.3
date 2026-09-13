import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createSusApi, type AihRequestRecord, type ApacRequestRecord } from '../lib/sus-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';
import { Card, CardContent } from './ui/card.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { EmptyState } from './ui/empty-state.js';

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
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>
      {requests.length === 0 ? (
        <EmptyState className="p-3" title={`Nenhum laudo de ${label.toUpperCase()} para este atendimento.`} />
      ) : (
        <table data-testid={`${type}-authorization-table`} className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Procedimento</th>
              <th className="py-1.5 pr-3 font-medium">CID-10</th>
              <th className="py-1.5 pr-3 font-medium">Status</th>
              <th className="py-1.5 pr-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-3">{r.mainProcedureCode}</td>
                <td className="py-1.5 pr-3">{r.mainCid10}</td>
                <td className="py-1.5 pr-3">
                  <Badge variant={r.status === 'authorized' ? 'success' : 'outline'}>{r.status}</Badge>
                </td>
                <td className="py-1.5 pr-3">
                  {r.status !== 'authorized' && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => startAuthorizing(type, r.id)} data-testid={`authorize-${type}-btn-${r.id}`}>
                      Autorizar
                    </Button>
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
    <div data-testid="sus-authorization-panel" className="space-y-5">
      {msg && <p data-testid="sus-authorization-msg" className="text-sm text-muted-foreground">{msg}</p>}

      {renderList('aih', aihRequests, 'AIH')}
      {renderList('apac', apacRequests, 'APAC')}

      {authorizing && activeSchema && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h4 className="text-sm font-semibold text-foreground">Autorizar laudo de {authorizing.type.toUpperCase()}</h4>
            <form onSubmit={handleAuthorize} data-testid="authorization-form" className="space-y-3">
              <DynamicClinicalForm schema={activeSchema} values={formFields} onChange={setFormFields} />
              <div className="flex gap-2">
                <Button type="submit" data-testid="submit-authorization-btn">
                  Confirmar Autorização
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAuthorizing(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
