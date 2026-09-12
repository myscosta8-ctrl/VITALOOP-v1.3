import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { createIntegrationApi } from '../lib/integration-api.js';
import { Card, CardContent, CardHeader } from './ui/card.js';
import { Button } from './ui/button.js';
import { EmptyState } from './ui/empty-state.js';

export const InteroperabilityDashboardPage: React.FC = () => {
  const { api } = useSession();
  const integrationApi = createIntegrationApi(api);
  const queryClient = useQueryClient();

  const [rawHl7, setRawHl7] = useState(
    'MSH|^~\\&|LIS|LAB|VITALOOP|UPA|20260829100000||ORU^R01|MSG-998811|P|2.5\rPID|1||PAT-12345||SILVA^MARIA||19850520|F\rOBX|1|NM|GLUCOSE||98|mg/dL||||F'
  );
  const [statusMsg, setStatusMsg] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['integration-messages'],
    queryFn: () => integrationApi.fetchIntegrationMessages(),
  });

  const messages = messagesQuery.data ?? [];
  const loading = messagesQuery.isLoading;
  const displayStatusMsg = statusMsg || (messagesQuery.isError ? (messagesQuery.error as Error).message : '');

  const sendHl7Mutation = useMutation({
    mutationFn: () => integrationApi.sendHl7OruMessage(rawHl7),
    onSuccess: (res) => {
      setStatusMsg(`Mensagem HL7 recebida e processada com sucesso no barramento! ID: ${res.id}`);
      return queryClient.invalidateQueries({ queryKey: ['integration-messages'] });
    },
    onError: (err: unknown) => setStatusMsg((err as Error).message),
  });

  const handleSendHl7 = (e: React.FormEvent) => {
    e.preventDefault();
    sendHl7Mutation.mutate();
  };

  return (
    <div data-testid="interoperability-dashboard">
      <h2>Painel de Interoperabilidade e Barramento FHIR R4 / HL7 (INT-001..003, INT-009)</h2>
      {displayStatusMsg && <p data-testid="integration-status-msg" className="mb-3 text-sm text-muted-foreground">{displayStatusMsg}</p>}

      <Card>
        <CardHeader className="text-sm font-semibold text-muted-foreground">Simular Envio de Mensagem HL7 ORU_R01 (Laboratório LIS)</CardHeader>
        <CardContent>
          <form onSubmit={handleSendHl7} data-testid="hl7-form">
            <textarea
              value={rawHl7}
              onChange={(e) => setRawHl7(e.target.value)}
              rows={5}
              style={{ width: '100%' }}
              data-testid="hl7-textarea"
            />
            <Button type="submit" className="mt-3" data-testid="send-hl7-btn">
              Injetar Mensagem HL7 no Barramento
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="text-sm font-semibold text-muted-foreground">Mensagens no Barramento de Integração ({messages.length})</CardHeader>
        {loading ? (
          <CardContent><p className="text-sm text-muted-foreground">Carregando barramento...</p></CardContent>
        ) : messages.length === 0 ? (
          <CardContent><EmptyState className="border-none p-0" title="Nenhuma mensagem no barramento ainda" /></CardContent>
        ) : (
          <CardContent className="overflow-x-auto p-0">
            <table data-testid="messages-table" className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3 font-semibold">Tipo</th>
                  <th className="p-3 font-semibold">Origem</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3">{m.messageType}</td>
                    <td className="p-3">{m.sender}</td>
                    <td className="p-3">{m.status}</td>
                    <td className="p-3">{m.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
