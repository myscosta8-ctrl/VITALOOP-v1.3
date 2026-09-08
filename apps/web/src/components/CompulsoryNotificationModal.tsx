import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createNotificationApi, type NotifiableDisease } from '../lib/notification-api.js';
import type { ClinicalFormSchema } from '../lib/clinical-form-types.js';
import { DynamicClinicalForm } from './DynamicClinicalForm.js';

interface CompulsoryNotificationModalProps {
  encounterId: string;
  patientId: string;
  onSuccess?: () => void;
}

export const CompulsoryNotificationModal: React.FC<CompulsoryNotificationModalProps> = ({
  encounterId,
  patientId,
  onSuccess,
}) => {
  const { api } = useSession();
  const notificationApi = createNotificationApi(api);

  const [diseases, setDiseases] = useState<readonly NotifiableDisease[]>([]);
  const [diseaseId, setDiseaseId] = useState('');
  const [symptomOnsetDate, setSymptomOnsetDate] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [msg, setMsg] = useState('');

  const [bodySchema, setBodySchema] = useState<ClinicalFormSchema | null>(null);
  const [bodyFields, setBodyFields] = useState<Record<string, string>>({});

  useEffect(() => {
    notificationApi
      .listDiseases()
      .then((data) => {
        setDiseases(data);
        if (data.length > 0) setDiseaseId(data[0]!.id);
      })
      .catch((err: unknown) => setMsg((err as Error).message));
  }, [api]);

  // Ao trocar de agravo, busca o schema de campos clínicos dessa doença
  // (pode não existir ainda — a maioria das fichas não tem schema mapeado,
  // e a tela mostra só o campo de observação livre nesse caso) e reseta os
  // valores preenchidos, já que os campos mudam de uma doença pra outra.
  useEffect(() => {
    if (!diseaseId) return;
    const disease = diseases.find((d) => d.id === diseaseId);
    if (!disease) return;

    // Guarda contra corrida: se o usuário trocar de agravo de novo antes
    // desta busca terminar, `cancelled` vira true e a resposta atrasada
    // (de um agravo que não é mais o selecionado) é descartada em vez de
    // sobrescrever o schema/formulário que já está certo pro agravo atual.
    let cancelled = false;
    setBodyFields({});
    notificationApi
      .getBodySchema(disease.code)
      .then((schema) => {
        if (!cancelled) setBodySchema(schema);
      })
      .catch(() => {
        if (!cancelled) setBodySchema(null);
      });
    return () => {
      cancelled = true;
    };
  }, [diseaseId, diseases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseId) return;
    try {
      await notificationApi.createNotification({
        diseaseId,
        patientId,
        encounterId,
        symptomOnsetDate: symptomOnsetDate || null,
        clinicalNotes: clinicalNotes || null,
        bodyFields: bodySchema ? bodyFields : null,
      });
      setMsg('Notificação de agravo compulsório registrada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="compulsory-notification-modal">
      <h3>Notificação Compulsória de Agravo</h3>
      <p>Registro interno da unidade — não substitui, por enquanto, o envio ao SINAN.</p>
      {msg && <p data-testid="notification-status-msg">{msg}</p>}

      <form onSubmit={handleSubmit} data-testid="notification-form">
        <label>
          Agravo:
          <select value={diseaseId} onChange={(e) => setDiseaseId(e.target.value)} data-testid="disease-select">
            {diseases.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        <label>
          Data de início dos sintomas (opcional):
          <input
            type="date"
            value={symptomOnsetDate}
            onChange={(e) => setSymptomOnsetDate(e.target.value)}
            data-testid="symptom-onset-input"
          />
        </label>

        {bodySchema && (
          <DynamicClinicalForm schema={bodySchema} values={bodyFields} onChange={setBodyFields} />
        )}

        <label>
          Observações clínicas (opcional):
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            data-testid="clinical-notes-input"
          />
        </label>

        <button type="submit" data-testid="submit-notification-btn">
          Registrar Notificação
        </button>
      </form>
    </div>
  );
};
