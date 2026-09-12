import React from 'react';
import { SectorMapData, BedData } from '../lib/bed-api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { EmptyState } from './ui/empty-state.js';

interface BedOccupancyMapProps {
  sectorsMap: SectorMapData[];
  onSelectBed?: (bed: BedData) => void;
  onUpdateBedStatus?: (bedId: string, status: BedData['status']) => void;
  onOpenTransferModal?: (bed: BedData) => void;
  onDischargeBed?: (allocationId: string) => void;
}

const STATUS_BG: Record<BedData['status'], string> = {
  available: 'var(--color-success-soft)',
  occupied: 'var(--color-danger-soft)',
  cleaning: 'var(--color-warning-soft)',
  reserved: 'var(--color-primary-soft)',
  blocked: 'var(--color-surface-sunken)',
  maintenance: 'var(--color-surface-sunken)',
};

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
        return <Badge variant="success">Livre</Badge>;
      case 'occupied':
        return <Badge variant="destructive">Ocupado</Badge>;
      case 'cleaning':
        return <Badge variant="warning">Higienização</Badge>;
      case 'reserved':
        return <Badge>Reservado</Badge>;
      case 'blocked':
      case 'maintenance':
        return <Badge variant="outline">Bloqueado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Ocupação de leitos por setor — UPA 24h</h2>

      {sectorsMap.length === 0 ? (
        <EmptyState title="Nenhum setor cadastrado" description="Cadastre setores em Configurações de leitos para começar a alocar pacientes." />
      ) : (
        sectorsMap.map(({ sector, beds, metrics }) => (
          <Card key={sector.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{sector.name}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">{sector.description || `Código: ${sector.code}`}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                <span>Total: <strong className="font-mono text-foreground">{metrics.totalBeds}</strong></span>
                <span>Ocupados: <strong className="font-mono text-foreground">{metrics.occupiedBeds}</strong></span>
                <span>Livres: <strong className="font-mono text-foreground">{metrics.availableBeds}</strong></span>
                <span>Higienização: <strong className="font-mono text-foreground">{metrics.cleaningBeds}</strong></span>
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-mono font-bold text-primary">
                  {metrics.occupancyRatePercentage}% Ocupação
                </span>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {beds.map((bed) => (
                  <div
                    key={bed.id}
                    className="flex flex-col gap-2 rounded-md border border-border p-3"
                    style={{ backgroundColor: STATUS_BG[bed.status] }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold">
                        {bed.bedNumber} {bed.isExtra && <span className="font-normal">(Extra)</span>}
                      </span>
                      {getStatusBadge(bed.status)}
                    </div>

                    {bed.isIsolation && <Badge>Isolamento</Badge>}

                    {bed.isExtra && bed.status === 'available' && bed.expiresAt && (
                      <p className="text-xs text-muted-foreground">Expira em {minutesUntil(bed.expiresAt)} min se não for utilizado</p>
                    )}

                    {bed.status === 'occupied' && (
                      <div className="text-xs">
                        <p className="m-0">{bed.patientName || 'Paciente em Observação'}</p>
                        {bed.stayHours !== undefined && (
                          <p className={`m-0 ${bed.is24hLimitExceeded ? 'font-bold text-destructive' : ''}`}>
                            Permanência: {bed.stayHours}h {bed.is24hLimitExceeded && '⚠️ Estouro de 24h!'}
                          </p>
                        )}
                        {bed.encounterId && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Button asChild variant="ghost" size="sm">
                              <a href={`#/atendimentos/${bed.encounterId}/consulta`}>Ficha clínica</a>
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <a href={`#/atendimentos/${bed.encounterId}/enfermagem`}>Enfermagem</a>
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <a href={`#/atendimentos/${bed.encounterId}/acoes`}>Solicitações</a>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {bed.status === 'cleaning' && (
                      <p className="text-xs text-muted-foreground">Leito aguardando conclusão da higienização...</p>
                    )}

                    <div className="mt-auto flex flex-wrap justify-end gap-1.5 border-t border-border pt-2">
                      {bed.status === 'available' && onSelectBed && (
                        <Button size="sm" onClick={() => onSelectBed(bed)}>
                          Alocar
                        </Button>
                      )}

                      {bed.status === 'occupied' && (
                        <>
                          {onOpenTransferModal && (
                            <Button size="sm" variant="secondary" onClick={() => onOpenTransferModal(bed)}>
                              Transferir
                            </Button>
                          )}
                          {onDischargeBed && bed.allocationId && (
                            <Button size="sm" variant="destructive" onClick={() => onDischargeBed(bed.allocationId!)}>
                              Alta Leito
                            </Button>
                          )}
                        </>
                      )}

                      {bed.status === 'cleaning' && onUpdateBedStatus && (
                        <Button size="sm" onClick={() => onUpdateBedStatus(bed.id, 'available')}>
                          Concluir Higienização
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
