import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { ApiError } from '../lib/api-client.js';
import { createEncountersApi } from '../lib/encounters-api.js';
import { AihFormModal } from '../components/AihFormModal.js';
import { ApacFormModal } from '../components/ApacFormModal.js';
import { SusAuthorizationPanel } from '../components/SusAuthorizationPanel.js';
import { ExternalRegulationModal } from '../components/ExternalRegulationModal.js';
import { AdverseEventReportModal } from '../components/AdverseEventReportModal.js';
import { ClinicalDocumentModal } from '../components/ClinicalDocumentModal.js';
import { InteroperabilityStep2Panel } from '../components/InteroperabilityStep2Panel.js';
import { PharmacyDispenseModal } from '../components/PharmacyDispenseModal.js';
import { CompulsoryNotificationModal } from '../components/CompulsoryNotificationModal.js';
import { BloodProductRequestModal } from '../components/BloodProductRequestModal.js';
import { AntimicrobialRequestModal } from '../components/AntimicrobialRequestModal.js';
import { TfdRequestModal } from '../components/TfdRequestModal.js';
import { SerUpdateModal } from '../components/SerUpdateModal.js';
import { TherapeuticPlanModal } from '../components/TherapeuticPlanModal.js';
import { NursingTherapeuticPlanModal } from '../components/NursingTherapeuticPlanModal.js';
import { SbarTransferModal } from '../components/SbarTransferModal.js';
import { SocialWorkAssessmentModal } from '../components/SocialWorkAssessmentModal.js';
import { NutritionAssessmentModal } from '../components/NutritionAssessmentModal.js';
import { PhysiotherapyAssessmentModal } from '../components/PhysiotherapyAssessmentModal.js';
import { FluidBalanceModal } from '../components/FluidBalanceModal.js';

interface Props {
  encounterId: string;
}

type OpenPanel =
  | 'aih'
  | 'apac'
  | 'autorizacao_sus'
  | 'regulacao'
  | 'evento'
  | 'documento'
  | 'farmacia'
  | 'interop'
  | 'notificacao'
  | 'sangue'
  | 'atm'
  | 'tfd'
  | 'ser'
  | 'plano'
  | 'plano_multidisciplinar'
  | 'sbar'
  | 'servico_social'
  | 'nutricao'
  | 'fisioterapia'
  | 'balanco_hidrico'
  | null;

type TabKey = 'medicas' | 'enfermagem' | 'farmacia';

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'medicas', label: 'Solicitações Médicas' },
  { key: 'enfermagem', label: 'Enfermagem / Multidisciplinar' },
  { key: 'farmacia', label: 'Farmácia / Interoperabilidade' },
];

