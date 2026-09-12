import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createBedApi,
  type BedData,
} from '../lib/bed-api.js';
import { createEncountersApi } from '../lib/encounters-api.js';
import { BedOccupancyMap } from '../components/BedOccupancyMap.js';
import { BedTransferModal } from '../components/BedTransferModal.js';
import { BedAllocationModal } from '../components/BedAllocationModal.js';
import { toast } from '../lib/toast.js';

const errMsg = (err: unknown, fallback: string): string => (err instanceof ApiError ? err.message : fallback);

export const BedMapPage: React.FC = () => {
  const { api } = useSession();
  const bedApi = createBedApi(api);
  const encountersApi = createEncountersApi(api);
  const queryClient = useQueryClient();

  const [transferBed, setTransferBed] = useState<BedData | null>(null);
  const [allocationBed, setAllocationBed] = useState<BedData | null>(null);

  const mapQuery = useQuery({ queryKey: ['beds-map'], queryFn: () => bedApi.getBedsMap() });
  const sectorsQuery = useQuery({ queryKey: ['bed-sectors'], queryFn: () => bedApi.getSectors() });
  const encountersQuery = useQuery({ queryKey: ['encounters'], queryFn: () => encountersApi.listEncounters() });

  const sectorsMap = mapQuery.data ?? [];
  const sectors = sectorsQuery.data ?? [];
  const encounters = encountersQuery.data ?? [];
  const loading = mapQuery.isLoading || sectorsQuery.isLoading || encountersQuery.isLoading;
  const errorMessage = mapQuery.isError
    ? errMsg(mapQuery.error, 'Falha ao carregar o mapa de leitos.')
    : sectorsQuery.isError
      ? errMsg(sectorsQuery.error, 'Falha ao carregar os setores.')
      : encountersQuery.isError
        ? errMsg(encountersQuery.error, 'Falha ao carregar os atendimentos.')
        : null;

  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['beds-map'] }),
      queryClient.invalidateQueries({ queryKey: ['bed-sectors'] }),
      queryClient.invalidateQueries({ queryKey: ['encounters'] }),
    ]);

  // Só oferece, na alocação de leito, atendimentos que ainda não têm leito
  // ativo e que não estão encerrados — antes o campo era texto livre e
  // exigia que quem alocasse já soubesse o UUID do atendimento de cor
  // (achado de auditoria em 10/09/2026: PA e Internação pareciam
  // desconectados por causa dessa falta de busca).
  const allocatedEncounterIds = new Set(
    sectorsMap.flatMap((s) => s.beds).map((b) => b.encounterId).filter((id): id is string => Boolean(id)),
  );
  const candidateEncounters = encounters.filter(
    (e) => e.status !== 'completed' && e.status !== 'canceled' && !allocatedEncounterIds.has(e.id),
  );

  return (
    <main>
      <h1>Prontuário de Internação</h1>
      {errorMessage && (
        <p role="alert" className="mb-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <BedOccupancyMap
          sectorsMap={sectorsMap}
          onSelectBed={(bed) => {
            if (bed.status === 'available') setAllocationBed(bed);
          }}
          onUpdateBedStatus={(bedId, status) => {
            void bedApi
              .updateBedStatus(bedId, status)
              .then(() => {
                toast.success('Status do leito atualizado.');
                return reload();
              })
              .catch((e) => toast.error(errMsg(e, 'Falha ao atualizar status do leito.')));
          }}
          onOpenTransferModal={(bed) => setTransferBed(bed)}
          onDischargeBed={(allocationId) => {
            void bedApi
              .dischargeBed(allocationId)
              .then(() => {
                toast.success('Alta do leito registrada.');
                return reload();
              })
              .catch((e) => toast.error(errMsg(e, 'Falha ao registrar alta do leito.')));
          }}
        />
      )}

      {transferBed && (
        <BedTransferModal
          currentBed={transferBed}
          sectorsMap={sectorsMap}
          onClose={() => setTransferBed(null)}
          onConfirmTransfer={async (allocationId, targetBedId, transferReason) => {
            await bedApi.transferBed(allocationId, targetBedId, transferReason);
            setTransferBed(null);
            toast.success('Leito transferido com sucesso.');
            await reload();
          }}
        />
      )}

      {allocationBed && (
        <BedAllocationModal
          bed={allocationBed}
          sectors={sectors}
          candidateEncounters={candidateEncounters}
          onClose={() => setAllocationBed(null)}
          onConfirmAllocation={async (encounterId, bedId, patientId, regulationCode) => {
            await bedApi.allocateBed(encounterId, bedId, patientId, regulationCode);
            setAllocationBed(null);
            toast.success('Leito alocado com sucesso.');
            await reload();
          }}
          onCreateExtraBed={async (sectorId, bedNumber, isIsolation) => {
            await bedApi.createExtraBed(sectorId, bedNumber, isIsolation);
            toast.success('Leito extra criado.');
            await reload();
          }}
        />
      )}
    </main>
  );
};
