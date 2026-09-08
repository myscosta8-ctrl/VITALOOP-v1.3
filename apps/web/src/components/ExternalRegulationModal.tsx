import React, { useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createRegulationApi } from '../lib/regulation-api.js';

interface ExternalRegulationModalProps {
  encounterId: string;
  patientId: string;
  aihRequestId?: string | undefined;
  onSuccess?: () => void;
}

export const ExternalRegulationModal: React.FC<ExternalRegulationModalProps> = ({
  encounterId,
  patientId,
  aihRequestId,
  onSuccess,
}) => {
  const { api } = useSession();
  const regulationApi = createRegulationApi(api);

  const [destinationFacility, setDestinationFacility] = useState('Hospital das Clínicas - HCFMUSP');
  const [specialty, setSpecialty] = useState('Cardiologia Intensiva');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'emergency'>('high');
  const [transportType, setTransportType] = useState<'basic_ambulance' | 'uti_mobile' | 'samu' | 'own_means'>('samu');
  const [createdRegulationId, setCreatedRegulationId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await regulationApi.createExternalRegulation({
        encounterId,
        patientId,
        aihRequestId,
        destinationFacility,
        specialty,
        priority,
        transportType,
        documents: [
          { documentType: 'clinical_report', notes: 'Relatório médico de transferência anexado' },
          { documentType: 'aih_form', notes: 'Espelho de laudo AIH pré-validado' },
        ],
      });
      setCreatedRegulationId(res.id);
      setMsg(`Solicitação de regulação externa enviada com sucesso! ID: ${res.id}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!createdRegulationId) return;
    try {
      await regulationApi.updateRegulationStatus(createdRegulationId, 'transferred');
      if (aihRequestId) {
        await regulationApi.closeAihRequest(aihRequestId);
      }
      setMsg('Transferência hospitalar confirmada e lote de AIH encerrado com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="regulation-modal">
      <h3>Regulação Médica e Transferência Inter-Hospitalar (SUS-007..010)</h3>
      {msg && <p data-testid="regulation-msg">{msg}</p>}

      <form onSubmit={handleSubmit} data-testid="regulation-form">
        <label>
          Hospital / Estabelecimento de Destino:
          <input
            value={destinationFacility}
            onChange={(e) => setDestinationFacility(e.target.value)}
            data-testid="destination-input"
          />
        </label>

        <label>
          Especialidade Requerida:
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            data-testid="specialty-input"
          />
        </label>

        <label>
          Prioridade:
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'emergency')}
            data-testid="priority-select"
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="emergency">Emergência</option>
          </select>
        </label>

        <label>
          Meio de Transporte:
          <select
            value={transportType}
            onChange={(e) => setTransportType(e.target.value as 'basic_ambulance' | 'uti_mobile' | 'samu' | 'own_means')}
            data-testid="transport-select"
          >
            <option value="basic_ambulance">Ambulância Básica</option>
            <option value="uti_mobile">UTI Móvel</option>
            <option value="samu">SAMU 192</option>
            <option value="own_means">Meios Próprios</option>
          </select>
        </label>

        <button type="submit" data-testid="submit-regulation-btn">
          Solicitar Vaga Externa
        </button>
      </form>

      {createdRegulationId && (
        <button type="button" onClick={handleConfirmTransfer} data-testid="confirm-transfer-btn">
          Confirmar Saída / Transferência Realizada (SUS-008, SUS-010)
        </button>
      )}
    </div>
  );
};
