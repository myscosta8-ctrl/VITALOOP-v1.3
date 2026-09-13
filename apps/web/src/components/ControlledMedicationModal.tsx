import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import {
  createControlledMedicationsApi,
  type ControlledMedicationDispensation,
  type EligiblePrescriptionItem,
} from '../lib/controlled-medications-api.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Label } from './ui/label.js';
import { Select } from './ui/select.js';
import { EmptyState } from './ui/empty-state.js';

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
    <div data-testid="controlled-medication-modal" className="space-y-4">
      {msg && <p data-testid="controlled-medication-status-msg" className="text-sm text-muted-foreground">{msg}</p>}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <EmptyState
          className="p-3"
          title="Nenhum item de prescrição controlado (Portaria 344/98) encontrado para este atendimento."
        />
      ) : (
        <form onSubmit={handleSubmit} data-testid="controlled-medication-form" className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="controlled-med-item">Item de Prescrição *</Label>
            <Select
              id="controlled-med-item"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.medication_name} — {i.dose}{i.dose_unit} (Lista {i.controlled_class})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="controlled-med-qty">Quantidade Dispensada *</Label>
            <Input
              id="controlled-med-qty"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="controlled-med-unit">Unidade *</Label>
            <Input
              id="controlled-med-unit"
              type="text"
              placeholder="Ex.: comprimido, ampola, ml"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="controlled-med-notification">
              Número da Notificação de Receita {requiresNotification && '*'}
            </Label>
            <Input
              id="controlled-med-notification"
              type="text"
              value={notificationNumber}
              onChange={(e) => setNotificationNumber(e.target.value)}
              placeholder={requiresNotification ? 'Obrigatório para listas A/B' : 'Não obrigatório para esta lista'}
              required={requiresNotification}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="controlled-med-witness">Nome da Testemunha (se aplicável)</Label>
            <Input
              id="controlled-med-witness"
              type="text"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting || !selectedItemId} data-testid="submit-controlled-medication-btn">
            {submitting ? 'Registrando…' : 'Registrar Dispensação'}
          </Button>
        </form>
      )}

      {dispensations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Histórico de Dispensações</h4>
          {dispensations.map((d) => (
            <div key={d.id} className="rounded-md border-l-4 border-l-destructive bg-destructive/10 p-2 text-sm">
              <div className="text-xs text-muted-foreground">{new Date(d.dispensedAt).toLocaleString('pt-BR')}</div>
              <div>Lista {d.controlledClass} — {d.quantityDispensed} {d.unit}{d.prescriptionNotificationNumber ? ` — Notificação: ${d.prescriptionNotificationNumber}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
