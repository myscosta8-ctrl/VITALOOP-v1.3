import { useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import {
  createDiagnosesApi,
  type CidItem,
  type DiagnosisStatus,
  type DiagnosisType,
} from '../../../lib/diagnoses-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  reload: () => Promise<void>;
}

/** Aba "Diagnósticos" — vínculo de CID-10 ao atendimento e mudança de status. */
export const useDiagnoses = (api: ApiClient, encounterId: string, deps: Deps) => {
  const diagnosesApi = createDiagnosesApi(api);
  const { reload } = deps;

  const [selectedCid, setSelectedCid] = useState<CidItem | null>(null);
  const [diagType, setDiagType] = useState<DiagnosisType>('principal');
  const [diagNotes, setDiagNotes] = useState('');
  const [refutingDiagId, setRefutingDiagId] = useState<string | null>(null);
  const [refutationNotes, setRefutationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCid) { toast.error('Selecione um código CID-10 no catálogo.'); return; }

    setSubmitting(true);
    try {
      await diagnosesApi.createDiagnosis(encounterId, {
        cidCode: selectedCid.code,
        diagnosisType: diagType,
        notes: diagNotes.trim() || null,
      });

      setSelectedCid(null);
      setDiagNotes('');
      toast.success(`Diagnóstico CID-10 [${selectedCid.code}] adicionado com sucesso!`);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao adicionar diagnóstico.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDiagnosisStatus = async (diagnosisId: string, status: DiagnosisStatus) => {
    if (status === 'refuted' && !refutationNotes.trim()) {
      toast.error('A justificativa é obrigatória para refutar um diagnóstico.');
      return;
    }

    setSubmitting(true);
    try {
      await diagnosesApi.updateDiagnosisStatus(encounterId, diagnosisId, {
        status,
        notes: status === 'refuted' ? refutationNotes.trim() : null,
      });

      setRefutingDiagId(null);
      setRefutationNotes('');
      toast.success('Situação do diagnóstico atualizada com sucesso!');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao atualizar situação do diagnóstico.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    selectedCid, setSelectedCid,
    diagType, setDiagType,
    diagNotes, setDiagNotes,
    refutingDiagId, setRefutingDiagId,
    refutationNotes, setRefutationNotes,
    submitting,
    handleAddDiagnosis,
    handleUpdateDiagnosisStatus,
  };
};

export type DiagnosesForm = ReturnType<typeof useDiagnoses>;
