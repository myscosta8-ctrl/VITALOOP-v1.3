import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createPharmacyStockApi, type PharmacyStockBatch, type StockMovementType } from '../lib/pharmacy-stock-api.js';
import type { MedicationItem } from '../lib/prescriptions-api.js';
import { MedicationSearchInput } from '../components/MedicationSearchInput.js';
import { Card, CardContent, CardHeader } from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';

const isExpiringSoon = (expiryDate: string): boolean => {
  const days = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days <= 30;
};

const isExpired = (expiryDate: string): boolean => new Date(expiryDate).getTime() < Date.now();

/**
 * Estoque de Farmácia (lote/validade) — Fase 5 do plano de reconstrução
 * assistencial: o Vitaloop só tinha catálogo de medicamentos, sem controle
 * de lote/validade/quantidade real. Reaproveita `MedicationSearchInput.tsx`
 * (mesmo componente já usado na prescrição) pra selecionar o medicamento do
 * novo lote, em vez de duplicar um seletor.
 */
export const PharmacyStockPage: React.FC = () => {
  const { api } = useSession();
  const pharmacyStockApi = createPharmacyStockApi(api);

  const [batches, setBatches] = useState<readonly PharmacyStockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedMedication, setSelectedMedication] = useState<MedicationItem | null>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [movementBatchId, setMovementBatchId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType>('saida');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await pharmacyStockApi.listBatches());
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao carregar estoque de farmácia.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedication) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await pharmacyStockApi.createBatch({
        medicationId: selectedMedication.id,
        batchNumber: batchNumber.trim(),
        expiryDate,
        quantityOnHand: Number(quantity),
        unit: unit.trim(),
      });
      setSelectedMedication(null);
      setBatchNumber('');
      setExpiryDate('');
      setQuantity('');
      setUnit('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao registrar lote de estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementBatchId) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await pharmacyStockApi.createMovement(movementBatchId, {
        movementType,
        quantity: Number(movementQuantity),
        reason: movementReason.trim() || null,
      });
      setMovementBatchId(null);
      setMovementQuantity('');
      setMovementReason('');
      await load();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao registrar movimentação de estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main aria-labelledby="pharmacy-stock-heading">
      <div className="vl-page-head">
        <div>
          <h1 id="pharmacy-stock-heading">Estoque de Farmácia</h1>
          <p>Controle de lote, validade e quantidade — entrada, saída e ajuste.</p>
        </div>
      </div>

      {errorMessage && <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage}</p>}

      <Card style={{ marginBottom: 20 }}>
        <CardHeader><strong>Dar Entrada em Novo Lote</strong></CardHeader>
        <CardContent>
          <form onSubmit={handleCreateBatch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Medicamento *</label>
              <MedicationSearchInput selectedItem={selectedMedication} onSelect={setSelectedMedication} onClear={() => setSelectedMedication(null)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Número do Lote *</label>
              <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} style={{ width: '100%', padding: 8 }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Validade *</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={{ width: '100%', padding: 8 }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Quantidade *</label>
              <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: 8 }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Unidade *</label>
              <input type="text" placeholder="Ex.: comprimido, ampola, frasco" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', padding: 8 }} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Button type="submit" disabled={submitting || !selectedMedication}>Registrar Entrada</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><strong>Lotes em Estoque</strong></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p role="status" className="p-5">Carregando…</p>
          ) : batches.length === 0 ? (
            <p style={{ padding: 20, color: '#64748b' }}>Nenhum lote registrado ainda.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left text-xs text-muted-foreground">
                  <th className="p-3">Medicamento</th>
                  <th className="p-3">Lote</th>
                  <th className="p-3">Validade</th>
                  <th className="p-3">Quantidade</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-3">{b.medicationName}</td>
                    <td className="p-3 font-mono">{b.batchNumber}</td>
                    <td className="p-3">
                      {new Date(b.expiryDate).toLocaleDateString('pt-BR')}
                      {isExpired(b.expiryDate) && <Badge variant="destructive" className="ml-2">VENCIDO</Badge>}
                      {!isExpired(b.expiryDate) && isExpiringSoon(b.expiryDate) && <Badge variant="warning" className="ml-2">VENCE EM BREVE</Badge>}
                    </td>
                    <td className="p-3">{b.quantityOnHand} {b.unit}</td>
                    <td className="p-3">
                      <Button size="sm" variant="secondary" onClick={() => setMovementBatchId(b.id)}>Movimentar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {movementBatchId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: 400 }}>
            <h4>Registrar Movimentação</h4>
            <form onSubmit={handleMovement}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Tipo *</label>
              <select value={movementType} onChange={(e) => setMovementType(e.target.value as StockMovementType)} style={{ width: '100%', padding: 8, marginBottom: 8 }}>
                <option value="saida">Saída</option>
                <option value="entrada">Entrada</option>
                <option value="ajuste">Ajuste</option>
              </select>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Quantidade *</label>
              <input type="number" step="0.01" value={movementQuantity} onChange={(e) => setMovementQuantity(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} required />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Motivo</label>
              <input type="text" value={movementReason} onChange={(e) => setMovementReason(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button type="button" variant="ghost" onClick={() => setMovementBatchId(null)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
