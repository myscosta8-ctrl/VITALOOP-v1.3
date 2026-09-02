import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createNursingApi, type NursingRecordData, type MedicationScheduleData } from '../lib/nursing-api.js';
import { NursingRecordsView } from '../components/NursingRecordsView.js';
import { MedicationScheduleGrid } from '../components/MedicationScheduleGrid.js';
import { BedsideCheckModal } from '../components/BedsideCheckModal.js';

interface Props {
  encounterId: string;
}

export const EnfermagemPage: React.FC<Props> = ({ encounterId }) => {
  const { api } = useSession();
  const nursingApi = createNursingApi(api);

  const [records, setRecords] = useState<NursingRecordData[]>([]);
  const [schedules, setSchedules] = useState<MedicationScheduleData[]>([]);
  const [scheduleForAdmin, setScheduleForAdmin] = useState<MedicationScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [recordsData, schedulesData] = await Promise.all([
        nursingApi.getNursingRecords(encounterId),
        nursingApi.getMedicationSchedules(encounterId),
      ]);
      setRecords(recordsData);
      setSchedules(schedulesData);
    } catch (e) {
      setErrorMessage(e instanceof ApiError ? e.message : 'Falha ao carregar dados de enfermagem.');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddRecord = async (
    recordType: 'admission' | 'evolution' | 'annotation',
    content: string,
  ): Promise<void> => {
    await nursingApi.createNursingRecord(encounterId, { recordType, content });
    await load();
  };

  const handleConfirmAdmin = async (payload: {
    status: 'administered' | 'not_administered' | 'refused' | 'suspended';
    notes?: string | null;
    nonAdminReason?: string | null;
    bedSideChecked: boolean;
    batchNumber?: string | null;
  }): Promise<void> => {
    if (!scheduleForAdmin) return;
    await nursingApi.administerMedication(scheduleForAdmin.id, payload);
    setScheduleForAdmin(null);
    await load();
  };

  return (
    <main>
      <h1>Enfermagem — registros e prescrição aprazada</h1>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {loading ? (
        <p role="status">Carregando…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <NursingRecordsView records={records} onAddRecord={handleAddRecord} />
          <MedicationScheduleGrid
            schedules={schedules}
            onSelectScheduleForAdmin={(schedule) => setScheduleForAdmin(schedule)}
          />
        </div>
      )}
      {scheduleForAdmin && (
        <BedsideCheckModal
          schedule={scheduleForAdmin}
          onClose={() => setScheduleForAdmin(null)}
          onConfirm={handleConfirmAdmin}
        />
      )}
    </main>
  );
};
