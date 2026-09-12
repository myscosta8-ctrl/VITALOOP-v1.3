import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useSession } from '../context/session-context.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { useEncounterClinicalData } from './medical-consultation/hooks/useEncounterClinicalData.js';
import { useConsultationForm } from './medical-consultation/hooks/useConsultationForm.js';
import { useDiagnoses } from './medical-consultation/hooks/useDiagnoses.js';
import { usePrescriptions } from './medical-consultation/hooks/usePrescriptions.js';
import { useExamsAndProcedures } from './medical-consultation/hooks/useExamsAndProcedures.js';
import { useOutcome } from './medical-consultation/hooks/useOutcome.js';
import { TriagemTab } from './medical-consultation/tabs/TriagemTab.js';
import { ConsultaTab } from './medical-consultation/tabs/ConsultaTab.js';
import { DiagnosticosTab } from './medical-consultation/tabs/DiagnosticosTab.js';
import { PrescricoesTab } from './medical-consultation/tabs/PrescricoesTab.js';
import { ExamesTab } from './medical-consultation/tabs/ExamesTab.js';
import { InternacaoTab } from './medical-consultation/tabs/InternacaoTab.js';
import { DesfechoTab } from './medical-consultation/tabs/DesfechoTab.js';

interface Props {
  encounterId: string;
}

type ClinicalTab = 'triagem' | 'consulta' | 'diagnosticos' | 'prescricoes' | 'exames' | 'internacao' | 'desfecho';

const TABS: ReadonlyArray<readonly [ClinicalTab, string]> = [
  ['triagem', 'Triagem'],
  ['consulta', 'Consulta Médica'],
  ['diagnosticos', 'Diagnósticos'],
  ['prescricoes', 'Prescrições'],
  ['exames', 'Exames'],
  ['internacao', 'Internação'],
  ['desfecho', 'Desfecho'],
];

/**
 * Ficha Clínica organizada em abas cronológicas (Triagem → Consulta →
 * Diagnósticos → Prescrições → Exames → Internação → Desfecho) — achado de
 * auditoria em 10/09/2026 (o usuário via tudo empilhado numa página só).
 *
 * Decomposto em 10/09/2026 (1670 linhas → orquestrador fino) seguindo o
 * padrão `<feature>/{hooks,tabs}` estudado no projeto "Emergency Care":
 * cada aba tem seu próprio hook de estado/handlers em `medical-consultation/
 * hooks/` e seu próprio componente de apresentação em
 * `medical-consultation/tabs/`. Este arquivo só compõe os hooks e decide
 * qual aba mostrar — nenhuma lógica de negócio vive aqui.
 */
export const MedicalConsultationPage: React.FC<Props> = ({ encounterId }) => {
  const { api } = useSession();
  const [activeTab, setActiveTab] = useState<ClinicalTab>('consulta');

  const data = useEncounterClinicalData(api, encounterId);
  const consultationForm = useConsultationForm(api, encounterId, {
    triage: data.triage,
    existingConsultation: data.existingConsultation,
    setExistingConsultation: data.setExistingConsultation,
    reload: data.reload,
  });
  const diagnosesForm = useDiagnoses(api, encounterId, { reload: data.reload });
  const prescriptionsForm = usePrescriptions(api, encounterId, { reload: data.reload });
  const examsForm = useExamsAndProcedures(api, encounterId, { reload: data.reload });
  const outcomeForm = useOutcome(api, encounterId, {
    reload: data.reload,
    setOutcome: data.setOutcome,
    setSummary: data.setSummary,
  });

  if (data.loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Carregando prontuário médico...</div>;
  }

  const requiresConsultationFirst = !data.existingConsultation
    && (activeTab === 'diagnosticos' || activeTab === 'prescricoes' || activeTab === 'exames' || activeTab === 'desfecho');

  return (
    <div className="mx-auto max-w-4xl py-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="size-5 text-primary" />
            Consulta Médica de UPA (Prontuário Assistencial)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ClinicalTab)}>
            <TabsList>
              {TABS.map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {data.errorMessage && (
            <div role="alert" className="mt-4 rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {data.errorMessage}
            </div>
          )}

          <div className="mt-4">
            {activeTab === 'triagem' && <TriagemTab triage={data.triage} />}

            {activeTab === 'consulta' && <ConsultaTab form={consultationForm} />}

            {requiresConsultationFirst ? (
              <p className="text-sm text-muted-foreground">
                Registre a consulta médica (aba "Consulta Médica") antes de preencher esta seção.
              </p>
            ) : (
              <>
                {activeTab === 'diagnosticos' && <DiagnosticosTab diagnoses={data.diagnoses} form={diagnosesForm} />}
                {activeTab === 'prescricoes' && <PrescricoesTab prescriptions={data.prescriptions} form={prescriptionsForm} />}
                {activeTab === 'exames' && (
                  <ExamesTab
                    examRequests={data.examRequests}
                    procedureRequests={data.procedureRequests}
                    interconsultations={data.interconsultations}
                    form={examsForm}
                  />
                )}
                {activeTab === 'desfecho' && <DesfechoTab outcome={data.outcome} summary={data.summary} form={outcomeForm} />}
              </>
            )}

            {activeTab === 'internacao' && <InternacaoTab bedInfo={data.bedInfo} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
