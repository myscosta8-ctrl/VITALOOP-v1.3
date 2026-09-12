import { useState } from 'react';
import { ApiError, type ApiClient } from '../../../lib/api-client.js';
import {
  createPrescriptionsApi,
  type MedicationItem,
  type PrescriptionItemPayload,
  type RouteOfAdministration,
} from '../../../lib/prescriptions-api.js';
import { toast } from '../../../lib/toast.js';

interface Deps {
  reload: () => Promise<void>;
}

/** Aba "Prescrições" — montagem de itens, emissão e cancelamento de prescrição. */
export const usePrescriptions = (api: ApiClient, encounterId: string, deps: Deps) => {
  const prescriptionsApi = createPrescriptionsApi(api);
  const { reload } = deps;

  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemPayload[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<MedicationItem | null>(null);
  const [itemDose, setItemDose] = useState<number>(1);
  const [itemDoseUnit, setItemDoseUnit] = useState<string>('comprimido');
  const [itemRoute, setItemRoute] = useState<RouteOfAdministration>('VO');
  const [itemFrequency, setItemFrequency] = useState<string>('6/6h');
  const [itemDuration, setItemDuration] = useState<string>('5 dias');
  const [itemInstructions, setItemInstructions] = useState<string>('');

  const [overrideJustification, setOverrideJustification] = useState<string>('');
  const [showAllergyModal, setShowAllergyModal] = useState<boolean>(false);
  const [allergyModalMessage, setAllergyModalMessage] = useState<string>('');

  const [cancelingPrescId, setCancelingPrescId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddItemToPrescription = () => {
    if (!selectedMedication) { toast.error('Selecione um medicamento no catálogo.'); return; }
    if (itemDose <= 0) { toast.error('A dose deve ser maior que zero.'); return; }

    const newItem: PrescriptionItemPayload = {
      medicationId: selectedMedication.id,
      medicationName: selectedMedication.name,
      activeSubstance: selectedMedication.activeSubstance,
      dose: itemDose,
      doseUnit: itemDoseUnit.trim(),
      route: itemRoute,
      frequency: itemFrequency.trim(),
      duration: itemDuration.trim() || null,
      instructions: itemInstructions.trim() || null,
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setSelectedMedication(null);
    setItemInstructions('');
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionItems.length === 0) { toast.error('Adicione pelo menos um medicamento à prescrição.'); return; }

    setSubmitting(true);

    try {
      await prescriptionsApi.createPrescription(encounterId, {
        items: prescriptionItems,
        overrideJustification: overrideJustification.trim() || null,
      });

      setPrescriptionItems([]);
      setOverrideJustification('');
      setShowAllergyModal(false);
      toast.success('Prescrição médica gerada e ativada com sucesso!');
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALLERGY_ALERT_REQUIRES_JUSTIFICATION') {
        setAllergyModalMessage(err.message);
        setShowAllergyModal(true);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao registrar prescrição médica.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    if (!cancelReason.trim()) { toast.error('O motivo do cancelamento é obrigatório.'); return; }

    setSubmitting(true);
    try {
      await prescriptionsApi.cancelPrescription(encounterId, prescriptionId, {
        cancelReason: cancelReason.trim(),
      });

      setCancelingPrescId(null);
      setCancelReason('');
      toast.success('Prescrição médica cancelada com sucesso.');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao cancelar prescrição médica.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    prescriptionItems,
    selectedMedication, setSelectedMedication,
    itemDose, setItemDose,
    itemDoseUnit, setItemDoseUnit,
    itemRoute, setItemRoute,
    itemFrequency, setItemFrequency,
    itemDuration, setItemDuration,
    itemInstructions, setItemInstructions,
    overrideJustification, setOverrideJustification,
    showAllergyModal,
    allergyModalMessage,
    cancelingPrescId, setCancelingPrescId,
    cancelReason, setCancelReason,
    submitting,
    handleAddItemToPrescription,
    handleRemovePrescriptionItem,
    handleCreatePrescription,
    handleCancelPrescription,
  };
};

export type PrescriptionsForm = ReturnType<typeof usePrescriptions>;
