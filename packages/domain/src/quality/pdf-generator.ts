import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface ClinicalPdfDocumentInput {
  documentId: string;
  documentType: string;
  patientName: string;
  patientCpf?: string | null | undefined;
  issuerName: string;
  content: string;
}

export interface ClinicalPdfDocumentOutput {
  pdfHeader: string;
  documentId: string;
  formattedText: string;
  footerChecksum: string;
  generatedAt: string;
}

export function generateClinicalPrintPdf(doc: ClinicalPdfDocumentInput): ClinicalPdfDocumentOutput {
  if (!doc || !doc.documentId || !doc.patientName || !doc.content) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_PDF_INPUT',
      message: 'Dados incompletos para geração de documento PDF assistencial.',
    });
  }

  const generatedAt = new Date().toISOString();
  const pdfHeader = `%PDF-1.7 %VITALOOP-ASSISTENCIAL-${doc.documentType.toUpperCase()}`;
  const formattedText = `=====================================================\n` +
    `VITALOOP UPA 24H - IMPRESSÃO OFICIAL DE DOCUMENTO CLINICO\n` +
    `Documento: ${doc.documentType.toUpperCase()} | ID: ${doc.documentId}\n` +
    `Paciente: ${doc.patientName}\n` +
    `Emissor: ${doc.issuerName}\n` +
    `Data: ${generatedAt}\n` +
    `-----------------------------------------------------\n` +
    `CONTEÚDO:\n${doc.content}\n` +
    `=====================================================`;

  // Calcular checksum de integridade do footer
  let checksum = 0;
  for (let i = 0; i < formattedText.length; i++) {
    checksum = (checksum << 5) - checksum + formattedText.charCodeAt(i);
    checksum |= 0;
  }
  const footerChecksum = `CHK-PDF-${Math.abs(checksum).toString(16)}`;

  return {
    pdfHeader,
    documentId: doc.documentId,
    formattedText,
    footerChecksum,
    generatedAt,
  };
}
