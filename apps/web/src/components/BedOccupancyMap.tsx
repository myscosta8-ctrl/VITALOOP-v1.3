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
  const getStatusBadge = (status: BedData['status']) => {
    switch (status) {
      case 'available':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-semibold">Livre</span>;
      case 'occupied':
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-semibold">Ocupado</span>;
      case 'cleaning':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold">Higienização</span>;
      case 'reserved':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold">Reservado</span>;
      case 'blocked':
      case 'maintenance':
        return <span className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded font-semibold">Bloqueado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="text-xl font-bold text-gray-900">Mapa de Ocupação de Leitos UPA 24h</h2>
      </div>

      {sectorsMap.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border">Nenhum setor cadastrado.</div>
      ) : (
        sectorsMap.map(({ sector, beds, metrics }) => (
          <div key={sector.id} className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{sector.name}</h3>
                <p className="text-xs text-gray-500">{sector.description || `Código: ${sector.code}`}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-700">
                <span>Total: <strong>{metrics.totalBeds}</strong></span>
                <span className="text-red-600">Ocupados: <strong>{metrics.occupiedBeds}</strong></span>
                <span className="text-emerald-600">Lívres: <strong>{metrics.availableBeds}</strong></span>
                <span className="text-amber-600">Higienização: <strong>{metrics.cleaningBeds}</strong></span>
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-bold">
                  {metrics.occupancyRatePercentage}% Ocupação
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {beds.map((bed) => (
                <div
                  key={bed.id}
                  className={`p-3 rounded border flex flex-col justify-between space-y-2 transition ${
                    bed.status === 'occupied'
                      ? 'border-red-300 bg-red-50/50'
                      : bed.status === 'cleaning'
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-emerald-300 bg-emerald-50/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-gray-900">
                      {bed.bedNumber} {bed.isExtra && <span className="text-xs text-indigo-600">(Extra)</span>}
                    </span>
                    {getStatusBadge(bed.status)}
                  </div>

                  {bed.status === 'occupied' && (
                    <div className="text-xs space-y-1 text-gray-800">
                      <p className="font-semibold truncate">{bed.patientName || 'Paciente em Observação'}</p>
                      {bed.stayHours !== undefined && (
                        <p className={`font-medium ${bed.is24hLimitExceeded ? 'text-red-700 font-bold animate-pulse' : 'text-gray-600'}`}>
                          Permanência: {bed.stayHours}h {bed.is24hLimitExceeded && '⚠️ Estouro de 24h!'}
                        </p>
                      )}
                    </div>
                  )}

                  {bed.status === 'cleaning' && (
                    <p className="text-xs text-amber-800 italic">Leito aguardando conclusão da higienização...</p>
                  )}

                  <div className="pt-2 border-t flex flex-wrap gap-1 justify-end text-xs">
                    {bed.status === 'available' && onSelectBed && (
                      <button
                        type="button"
                        onClick={() => onSelectBed(bed)}
                        className="px-2 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                      >
                        Alocar
                      </button>
                    )}

                    {bed.status === 'occupied' && (
                      <>
                        {onOpenTransferModal && (
                          <button
                            type="button"
                            onClick={() => onOpenTransferModal(bed)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
                          >
                            Transferir
                          </button>
                        )}
                        {onDischargeBed && bed.allocationId && (
                          <button
                            type="button"
                            onClick={() => onDischargeBed(bed.allocationId!)}
                            className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                          >
                            Alta Leito
                          </button>
                        )}
                      </>
                    )}

                    {bed.status === 'cleaning' && onUpdateBedStatus && (
                      <button
                        type="button"
                        onClick={() => onUpdateBedStatus(bed.id, 'available')}
                        className="px-2 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-700"
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
