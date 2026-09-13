import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import {
  createControlledMedicationsApi,
  type ControlledMedicationDispensation,
  type EligiblePrescriptionItem,
} from '../lib/controlled-medications-api.js';

interface ControlledMedicationModalProps {
  encounterId: string;
  onSuccess?: () => void;
}

const NOTIFICATION_REQUIRED = new Set(['A1', 'A2', 'A3', 'B1', 'B2']);

/**
 * Rastreio de dispensação de medicamentos controlados (Portaria SVS/MS
 * 344/98, Fase 5 do plano de reconstrução assistencial) — só lista itens de
 * prescrição do atendimento que já estão marcados como controlados no
 * catálogo (`eligible-items`); se não houver nenhum, avisa em vez de mostrar
 * formulário vazio.
 */
export const ControlledMedicationModal: React.FC<ControlledMedicationModalProps> = ({ encounterId, onSuccess }) => {
  const { api } = useSession();
  const controlledMedicationsApi = createControlledMedicationsApi(api);

  const [items, setItems] = useState<readonly EligiblePrescriptionItem[]>([]);
  const [dispensations, setDispensations] = useState<readonly ControlledMedicationDispensation[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [notificationNumber, setNotificationNumber] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, dispData] = await Promise.all([
        controlledMedicationsApi.listEligibleItems(encounterId),
        controlledMedicationsApi.listDispensations(encounterId),
      ]);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setDispensations(Array.isArray(dispData) ? dispData : []);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const requiresNotification = selectedItem ? NOTIFICATION_REQUIRED.has(selectedItem.controlled_class) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await controlledMedicationsApi.createDispensation(encounterId, {
        prescriptionItemId: selectedItemId,
        quantityDispensed: Number(quantity),
        unit,
        prescriptionNotificationNumber: notificationNumber.trim() || null,
        witnessName: witnessName.trim() || null,
      });
      setMsg('Dispensação de medicamento controlado registrada com sucesso!');
      setSelectedItemId('');
      setQuantity('');
      setUnit('');
      setNotificationNumber('');
      setWitnessName('');
      await load();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="controlled-medication-modal">
      <h3>Medicamentos Controlados — Rastreio de Dispensação</h3>
      {msg && <p data-testid="controlled-medication-status-msg">{msg}</p>}

      {loading ? (
        <p role="status">Carregando…</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Nenhum item de prescrição controlado (Portaria 344/98) encontrado para este atendimento.
        </p>
      ) : (
        <form onSubmit={handleSubmit} data-testid="controlled-medication-form">
          <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Item de Prescrição *</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
            required
          >
            <option value="">Selecione…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.medication_name} — {i.dose}{i.dose_unit} (Lista {i.controlled_class})
              </option>
            ))}
          </select>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Quantidade Dispensada *</label>
          <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} required />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Unidade *</label>
          <input type="text" placeholder="Ex.: comprimido, ampola, ml" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} required />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>
            Número da Notificação de Receita {requiresNotification && '*'}
          </label>
          <input
            type="text"
            value={notificationNumber}
            onChange={(e) => setNotificationNumber(e.target.value)}
            placeholder={requiresNotification ? 'Obrigatório para listas A/B' : 'Não obrigatório para esta lista'}
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
            required={requiresNotification}
          />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Nome da Testemunha (se aplicável)</label>
          <input type="text" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} />

          <button type="submit" disabled={submitting || !selectedItemId} data-testid="submit-controlled-medication-btn">
            {submitting ? 'Registrando…' : 'Registrar Dispensação'}
          </button>
        </form>
      )}

      {dispensations.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <h4>Histórico de Dispensações</h4>
          {dispensations.map((d) => (
            <div key={d.id} style={{ padding: 8, borderLeft: '4px solid #b91c1c', backgroundColor: '#fef2f2', marginBottom: 6, fontSize: 13 }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>{new Date(d.dispensedAt).toLocaleString('pt-BR')}</div>
              <div>Lista {d.controlledClass} — {d.quantityDispensed} {d.unit}{d.prescriptionNotificationNumber ? ` — Notificação: ${d.prescriptionNotificationNumber}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
