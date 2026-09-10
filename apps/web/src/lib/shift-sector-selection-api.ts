import type { ApiClient } from './api-client.js';

export type ShiftArea = 'pronto_atendimento' | 'internacao';

export interface ShiftSectorSelection {
  readonly area: ShiftArea;
  readonly bedSectorId: string | null;
  readonly selectedAt: string;
  readonly expiresAt: string;
}

export interface SelectShiftSectorInput {
  area: ShiftArea;
  bedSectorId?: string | null;
}

export const createShiftSectorSelectionApi = (api: ApiClient) => ({
  getCurrentSelection: (): Promise<ShiftSectorSelection | null> =>
    api.get<ShiftSectorSelection | null>('/api/v1/shift-sector-selection/me'),

  selectSector: (input: SelectShiftSectorInput): Promise<ShiftSectorSelection> =>
    api.post<ShiftSectorSelection>('/api/v1/shift-sector-selection', input),
});

export type ShiftSectorSelectionApi = ReturnType<typeof createShiftSectorSelectionApi>;
