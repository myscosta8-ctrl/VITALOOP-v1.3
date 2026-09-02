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
    <div className="bg-white p-4 rounded border border-gray-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-bold text-gray-900">Grade de Aprazamento e Checagem Beira-Leito (MEDC-009..011)</h3>
        {onSchedulePrescription && (
          <button
            type="button"
            onClick={onSchedulePrescription}
            disabled={disabled}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            Aprazar Prescrição Ativa
          </button>
        )}
      </div>

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Nenhum horário aprazado para este atendimento. Clique em "Aprazar Prescrição Ativa".</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {schedules.map((s) => (
            <div key={s.id} className="p-3 border rounded bg-gray-50 flex flex-col justify-between space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{s.medicationName}</h4>
                  <p className="text-xs text-gray-600">
                    Dose: {s.dose} {s.doseUnit} | Via: {s.route} | Freq: {s.frequency}
                  </p>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <div className="flex justify-between items-center pt-2 border-t text-xs text-gray-500">
                <span>Horário: <strong>{new Date(s.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                {s.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onSelectScheduleForAdmin(s)}
                    disabled={disabled}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Checar & Administrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
