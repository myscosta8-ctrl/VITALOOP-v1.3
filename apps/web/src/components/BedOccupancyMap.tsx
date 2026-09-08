import React from 'react';
import { SectorMapData, BedData } from '../lib/bed-api';

interface BedOccupancyMapProps {
  sectorsMap: SectorMapData[];
  onSelectBed?: (bed: BedData) => void;
  onUpdateBedStatus?: (bedId: string, status: BedData['status']) => void;
  onOpenTransferModal?: (bed: BedData) => void;
  onDischargeBed?: (allocationId: string) => void;
}

export const BedOccupancyMap: React.FC<BedOccupancyMapProps> = ({
  sectorsMap,
  onSelectBed,
  onUpdateBedStatus,
  onOpenTransferModal,
  onDischargeBed,
}) => {
  const minutesUntil = (isoDate: string): number =>
    Math.max(0, Math.round((new Date(isoDate).getTime() - Date.now()) / 60000));

  const getStatusBadge = (status: BedData['status']) => {
    switch (status) {
      case 'available':
        return <span className="vl-badge vl-badge-success">Livre</span>;
      case 'occupied':
        return <span className="vl-badge vl-badge-danger">Ocupado</span>;
      case 'cleaning':
        return <span className="vl-badge vl-badge-warning">Higienização</span>;
      case 'reserved':
        return <span className="vl-badge vl-badge-info">Reservado</span>;
      case 'blocked':
      case 'maintenance':
        return <span className="vl-badge vl-badge-neutral">Bloqueado</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h2>Mapa de Ocupação de Leitos UPA 24h</h2>

      {sectorsMap.length === 0 ? (
        <p role="status">Nenhum setor cadastrado.</p>
      ) : (
        sectorsMap.map(({ sector, beds, metrics }) => (
          <div key={sector.id} className="vl-panel">
            <div className="vl-panel-head">
              <div>
                <h3>{sector.name}</h3>
                <p style={{ margin: 0 }}>{sector.description || `Código: ${sector.code}`}</p>
              </div>
              <div className="vl-sector-stats">
                <span>Total: <strong>{metrics.totalBeds}</strong></span>
                <span>Ocupados: <strong>{metrics.occupiedBeds}</strong></span>
                <span>Livres: <strong>{metrics.availableBeds}</strong></span>
                <span>Higienização: <strong>{metrics.cleaningBeds}</strong></span>
                <span className="rate">{metrics.occupancyRatePercentage}% Ocupação</span>
              </div>
            </div>

            <div className="vl-bed-grid">
              {beds.map((bed) => (
                <div key={bed.id} className={`vl-bed-card ${bed.status}`}>
                  <div className="vl-bed-card-head">
                    <span className="vl-bed-number">
                      {bed.bedNumber} {bed.isExtra && <span>(Extra)</span>}
                    </span>
                    {getStatusBadge(bed.status)}
                  </div>

                  {bed.isIsolation && <span className="vl-badge vl-badge-info">Isolamento</span>}

                  {bed.isExtra && bed.status === 'available' && bed.expiresAt && (
                    <p className="vl-bed-patient">Expira em {minutesUntil(bed.expiresAt)} min se não for utilizado</p>
                  )}

                  {bed.status === 'occupied' && (
                    <div className="vl-bed-patient">
                      <p>{bed.patientName || 'Paciente em Observação'}</p>
                      {bed.stayHours !== undefined && (
                        <p className={bed.is24hLimitExceeded ? 'stay-exceeded' : undefined}>
                          Permanência: {bed.stayHours}h {bed.is24hLimitExceeded && '⚠️ Estouro de 24h!'}
                        </p>
                      )}
                    </div>
                  )}

                  {bed.status === 'cleaning' && (
                    <p className="vl-bed-patient">Leito aguardando conclusão da higienização...</p>
                  )}

                  <div className="vl-bed-card-actions">
                    {bed.status === 'available' && onSelectBed && (
                      <button type="button" className="vl-btn-sm vl-btn-success" onClick={() => onSelectBed(bed)}>
                        Alocar
                      </button>
                    )}

                    {bed.status === 'occupied' && (
                      <>
                        {onOpenTransferModal && (
                          <button type="button" className="vl-btn-sm" onClick={() => onOpenTransferModal(bed)}>
                            Transferir
                          </button>
                        )}
                        {onDischargeBed && bed.allocationId && (
                          <button
                            type="button"
                            className="vl-btn-sm vl-btn-danger"
                            onClick={() => onDischargeBed(bed.allocationId!)}
                          >
                            Alta Leito
                          </button>
                        )}
                      </>
                    )}

                    {bed.status === 'cleaning' && onUpdateBedStatus && (
                      <button
                        type="button"
                        className="vl-btn-sm vl-btn-warning"
                        onClick={() => onUpdateBedStatus(bed.id, 'available')}
                      >
                        Concluir Higienização
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
