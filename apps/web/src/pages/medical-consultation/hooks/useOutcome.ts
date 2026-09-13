import { useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import {
  createOutcomesApi,
  type DeathManner,
  type EncounterOutcome,
  type EncounterSummary,
  type OutcomeType,
} from '../../../lib/outcomes-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  reload: () => Promise<void>;
  setOutcome: (o: EncounterOutcome) => void;
  setSummary: (s: EncounterSummary) => void;
}

/** Aba "Desfecho" — encerramento do atendimento e emissão do sumário de alta. */
export const useOutcome = (api: ApiClient, encounterId: string, deps: Deps) => {
  const outcomesApi = createOutcomesApi(api);
  const { reload, setOutcome, setSummary } = deps;

  const [selectedOutcomeType, setSelectedOutcomeType] = useState<OutcomeType>('medical_discharge');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [destinationUnit, setDestinationUnit] = useState('');
  const [dischargeInstructions, setDischargeInstructions] = useState('');
  const [causeMortisA, setCauseMortisA] = useState('');
  const [causeMortisB, setCauseMortisB] = useState('');
  const [causeMortisC, setCauseMortisC] = useState('');
  const [causeMortisD, setCauseMortisD] = useState('');
  const [deathManner, setDeathManner] = useState<DeathManner>('natural');
  const [declarantName, setDeclarantName] = useState('');
  const [declarantDocument, setDeclarantDocument] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await outcomesApi.createOutcome(encounterId, {
        outcomeType: selectedOutcomeType,
        notes: outcomeNotes.trim() || null,
        destinationUnit: destinationUnit.trim() || null,
        dischargeInstructions: dischargeInstructions.trim() || null,
        deathCertificateData: selectedOutcomeType === 'death'
          ? {
              causeMortisA: causeMortisA.trim(),
              causeMortisB: causeMortisB.trim() || null,
              causeMortisC: causeMortisC.trim() || null,
              causeMortisD: causeMortisD.trim() || null,
              deathManner,
              declarantName: declarantName.trim() || null,
              declarantDocument: declarantDocument.trim() || null,
            }
          : null,
      });

      setOutcome(res.outcome);
      setSummary(res.summary);
      toast.success('Desfecho assistencial registrado e atendimento encerrado com sucesso!');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar desfecho assistencial.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedOutcomeType, setSelectedOutcomeType,
    outcomeNotes, setOutcomeNotes,
    destinationUnit, setDestinationUnit,
    dischargeInstructions, setDischargeInstructions,
    causeMortisA, setCauseMortisA,
    causeMortisB, setCauseMortisB,
    causeMortisC, setCauseMortisC,
    causeMortisD, setCauseMortisD,
    deathManner, setDeathManner,
    declarantName, setDeclarantName,
    declarantDocument, setDeclarantDocument,
    submitting,
    handleCreateOutcome,
  };
};

export type OutcomeForm = ReturnType<typeof useOutcome>;
