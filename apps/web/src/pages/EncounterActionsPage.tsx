import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createEncountersApi } from '../lib/encounters-api.js';
import { AihFormModal } from '../components/AihFormModal.js';
import { ExternalRegulationModal } from '../components/ExternalRegulationModal.js';
import { AdverseEventReportModal } from '../components/AdverseEventReportModal.js';
import { ClinicalDocumentModal } from '../components/ClinicalDocumentModal.js';
import { InteroperabilityStep2Panel } from '../components/InteroperabilityStep2Panel.js';

interface Props {
  encounterId: string;
}

type OpenPanel = 'aih' | 'regulacao' | 'evento' | 'documento' | 'interop' | null;

const Overlay: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(18,35,45,.45)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 20px',
      overflowY: 'auto',
      zIndex: 100,
    }}
  >
    <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 520, maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        <button type="button" onClick={onClose} style={{ marginTop: 0 }}>
          Fechar
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const EncounterActionsPage: React.FC<Props> = ({ encounterId }) => {
  const { api } = useSession();
  const encountersApi = createEncountersApi(api);

  const [patientId, setPatientId] = useState<string | null>(null);
  const [open, setOpen] = useState<OpenPanel>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const encounter = await encountersApi.getEncounter(encounterId);
        if (!cancelled) setPatientId(encounter.patientId);
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof ApiError ? e.message : 'Falha ao carregar o atendimento.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  return (
    <main>
      <h1>Ações do atendimento</h1>
      <p className="subtitle">Atendimento {encounterId}</p>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {loading || !patientId ? (
        <p role="status">Carregando…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" onClick={() => setOpen('aih')}>
            Solicitar AIH
          </button>
          <button type="button" onClick={() => setOpen('regulacao')}>
            Regulação externa (SISREG/CROSS)
          </button>
          <button type="button" onClick={() => setOpen('evento')}>
            Reportar evento adverso
          </button>
          <button type="button" onClick={() => setOpen('documento')}>
            Emitir documento clínico
          </button>
          <button type="button" onClick={() => setOpen('interop')}>
            Interoperabilidade (RNDS / Farmácia)
          </button>
        </div>
      )}

      {open === 'aih' && patientId && (
        <Overlay title="Solicitação de AIH" onClose={() => setOpen(null)}>
          <AihFormModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'regulacao' && patientId && (
        <Overlay title="Regulação externa" onClose={() => setOpen(null)}>
          <ExternalRegulationModal
            encounterId={encounterId}
            patientId={patientId}
            onSuccess={() => setOpen(null)}
          />
        </Overlay>
      )}
      {open === 'evento' && patientId && (
        <Overlay title="Evento adverso" onClose={() => setOpen(null)}>
          <AdverseEventReportModal
            encounterId={encounterId}
            patientId={patientId}
            onSuccess={() => setOpen(null)}
          />
        </Overlay>
      )}
      {open === 'documento' && (
        <Overlay title="Documento clínico" onClose={() => setOpen(null)}>
          <ClinicalDocumentModal encounterId={encounterId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'interop' && patientId && (
        <Overlay title="Interoperabilidade" onClose={() => setOpen(null)}>
          <InteroperabilityStep2Panel encounterId={encounterId} patientId={patientId} />
        </Overlay>
      )}
    </main>
  );
};
