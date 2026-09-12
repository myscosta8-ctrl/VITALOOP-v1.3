import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createEncountersApi,
  type EncounterOrigin,
  type EncounterType,
} from '../lib/encounters-api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';

export const EncounterOpenPage: React.FC = () => {
  const { api } = useSession();
  const encountersApi = createEncountersApi(api);

  const [patientId, setPatientId] = useState('');
  const [encounterType, setEncounterType] = useState<EncounterType>('urgency');
  const [origin, setOrigin] = useState<EncounterOrigin>('spontaneous');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!patientId.trim()) {
      setErrorMessage('O ID do paciente é obrigatório.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setErrorMessage('A queixa principal é obrigatória.');
      return;
    }

    setLoading(true);
    try {
      const created = await encountersApi.createEncounter({
        patientId: patientId.trim(),
        encounterType,
        origin,
        chiefComplaint: chiefComplaint.trim(),
      });
      setSuccessMessage(`Atendimento aberto com sucesso! ID: ${created.id}`);
      setPatientId('');
      setChiefComplaint('');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao abrir atendimento.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl py-5">
      <Card>
        <CardHeader>
          <CardTitle>Abertura de Atendimento (UPA 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p role="status" className="mb-4 rounded-md bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-success)]">
              {successMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ border: 'none', padding: 0, boxShadow: 'none', maxWidth: 'none' }}>
            <label htmlFor="patientId">ID do Paciente *</label>
            <input
              id="patientId"
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Cole o ID (UUID) do paciente"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label htmlFor="encounterType">Tipo de Atendimento *</label>
                <select id="encounterType" value={encounterType} onChange={(e) => setEncounterType(e.target.value as EncounterType)}>
                  <option value="urgency">Urgência</option>
                  <option value="emergency">Emergência</option>
                  <option value="elective">Eletivo / Consulta</option>
                  <option value="return">Retorno</option>
                </select>
              </div>

              <div>
                <label htmlFor="origin">Origem da Chegada *</label>
                <select id="origin" value={origin} onChange={(e) => setOrigin(e.target.value as EncounterOrigin)}>
                  <option value="spontaneous">Demanda Espontânea</option>
                  <option value="samu">SAMU</option>
                  <option value="transfer">Transferência Inter-hospitalar</option>
                  <option value="rescue_other">Resgate / Outros</option>
                </select>
              </div>
            </div>

            <label htmlFor="chiefComplaint">Queixa Principal / Motivo do Atendimento *</label>
            <textarea
              id="chiefComplaint"
              rows={3}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Descreva a queixa principal trazida pelo paciente ou acompanhante"
            />

            <div className="vl-modal-actions">
              <Button asChild variant="ghost">
                <a href="#/atendimentos">Voltar para Fila</a>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Abrindo Atendimento...' : 'Abrir Atendimento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};
