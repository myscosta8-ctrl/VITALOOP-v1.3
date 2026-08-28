import type { ManchesterWaitTimeKpi } from './types.js';

export function calculateAverageTmpHours(encounters: Array<{ createdAt: Date; outcomeAt?: Date | null }>): number {
  if (encounters.length === 0) return 0;

  const totalHours = encounters.reduce((acc, enc) => {
    const end = enc.outcomeAt ? enc.outcomeAt.getTime() : Date.now();
    const durationMs = end - enc.createdAt.getTime();
    return acc + Math.max(0, durationMs / (1000 * 60 * 60));
  }, 0);

  return Math.round((totalHours / encounters.length) * 10) / 10;
}

export function evaluateManchesterKpi(
  riskCategory: 'red' | 'orange' | 'yellow' | 'green' | 'blue',
  averageWaitMinutes: number,
): ManchesterWaitTimeKpi {
  const targetMap: Record<string, number> = {
    red: 0,
    orange: 10,
    yellow: 60,
    green: 120,
    blue: 240,
  };

  const targetMinutes = targetMap[riskCategory] ?? 240;
  const isWithinTarget = averageWaitMinutes <= targetMinutes;

  return {
    riskCategory,
    targetMinutes,
    averageWaitMinutes: Math.round(averageWaitMinutes),
    isWithinTarget,
  };
}

export function isOvercrowdedQueue(consultationPendingCount: number, threshold = 15): boolean {
  return consultationPendingCount >= threshold;
}

export function isHighBedOccupancy(occupancyRate: number, threshold = 85): boolean {
  return occupancyRate >= threshold;
}
