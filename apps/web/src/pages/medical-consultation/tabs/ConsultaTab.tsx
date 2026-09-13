import React from 'react';
import type { ConsultationForm } from '../hooks/useConsultationForm.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Card, CardContent } from '../../../components/ui/card.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Textarea } from '../../../components/ui/textarea.js';
import { Label } from '../../../components/ui/label.js';
import { VitalSignsPanel } from '../../../components/VitalSignsPanel.js';

interface Props {
  encounterId: string;
  form: ConsultationForm;
}

export const ConsultaTab: React.FC<Props> = ({ encounterId, form }) => {
  const {
    existingConsultation,
    chiefComplaint, setChiefComplaint,
    historyPresentIllness, setHistoryPresentIllness,
    pastMedicalHistory, setPastMedicalHistory,
    systemReview, setSystemReview,
    generalExam, setGeneralExam,
    cvExam, setCvExam,
    respExam, setRespExam,
    abdExam, setAbdExam,
    neuroExam, setNeuroExam,
    extExam, setExtExam,
    diagnosticHypothesis, setDiagnosticHypothesis,
    initialConduct, setInitialConduct,
    evolutionText, setEvolutionText,
    clinicalStatus, setClinicalStatus,
    submitting,
    handleSubmitConsultation,
    handleAddEvolution,
  } = form;

  if (existingConsultation) {
    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-1.5 pt-6 text-sm">
            <h3 className="mb-2 text-base font-semibold text-foreground">Consulta Médica Registrada</h3>
            <p><strong>Queixa Principal:</strong> {existingConsultation.chiefComplaint}</p>
            <p><strong>HMA:</strong> {existingConsultation.historyPresentIllness}</p>
            {existingConsultation.pastMedicalHistory && <p><strong>Antecedentes:</strong> {existingConsultation.pastMedicalHistory}</p>}
            <p><strong>Exame Físico Geral:</strong> {existingConsultation.generalExam}</p>
            <p><strong>Hipótese Diagnóstica:</strong> {existingConsultation.diagnosticHypothesis}</p>
            {existingConsultation.initialConduct && <p><strong>Conduta Inicial:</strong> {existingConsultation.initialConduct}</p>}
          </CardContent>
        </Card>

        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground">Evoluções / Reavaliações Médicas Sequenciais</h4>
          {existingConsultation.evolutions && existingConsultation.evolutions.length > 0 ? (
            <div className="space-y-2.5">
              {existingConsultation.evolutions.map((evo) => (
                <div key={evo.id} className="rounded-md border-l-4 border-primary bg-muted/40 p-2.5">
                  <div className="text-xs text-muted-foreground">
                    {new Date(evo.createdAt).toLocaleString()} | Status: {evo.clinicalStatus || 'Estável'}
                  </div>
                  <div className="mt-1 text-sm text-foreground">{evo.evolutionText}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState className="p-4" title="Nenhuma evolução adicional registrada" />
          )}

          <Card>
            <CardContent className="space-y-3 pt-6">
              <h5 className="text-sm font-semibold text-foreground">Adicionar Nova Evolução Médica</h5>
              <form onSubmit={handleAddEvolution} className="space-y-3">
                <Textarea
                  value={evolutionText}
                  onChange={(e) => setEvolutionText(e.target.value)}
                  placeholder="Descreva a reavaliação ou evolução clínica do paciente..."
                  rows={3}
                  required
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="whitespace-nowrap">Status Clínico:</Label>
                  <Input
                    type="text"
                    value={clinicalStatus}
                    onChange={(e) => setClinicalStatus(e.target.value)}
                    placeholder="Ex.: estável, em melhora"
                    className="w-auto flex-1"
                  />
                  <Button type="submit" disabled={submitting}>
                    Adicionar Evolução
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <VitalSignsPanel encounterId={encounterId} source="consulta" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitConsultation} className="space-y-4">
      <fieldset className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-2 font-semibold text-foreground">1. Anamnese Médica</legend>

        <div className="space-y-1.5">
          <Label htmlFor="chiefComplaint">Queixa Principal *</Label>
          <Input
            id="chiefComplaint"
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Queixa relatada pelo paciente"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="historyPresentIllness">História da Moléstia Atual (HMA) *</Label>
          <Textarea
            id="historyPresentIllness"
            value={historyPresentIllness}
            onChange={(e) => setHistoryPresentIllness(e.target.value)}
            rows={4}
            placeholder="Detalhamento cronológico da evolução dos sintomas..."
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Antecedentes Pessoais / Comorbidades</Label>
            <Textarea
              value={pastMedicalHistory}
              onChange={(e) => setPastMedicalHistory(e.target.value)}
              rows={2}
              placeholder="HAS, DM, Cirurgias anteriores..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Revisão de Sistemas</Label>
            <Textarea
              value={systemReview}
              onChange={(e) => setSystemReview(e.target.value)}
              rows={2}
              placeholder="Sintomas gerais por aparelhos..."
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-2 font-semibold text-foreground">2. Exame Físico</legend>

        <div className="space-y-1.5">
          <Label htmlFor="generalExam">Exame Físico Geral *</Label>
          <Textarea
            id="generalExam"
            value={generalExam}
            onChange={(e) => setGeneralExam(e.target.value)}
            rows={2}
            placeholder="BEG, acianótico, anictérico, corado, hidratado..."
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-normal">Aparelho Cardiovascular</Label>
            <Input
              type="text"
              value={cvExam}
              onChange={(e) => setCvExam(e.target.value)}
              placeholder="RCR 2T BNF sem sopros"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal">Aparelho Respiratório</Label>
            <Input
              type="text"
              value={respExam}
              onChange={(e) => setRespExam(e.target.value)}
              placeholder="MV+ sem ruídos adventícios"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal">Abdômen</Label>
            <Input
              type="text"
              value={abdExam}
              onChange={(e) => setAbdExam(e.target.value)}
              placeholder="Atípico, RHA+, flácido, indolor"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal">Neurológico</Label>
            <Input
              type="text"
              value={neuroExam}
              onChange={(e) => setNeuroExam(e.target.value)}
              placeholder="Consciente, orientado, sem déficits"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-normal">Membros / Extremidades</Label>
            <Input
              type="text"
              value={extExam}
              onChange={(e) => setExtExam(e.target.value)}
              placeholder="Sem edemas, pulsos presentes e simétricos"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-2 font-semibold text-foreground">3. Hipótese Diagnóstica &amp; Conduta</legend>

        <div className="space-y-1.5">
          <Label htmlFor="diagnosticHypothesis">Hipótese Diagnóstica Clínica *</Label>
          <Input
            id="diagnosticHypothesis"
            type="text"
            value={diagnosticHypothesis}
            onChange={(e) => setDiagnosticHypothesis(e.target.value)}
            placeholder="Hipótese clínica formulada pelo médico"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Plano de Conduta Inicial</Label>
          <Textarea
            value={initialConduct}
            onChange={(e) => setInitialConduct(e.target.value)}
            rows={2}
            placeholder="Orientação, medicação sintomática, exames..."
          />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          Registrar Consulta Médica
        </Button>
      </div>
    </form>
  );
};