// Cada ação pertence a uma única aba, agrupada por quem assina/executa o
// documento (CRM na aba médica; COREN/outros profissionais na
// enfermagem-multidisciplinar) — reorganização pedida explicitamente pelo
// usuário em 2026-09-07 (a lista plana de ~18 botões estava sem nenhuma
// categorização por tipo de profissional).
const ACTIONS: ReadonlyArray<{ panel: Exclude<OpenPanel, null>; label: string; tab: TabKey }> = [
  { panel: 'aih', label: 'Solicitar AIH', tab: 'medicas' },
  { panel: 'apac', label: 'Solicitar APAC', tab: 'medicas' },
  { panel: 'autorizacao_sus', label: 'Autorizar AIH/APAC (regulação/auditoria)', tab: 'medicas' },
  { panel: 'sangue', label: 'Solicitar sangue/componentes/derivados', tab: 'medicas' },
  { panel: 'atm', label: 'Solicitar antimicrobiano de uso restrito (ATM)', tab: 'medicas' },
  { panel: 'tfd', label: 'Emitir laudo de Tratamento Fora de Domicílio (TFD)', tab: 'medicas' },
  { panel: 'documento', label: 'Emitir documento clínico', tab: 'medicas' },
  { panel: 'plano', label: 'Registrar plano terapêutico', tab: 'medicas' },
  { panel: 'evento', label: 'Reportar evento adverso', tab: 'medicas' },
  { panel: 'regulacao', label: 'Regulação externa (SISREG/CROSS)', tab: 'medicas' },

  { panel: 'ser', label: 'Atualizar quadro clínico (SER)', tab: 'enfermagem' },
  { panel: 'sbar', label: 'Transferência interna (SBAR)', tab: 'enfermagem' },
  { panel: 'plano_multidisciplinar', label: 'Registrar projeto terapêutico multidisciplinar (Enfermagem)', tab: 'enfermagem' },
  { panel: 'balanco_hidrico', label: 'Balanço Hídrico', tab: 'enfermagem' },
  { panel: 'servico_social', label: 'Evolução de Serviço Social', tab: 'enfermagem' },
  { panel: 'nutricao', label: 'Avaliação Nutricional', tab: 'enfermagem' },
  { panel: 'fisioterapia', label: 'Avaliação Fisioterapêutica', tab: 'enfermagem' },
  { panel: 'notificacao', label: 'Notificar agravo compulsório', tab: 'enfermagem' },

  { panel: 'farmacia', label: 'Solicitar dispensação (Farmácia)', tab: 'farmacia' },
  { panel: 'interop', label: 'Interoperabilidade (RNDS / Lote de AIH)', tab: 'farmacia' },
];

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
  const [activeTab, setActiveTab] = useState<TabKey>('medicas');
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
        <>
          <div role="tablist" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  fontWeight: activeTab === t.key ? 700 : 400,
                  borderBottom: activeTab === t.key ? '2px solid var(--color-primary, #12232d)' : '2px solid transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ACTIONS.filter((a) => a.tab === activeTab).map((a) => (
              <button key={a.panel} type="button" onClick={() => setOpen(a.panel)}>
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}

      {open === 'aih' && patientId && (
        <Overlay title="Solicitação de AIH" onClose={() => setOpen(null)}>
          <AihFormModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'apac' && patientId && (
        <Overlay title="Solicitação de APAC" onClose={() => setOpen(null)}>
          <ApacFormModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'autorizacao_sus' && (
        <Overlay title="Autorização de Laudos AIH/APAC" onClose={() => setOpen(null)}>
          <SusAuthorizationPanel encounterId={encounterId} />
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
      {open === 'farmacia' && patientId && (
        <Overlay title="Dispensação de farmácia" onClose={() => setOpen(null)}>
          <PharmacyDispenseModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'interop' && (
        <Overlay title="Interoperabilidade" onClose={() => setOpen(null)}>
          <InteroperabilityStep2Panel encounterId={encounterId} />
        </Overlay>
      )}
      {open === 'notificacao' && patientId && (
        <Overlay title="Notificação compulsória" onClose={() => setOpen(null)}>
          <CompulsoryNotificationModal
            encounterId={encounterId}
            patientId={patientId}
            onSuccess={() => setOpen(null)}
          />
        </Overlay>
      )}
      {open === 'sangue' && patientId && (
        <Overlay title="Solicitação de Sangue, Componentes e Derivados" onClose={() => setOpen(null)}>
          <BloodProductRequestModal
            encounterId={encounterId}
            patientId={patientId}
            onSuccess={() => setOpen(null)}
          />
        </Overlay>
      )}
      {open === 'atm' && patientId && (
        <Overlay title="Formulário Antimicrobiano (ATM)" onClose={() => setOpen(null)}>
          <AntimicrobialRequestModal
            encounterId={encounterId}
            patientId={patientId}
            onSuccess={() => setOpen(null)}
          />
        </Overlay>
      )}
      {open === 'tfd' && patientId && (
        <Overlay title="Laudo Médico LM/TFD" onClose={() => setOpen(null)}>
          <TfdRequestModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'ser' && patientId && (
        <Overlay title="Atualização de Quadro Clínico (SER)" onClose={() => setOpen(null)}>
          <SerUpdateModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'plano' && patientId && (
        <Overlay title="Plano Terapêutico" onClose={() => setOpen(null)}>
          <TherapeuticPlanModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'plano_multidisciplinar' && patientId && (
        <Overlay title="Projeto Terapêutico Multidisciplinar (Enfermagem)" onClose={() => setOpen(null)}>
          <NursingTherapeuticPlanModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'sbar' && patientId && (
        <Overlay title="Transferência Interna (SBAR)" onClose={() => setOpen(null)}>
          <SbarTransferModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'servico_social' && patientId && (
        <Overlay title="Evolução de Serviço Social" onClose={() => setOpen(null)}>
          <SocialWorkAssessmentModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'nutricao' && patientId && (
        <Overlay title="Avaliação Nutricional" onClose={() => setOpen(null)}>
          <NutritionAssessmentModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'fisioterapia' && patientId && (
        <Overlay title="Avaliação Fisioterapêutica" onClose={() => setOpen(null)}>
          <PhysiotherapyAssessmentModal encounterId={encounterId} patientId={patientId} onSuccess={() => setOpen(null)} />
        </Overlay>
      )}
      {open === 'balanco_hidrico' && (
        <Overlay title="Balanço Hídrico" onClose={() => setOpen(null)}>
          <FluidBalanceModal encounterId={encounterId} />
        </Overlay>
      )}
    </main>
  );
};
