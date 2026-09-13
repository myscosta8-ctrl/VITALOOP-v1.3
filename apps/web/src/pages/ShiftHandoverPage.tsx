import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createShiftHandoverApi, type ShiftHandover, type ShiftPeriod } from '../lib/shift-handover-api.js';
import { createBedApi, type BedSectorData } from '../lib/bed-api.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';

/**
 * Passagem de Plantão Estruturada (Fase 5 do plano de reconstrução
 * assistencial) — diferente do SBAR (`SbarTransferModal.tsx`, que cobre a
 * transferência clínica de UM paciente), esta tela é o resumo de
 * setor/turno inteiro entre equipes (censo, pendências, alertas críticos),
 * que não existia registro nenhum antes.
 */
export const ShiftHandoverPage: React.FC = () => {
  const { api } = useSession();
  const shiftHandoverApi = createShiftHandoverApi(api);
  const bedApi = createBedApi(api);

  const [sectors, setSectors] = useState<readonly BedSectorData[]>([]);
  const [handovers, setHandovers] = useState<readonly ShiftHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sectorId, setSectorId] = useState('');
  const [shiftPeriod, setShiftPeriod] = useState<ShiftPeriod>('manha');
  const [patientCensus, setPatientCensus] = useState('');
  const [criticalAlerts, setCriticalAlerts] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [summaryNotes, setSummaryNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sectorsData, handoversData] = await Promise.all([
        bedApi.getSectors(),
        shiftHandoverApi.listHandovers(),
      ]);
      setSectors(Array.isArray(sectorsData) ? sectorsData : []);
      setHandovers(Array.isArray(handoversData) ? handoversData : []);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao carregar passagens de plantão.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await shiftHandoverApi.createHandover({
        sectorId: sectorId || null,
        shiftPeriod,
        patientCensus: patientCensus ? Number(patientCensus) : null,
        criticalAlerts: criticalAlerts.trim() || null,
        pendingTasks: pendingTasks.trim() || null,
        summaryNotes,
      });
      setPatientCensus('');
      setCriticalAlerts('');
      setPendingTasks('');
      setSummaryNotes('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao registrar passagem de plantão.');
    } finally {
      setSubmitting(false);
    }
  };

  const shiftLabel: Record<ShiftPeriod, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
  const sectorName = (id?: string | null) => sectors.find((s) => s.id === id)?.name ?? 'Geral (todos os setores)';

  return (
    <main aria-labelledby="shift-handover-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="shift-handover-heading">Passagem de Plantão</h1>
          <p>Resumo de setor/turno entre equipes — censo, pendências e alertas críticos.</p>
        </div>
      </div>

      {errorMessage && <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage}</p>}

      <Card style={{ marginBottom: 20 }}>
        <CardHeader><strong>Registrar Passagem de Plantão</strong></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Setor</label>
              <select value={sectorId} onChange={(e) => setSectorId(e.target.value)} style={{ width: '100%', padding: 8 }}>
                <option value="">Geral (todos os setores)</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Turno *</label>
              <select value={shiftPeriod} onChange={(e) => setShiftPeriod(e.target.value as ShiftPeriod)} style={{ width: '100%', padding: 8 }}>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Censo de Pacientes</label>
              <input type="number" value={patientCensus} onChange={(e) => setPatientCensus(e.target.value)} style={{ width: '100%', padding: 8 }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Alertas Críticos</label>
              <textarea rows={2} value={criticalAlerts} onChange={(e) => setCriticalAlerts(e.target.value)} style={{ width: '100%', padding: 8 }} placeholder="Pacientes instáveis, pendências urgentes..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Pendências</label>
              <textarea rows={2} value={pendingTasks} onChange={(e) => setPendingTasks(e.target.value)} style={{ width: '100%', padding: 8 }} placeholder="Exames a coletar, reavaliações agendadas..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Resumo do Plantão *</label>
              <textarea rows={3} value={summaryNotes} onChange={(e) => setSummaryNotes(e.target.value)} style={{ width: '100%', padding: 8 }} required minLength={10} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Button type="submit" disabled={submitting}>Registrar Passagem</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><strong>Últimas Passagens de Plantão</strong></CardHeader>
        <CardContent>
          {loading ? (
            <p role="status">Carregando…</p>
          ) : handovers.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma passagem de plantão registrada ainda.</p>
          ) : (
            handovers.map((h) => (
              <div key={h.id} style={{ padding: 10, borderLeft: '4px solid #2563eb', backgroundColor: '#f8fafc', marginBottom: 8, fontSize: 13 }}>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {new Date(h.handoverDate).toLocaleDateString('pt-BR')} — {shiftLabel[h.shiftPeriod]} — {sectorName(h.sectorId)}
                </div>
                {h.patientCensus != null && <div><strong>Censo:</strong> {h.patientCensus} pacientes</div>}
                {h.criticalAlerts && <div><strong>Alertas:</strong> {h.criticalAlerts}</div>}
                {h.pendingTasks && <div><strong>Pendências:</strong> {h.pendingTasks}</div>}
                <div style={{ marginTop: 4 }}>{h.summaryNotes}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
};
