import { describe, it, expect } from 'vitest';
import {
  validateFluidBalanceEntryInput,
  computeFluidBalanceTotals,
  validateFluidBalanceStatusTransition,
} from './rules.js';
import type { FluidBalanceEntry } from './types.js';

describe('Regras de Domínio de Balanço Hídrico', () => {
  it('valida nome do item, volume, hora e minuto do lançamento', () => {
    expect(() => {
      validateFluidBalanceEntryInput({
        periodId: '11111111-1111-1111-1111-111111111111',
        direction: 'gain',
        itemName: '',
        volumeMl: 100,
        entryDate: '2026-09-07',
        entryHour: 14,
      });
    }).toThrow('O nome do item lançado no balanço hídrico é obrigatório.');

    expect(() => {
      validateFluidBalanceEntryInput({
        periodId: '11111111-1111-1111-1111-111111111111',
        direction: 'loss',
        itemName: 'Diurese',
        volumeMl: 0,
        entryDate: '2026-09-07',
        entryHour: 14,
      });
    }).toThrow('O volume lançado deve ser um número maior que zero.');

    expect(() => {
      validateFluidBalanceEntryInput({
        periodId: '11111111-1111-1111-1111-111111111111',
        direction: 'gain',
        itemName: 'Soro fisiológico 0,9%',
        volumeMl: 200,
        entryDate: '2026-09-07',
        entryHour: 25,
      });
    }).toThrow('O horário do lançamento deve ser um número inteiro entre 0 e 23.');

    expect(() => {
      validateFluidBalanceEntryInput({
        periodId: '11111111-1111-1111-1111-111111111111',
        direction: 'gain',
        itemName: 'Soro fisiológico 0,9%',
        volumeMl: 200,
        entryDate: '2026-09-07',
        entryHour: 14,
        entryMinute: 61,
      });
    }).toThrow('O minuto do lançamento deve ser um número inteiro entre 0 e 59.');

    expect(() => {
      validateFluidBalanceEntryInput({
        periodId: '11111111-1111-1111-1111-111111111111',
        direction: 'gain',
        itemName: 'Piperacilina + Tazobactam 4.5g F/A',
        volumeMl: 100,
        entryDate: '2026-09-07',
        entryHour: 14,
      });
    }).not.toThrow();
  });

  it('calcula ganho, perda e balanço líquido a partir dos lançamentos', () => {
    const entries: FluidBalanceEntry[] = [
      { id: '1', periodId: 'p1', direction: 'gain', itemName: 'Soro', volumeMl: 100, entryDate: '2026-09-07', entryHour: 14, entryMinute: 0, recordedBy: 'u1', createdAt: '' },
      { id: '2', periodId: 'p1', direction: 'gain', itemName: 'Soro Fisiológico', volumeMl: 200, entryDate: '2026-09-07', entryHour: 18, entryMinute: 0, recordedBy: 'u1', createdAt: '' },
      { id: '3', periodId: 'p1', direction: 'loss', itemName: 'Diurese', volumeMl: 400, entryDate: '2026-09-07', entryHour: 20, entryMinute: 0, recordedBy: 'u1', createdAt: '' },
    ];

    const totals = computeFluidBalanceTotals(entries);
    expect(totals.totalGainMl).toBe(300);
    expect(totals.totalLossMl).toBe(400);
    expect(totals.netBalanceMl).toBe(-100);
  });

  it('retorna balanço zerado quando não há lançamentos', () => {
    expect(computeFluidBalanceTotals([])).toEqual({ totalGainMl: 0, totalLossMl: 0, netBalanceMl: 0 });
  });

  it('impede alterar um balanço já fechado e impede reabri-lo', () => {
    expect(() => {
      validateFluidBalanceStatusTransition('closed', 'partially_closed');
    }).toThrow('Este balanço hídrico já está fechado e não pode ser alterado.');

    expect(() => {
      validateFluidBalanceStatusTransition('partially_closed', 'open');
    }).toThrow('Não é possível reabrir um balanço hídrico já fechado (parcial ou totalmente).');

    expect(() => {
      validateFluidBalanceStatusTransition('open', 'partially_closed');
    }).not.toThrow();

    expect(() => {
      validateFluidBalanceStatusTransition('partially_closed', 'closed');
    }).not.toThrow();
  });
});
