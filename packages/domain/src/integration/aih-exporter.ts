import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface AihExportItem {
  id: string;
  mainProcedureCode: string;
  mainCid10: string;
  status: string;
  closedAt?: string | null | undefined;
  hospitalValue?: number | undefined;
}

export interface AihBatchExportResult {
  batchNumber: string;
  totalItems: number;
  totalValue: number;
  aihIds: string[];
}

export function validateAndBuildAihBatch(aihList: AihExportItem[]): AihBatchExportResult {
  if (!aihList || aihList.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'NO_AIH_FOR_EXPORT',
      message: 'Nenhum laudo de AIH fornecido para geração do lote de exportação.',
    });
  }

  const eligibleIds: string[] = [];
  let totalValue = 0;

  for (const aih of aihList) {
    if (!aih.closedAt) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'AIH_NOT_CLOSED',
        message: `Laudo de AIH ${aih.id} não possui fechamento final validado (closed_at pendente).`,
      });
    }
    eligibleIds.push(aih.id);
    totalValue += aih.hospitalValue || 650.0;
  }

  const batchNumber = `LOTE-AIH-${Date.now()}`;

  return {
    batchNumber,
    totalItems: eligibleIds.length,
    totalValue,
    aihIds: eligibleIds,
  };
}
