import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import {
  createBedApi,
  type BedData,
  type BedSectorData,
  type SectorMapData,
} from '../lib/bed-api.js';
import { BedOccupancyMap } from '../components/BedOccupancyMap.js';
import { BedTransferModal } from '../components/BedTransferModal.js';
import { BedAllocationModal } from '../components/BedAllocationModal.js';

export const BedMapPage: React.FC = () => {
  const { api } = useSession();
  const bedApi = createBedApi(api);

  const [sectorsMap, setSectorsMap] = useState<SectorMapData[]>([]);
  const [sectors, setSectors] = useState<BedSectorData[]>([]);
  const [transferBed, setTransferBed] = useState<BedData | null>(null);
  const [allocationBed, setAllocationBed] = useState<BedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [map, sectorList] = await Promise.all([bedApi.getBedsMap(), bedApi.getSectors()]);
      setSectorsMap(map);
      setSectors(sectorList);
    } catch (e) {
      setErrorMessage(e instanceof ApiError ? e.message : 'Falha ao carregar o mapa de leitos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main>
      <h1>Mapa de leitos</h1>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {loading ? (
        <p role="status">Carregando…</p>
      ) : (
        <BedOccupancyMap
          sectorsMap={sectorsMap}
          onSelectBed={(bed) => {
            if (bed.status === 'available') setAllocationBed(bed);
          }}
          onUpdateBedStatus={(bedId, status) => {
            void bedApi.updateBedStatus(bedId, status).then(load);
          }}
          onOpenTransferModal={(bed) => setTransferBed(bed)}
          onDischargeBed={(allocationId) => {
            void bedApi.dischargeBed(allocationId).then(load);
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
            await load();
          }}
        />
      )}

      {allocationBed && (
        <BedAllocationModal
          bed={allocationBed}
          sectors={sectors}
          onClose={() => setAllocationBed(null)}
          onConfirmAllocation={async (encounterId, bedId, patientId, regulationCode) => {
            await bedApi.allocateBed(encounterId, bedId, patientId, regulationCode);
            setAllocationBed(null);
            await load();
          }}
          onCreateExtraBed={async (sectorId, bedNumber, isIsolation) => {
            await bedApi.createExtraBed(sectorId, bedNumber, isIsolation);
            await load();
          }}
        />
      )}
    </main>
  );
};
