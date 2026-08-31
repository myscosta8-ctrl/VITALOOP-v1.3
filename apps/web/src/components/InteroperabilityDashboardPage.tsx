import React, { useState, useEffect } from 'react';
import { fetchIntegrationMessages, sendHl7OruMessage } from '../lib/integration-api.js';

export const InteroperabilityDashboardPage: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ id: string; messageType: string; sender: string; status: string; createdAt: string }>>([]);
  const [rawHl7, setRawHl7] = useState(
    'MSH|^~\\&|LIS|LAB|VITALOOP|UPA|20260829100000||ORU^R01|MSG-998811|P|2.5\rPID|1||PAT-12345||SILVA^MARIA||19850520|F\rOBX|1|NM|GLUCOSE||98|mg/dL||||F'
  );
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetchIntegrationMessages();
      setMessages(res.data);
    } catch (err: unknown) {
      setStatusMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSendHl7 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sendHl7OruMessage(rawHl7);
      setStatusMsg(`Mensagem HL7 recebida e processada com sucesso no barramento! ID: ${res.data.id}`);
      loadMessages();
    } catch (err: unknown) {
      setStatusMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="interoperability-dashboard">
      <h2>Painel de Interoperabilidade e Barramento FHIR R4 / HL7 (INT-001..003, INT-009)</h2>
      {statusMsg && <p data-testid="integration-status-msg">{statusMsg}</p>}

      <section>
        <h3>Simular Envio de Mensagem HL7 ORU_R01 (Laboratório LIS)</h3>
        <form onSubmit={handleSendHl7} data-testid="hl7-form">
          <textarea
            value={rawHl7}
            onChange={(e) => setRawHl7(e.target.value)}
            rows={5}
            style={{ width: '100%' }}
            data-testid="hl7-textarea"
          />
          <button type="submit" data-testid="send-hl7-btn">
            Injetar Mensagem HL7 no Barramento
          </button>
        </form>
      </section>

      <section style={{ marginTop: '20px' }}>
        <h3>Mensagens no Barramento de Integração ({messages.length})</h3>
        {loading ? (
          <p>Carregando barramento...</p>
        ) : (
          <table data-testid="messages-table" border={1} cellPadding={5}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>{m.messageType}</td>
                  <td>{m.sender}</td>
                  <td>{m.status}</td>
                  <td>{m.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};
