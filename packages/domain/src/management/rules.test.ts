import { describe, it, expect } from 'vitest';
import {
  calculateAverageTmpHours,
  evaluateManchesterKpi,
  isOvercrowdedQueue,
  isHighBedOccupancy,
} from './rules.js';

describe('Regras de Domínio de Gestão Operacional e KPIs (MGT-001..010)', () => {
  it('calcula o tempo médio de permanência (TMP) em horas (MGT-004)', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const encounters = [
      { createdAt: twoHoursAgo, outcomeAt: now },
      { createdAt: fourHoursAgo, outcomeAt: now },
    ];

    const tmpHours = calculateAverageTmpHours(encounters);
    expect(tmpHours).toBe(3);
  });

  it('avalia KPI de tempo de espera do Protocolo de Manchester (MGT-002)', () => {
    const redKpi = evaluateManchesterKpi('red', 5);
    expect(redKpi.targetMinutes).toBe(0);
    expect(redKpi.isWithinTarget).toBe(false);

    const yellowKpi = evaluateManchesterKpi('yellow', 45);
    expect(yellowKpi.targetMinutes).toBe(60);
    expect(yellowKpi.isWithinTarget).toBe(true);
  });

  it('avalia limiares de sobrelotação de fila e leitos (MGT-003/009)', () => {
    expect(isOvercrowdedQueue(10)).toBe(false);
    expect(isOvercrowdedQueue(18)).toBe(true);

    expect(isHighBedOccupancy(75)).toBe(false);
    expect(isHighBedOccupancy(92)).toBe(true);
  });
});
