import React from 'react';
import type { BedData } from '../../../lib/bed-api.js';

interface Props {
  bedInfo: BedData | null;
}

export const InternacaoTab: React.FC<Props> = ({ bedInfo }) => (
  <div style={{ marginTop: 20 }}>
    <h4 style={{ color: '#0f172a' }}>Internação (Leito UPA)</h4>
    {bedInfo ? (
      <div style={{ padding: 15, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1' }}>
        <p><strong>Setor:</strong> {bedInfo.sectorName ?? '—'}</p>
        <p><strong>Leito:</strong> {bedInfo.bedNumber} {bedInfo.isIsolation && '(Isolamento)'}</p>
        {bedInfo.allocatedAt && (
          <p><strong>Alocado em:</strong> {new Date(bedInfo.allocatedAt).toLocaleString('pt-BR')}</p>
        )}
        {bedInfo.stayHours !== undefined && (
          <p>
            <strong>Permanência:</strong> {bedInfo.stayHours}h{' '}
            {bedInfo.is24hLimitExceeded && '⚠️ Estouro de 24h!'}
          </p>
        )}
        <a href="#/leitos" className="vl-btn vl-btn-ghost vl-btn-sm">
          Ver Mapa de Leitos
        </a>
      </div>
    ) : (
      <p style={{ color: '#64748b' }}>
        Nenhum leito alocado para este atendimento. A internação é opcional — só ocorre quando o
        médico decide manter o paciente em observação/leito UPA (ver leito em{' '}
        <a href="#/leitos">Prontuário de Internação</a>).
      </p>
    )}
  </div>
);
