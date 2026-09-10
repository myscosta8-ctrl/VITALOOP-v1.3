import React from 'react';
import { MedicationScheduleData } from '../lib/nursing-api';

interface MedicationScheduleGridProps {
  schedules: MedicationScheduleData[];
  onSelectScheduleForAdmin: (schedule: MedicationScheduleData) => void;
  onSchedulePrescription?: () => void;
  disabled?: boolean;
}

export const MedicationScheduleGrid: React.FC<MedicationScheduleGridProps> = ({
  schedules,
  onSelectScheduleForAdmin,
  onSchedulePrescription,
  disabled = false,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'administered':
        return <span className="vl-badge vl-badge-success">Administrado</span>;
      case 'refused':
        return <span className="vl-badge vl-badge-warning">Recusado</span>;
      case 'not_administered':
        return <span className="vl-badge vl-badge-danger">Não Administrado</span>;
      case 'suspended':
        return <span className="vl-badge vl-badge-neutral">Suspenso</span>;
      default:
        return <span className="vl-badge vl-badge-info">Pendente</span>;
    }
  };

  return (
    <div className="vl-panel">
      <div className="vl-panel-head">
        <h3>Grade de Aprazamento e Checagem Beira-Leito (MEDC-009..011)</h3>
        {onSchedulePrescription && (
          <button type="button" className="vl-btn vl-btn-sm" onClick={onSchedulePrescription} disabled={disabled}>
            Aprazar Prescrição Ativa
          </button>
        )}
      </div>

      <div className="vl-panel-body">
        {schedules.length === 0 ? (
          <p role="status">Nenhum horário aprazado para este atendimento. Clique em "Aprazar Prescrição Ativa".</p>
        ) : (
          <div className="vl-schedule-grid">
            {schedules.map((s) => (
              <div key={s.id} className="vl-schedule-card">
                <div className="vl-schedule-card-head">
                  <div>
                    <h4>{s.medicationName}</h4>
                    <p className="vl-text-muted">
                      Dose: {s.dose} {s.doseUnit} | Via: {s.route} | Freq: {s.frequency}
                    </p>
                  </div>
                  {getStatusBadge(s.status)}
                </div>

                <div className="vl-schedule-card-foot">
                  <span>Horário: <strong>{new Date(s.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  {s.status === 'pending' && (
                    <button
                      type="button"
                      className="vl-btn vl-btn-sm vl-btn-success"
                      onClick={() => onSelectScheduleForAdmin(s)}
                      disabled={disabled}
                    >
                      Checar &amp; Administrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
