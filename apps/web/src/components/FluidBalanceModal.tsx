import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createFluidBalanceApi, type FluidBalancePeriodDetail, type FluidBalancePeriodWithTotals } from '../lib/fluid-balance-api.js';

interface FluidBalanceModalProps {
  encounterId: string;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);
const currentHour = (): number => new Date().getHours();
const currentMinute = (): number => new Date().getMinutes();

export const FluidBalanceModal: React.FC<FluidBalanceModalProps> = ({ encounterId }) => {
  const { api } = useSession();
  const fluidBalanceApi = createFluidBalanceApi(api);

  const [period, setPeriod] = useState<FluidBalancePeriodDetail | null>(null);
  const [history, setHistory] = useState<FluidBalancePeriodWithTotals[]>([]);
  const [msg, setMsg] = useState('');

  const [direction, setDirection] = useState<'gain' | 'loss'>('gain');
  const [itemName, setItemName] = useState('');
  const [volumeMl, setVolumeMl] = useState('');
  const [entryHour, setEntryHour] = useState(currentHour());
  const [entryMinute, setEntryMinute] = useState(currentMinute());
  const [region, setRegion] = useState('');
  const [laterality, setLaterality] = useState<'' | 'left' | 'right' | 'bilateral'>('');

  const loadCurrent = async () => {
    try {
      const p = await fluidBalanceApi.getOrCreateCurrentPeriod(encounterId, todayIso());
      const detail = await fluidBalanceApi.getPeriod(p.id);
      setPeriod(detail);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const loadHistory = async () => {
    try {
      const list = await fluidBalanceApi.listPeriods(encounterId);
      setHistory(list);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  useEffect(() => {
    loadCurrent();
    loadHistory();
  }, [api, encounterId]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period) return;
    try {
      await fluidBalanceApi.addEntry(period.id, {
        direction,
        itemName,
        volumeMl: Number(volumeMl),
        entryDate: todayIso(),
        entryHour,
        entryMinute,
        region: region || null,
        laterality: laterality || null,
      });
      setItemName('');
      setVolumeMl('');
      setRegion('');
      setLaterality('');
      setMsg('Lançamento registrado com sucesso!');
      await loadCurrent();
      await loadHistory();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleClose = async (targetStatus: 'partially_closed' | 'closed') => {
    if (!period) return;
    try {
      await fluidBalanceApi.closePeriod(period.id, targetStatus);
      setMsg(targetStatus === 'closed' ? 'Balanço hídrico fechado com sucesso!' : 'Balanço hídrico fechado parcialmente com sucesso!');
      await loadCurrent();
      await loadHistory();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const canEdit = period && period.status !== 'closed';

  return (
    <div data-testid="fluid-balance-modal">
      <h3>Balanço Hídrico</h3>
      {msg && <p data-testid="fluid-balance-msg">{msg}</p>}

      {!period ? (
        <p role="status">Carregando…</p>
      ) : (
        <>
          <p data-testid="fluid-balance-header">
            Balanço Hídrico: {period.balanceNumber} — Situação: {period.status} — Data de Referência: {period.referenceDate}
          </p>

          <table data-testid="fluid-balance-entries-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Direção</th>
                <th>Item</th>
                <th>Volume (ml)</th>
                <th>Região</th>
                <th>Lateralidade</th>
              </tr>
            </thead>
            <tbody>
              {period.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{String(entry.entryHour).padStart(2, '0')}:{String(entry.entryMinute).padStart(2, '0')}</td>
                  <td>{entry.direction === 'gain' ? 'Ganho' : 'Perda'}</td>
                  <td>{entry.itemName}</td>
                  <td>{entry.volumeMl}</td>
                  <td>{entry.region ?? '—'}</td>
                  <td>{entry.laterality ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p data-testid="fluid-balance-totals">
            Total Ganho: {period.totals.totalGainMl} ml — Total Perda: {period.totals.totalLossMl} ml — Balanço Líquido: {period.totals.netBalanceMl} ml
          </p>

          {canEdit && (
            <form onSubmit={handleAddEntry} data-testid="fluid-balance-entry-form">
              <label>
                Direção:
                <select value={direction} onChange={(e) => setDirection(e.target.value as 'gain' | 'loss')} data-testid="direction-select">
                  <option value="gain">Ganho</option>
                  <option value="loss">Perda</option>
                </select>
              </label>
              <label>
                Item:
                <input value={itemName} onChange={(e) => setItemName(e.target.value)} data-testid="item-name-input" />
              </label>
              <label>
                Volume (ml):
                <input type="number" value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} data-testid="volume-input" />
              </label>
              <label>
                Hora:
                <input type="number" min={0} max={23} value={entryHour} onChange={(e) => setEntryHour(Number(e.target.value))} data-testid="hour-input" />
              </label>
              <label>
                Minuto:
                <input type="number" min={0} max={59} value={entryMinute} onChange={(e) => setEntryMinute(Number(e.target.value))} data-testid="minute-input" />
              </label>
              <label>
                Região (opcional):
                <input value={region} onChange={(e) => setRegion(e.target.value)} data-testid="region-input" />
              </label>
              <label>
                Lateralidade (opcional):
                <select value={laterality} onChange={(e) => setLaterality(e.target.value as typeof laterality)} data-testid="laterality-select">
                  <option value="">—</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                  <option value="bilateral">Bilateral</option>
                </select>
              </label>
              <button type="submit" data-testid="add-entry-btn">Adicionar Lançamento</button>
            </form>
          )}

          {canEdit && (
            <div>
              <button type="button" onClick={() => handleClose('partially_closed')} data-testid="close-partial-btn">
                Fechar Parcial
              </button>
              <button type="button" onClick={() => handleClose('closed')} data-testid="close-final-btn">
                Fechar Balanço
              </button>
            </div>
          )}
        </>
      )}

      <h4>Histórico de Balanço</h4>
      <table data-testid="fluid-balance-history-table">
        <thead>
          <tr>
            <th>Balanço</th>
            <th>Situação</th>
            <th>Data de Referência</th>
            <th>Ganho (ml)</th>
            <th>Perda (ml)</th>
            <th>Total (ml)</th>
          </tr>
        </thead>
        <tbody>
          {history.map((p) => (
            <tr key={p.id}>
              <td>{p.balanceNumber}</td>
              <td>{p.status}</td>
              <td>{p.referenceDate}</td>
              <td>{p.totals.totalGainMl}</td>
              <td>{p.totals.totalLossMl}</td>
              <td>{p.totals.netBalanceMl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
