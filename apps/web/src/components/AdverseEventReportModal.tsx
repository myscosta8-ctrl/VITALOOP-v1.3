import React, { useState } from 'react';
import { reportAdverseEvent, prescribeIsolation } from '../lib/safety-api.js';

interface AdverseEventReportModalProps {
  encounterId?: string;
  patientId?: string;
  onSuccess?: () => void;
}

export const AdverseEventReportModal: React.FC<AdverseEventReportModalProps> = ({ encounterId, patientId, onSuccess }) => {
  const [eventCategory, setEventCategory] = useState('medicação');
  const [severity, setSeverity] = useState<'near_miss' | 'no_harm' | 'mild' | 'moderate' | 'severe' | 'death'>('mild');
  const [description, setDescription] = useState('Troca involuntária de dose durante a administração por erro de rotulagem.');
  const [immediateAction, setImmediateAction] = useState('Suspenso fármaco e notificado médico plantonista.');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [msg, setMsg] = useState('');

  const [isolationType, setIsolationType] = useState<'contact' | 'droplet' | 'airborne' | 'protective'>('contact');
  const [isolationReason, setIsolationReason] = useState('Paciente com suspeita de germe multirresistente (KPC).');

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await reportAdverseEvent({
        encounterId,
        patientId,
        eventCategory,
        severity,
        description,
        immediateAction,
        isAnonymous,
      });
      setMsg(`Notificação do NSP registrada com sucesso! ID: ${res.data.id}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handlePrescribeIsolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encounterId) return;
    try {
      const res = await prescribeIsolation(encounterId, {
        isolationType,
        reason: isolationReason,
      });
      setMsg(`Isolamento de precaução ativado! Tipo: ${res.data.isolationType}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="adverse-event-modal">
      <h3>Núcleo de Segurança do Paciente (NSP / ANVISA RDC 36)</h3>
      {msg && <p data-testid="safety-msg">{msg}</p>}

      <form onSubmit={handleReport} data-testid="report-event-form">
        <h4>Notificação de Evento Adverso / Near Miss (SAF-001/006)</h4>
        <label>
          Categoria:
          <select value={eventCategory} onChange={(e) => setEventCategory(e.target.value)}>
            <option value="medicação">Medicamento / RAM (SAF-006)</option>
            <option value="queda">Queda do Paciente (SAF-002)</option>
            <option value="lpp">Lesão por Pressão LPP (SAF-003)</option>
            <option value="identificação">Erro de Identificação (SAF-004)</option>
            <option value="infecção">Infecção Assistencial IRAS (SAF-009)</option>
          </select>
        </label>

        <label>
          Severidade:
          <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
            <option value="near_miss">Quase Falha (Near Miss)</option>
            <option value="no_harm">Sem Dano</option>
            <option value="mild">Dano Leve</option>
            <option value="moderate">Dano Moderado</option>
            <option value="severe">Dano Grave</option>
            <option value="death">Óbito</option>
          </select>
        </label>

        <label>
          Descrição Detalhada do Evento:
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          Ação Imediata Tomada:
          <input value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} />
        </label>

        <label>
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Notificação Anônima
        </label>

        <button type="submit" data-testid="report-btn">Enviar Notificação NSP</button>
      </form>

      {encounterId && (
        <form onSubmit={handlePrescribeIsolation} data-testid="isolation-form">
          <h4>Prescrição de Isolamento Assistencial (SAF-007/008)</h4>
          <label>
            Tipo de Precaução:
            <select value={isolationType} onChange={(e) => setIsolationType(e.target.value as typeof isolationType)}>
              <option value="contact">Precaução de Contato</option>
              <option value="droplet">Precaução de Gotículas</option>
              <option value="airborne">Precaução de Aerossóis (N95)</option>
              <option value="protective">Isolamento Protetor / Neutropênico</option>
            </select>
          </label>

          <label>
            Justificativa Clínica:
            <input value={isolationReason} onChange={(e) => setIsolationReason(e.target.value)} />
          </label>

          <button type="submit" data-testid="isolation-btn">Ativar Precaução/Isolamento</button>
        </form>
      )}
    </div>
  );
};
