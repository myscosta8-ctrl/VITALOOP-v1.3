import React from 'react';
import type { ExamRequest, ProcedureRequest, Interconsultation, InterconsultationPriority } from '../../../lib/exams-api.js';
import { ExamSearchInput } from '../../../components/ExamSearchInput.js';
import type { ExamsAndProceduresForm } from '../hooks/useExamsAndProcedures.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Card, CardContent } from '../../../components/ui/card.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Textarea } from '../../../components/ui/textarea.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

interface Props {
  examRequests: readonly ExamRequest[];
  procedureRequests: readonly ProcedureRequest[];
  interconsultations: readonly Interconsultation[];
  form: ExamsAndProceduresForm;
}

export const ExamesTab: React.FC<Props> = ({ examRequests, procedureRequests, interconsultations, form }) => {
  const {
    selectedExamItem, setSelectedExamItem,
    examClinicalIndication, setExamClinicalIndication,
    recordingResultExamId, setRecordingResultExamId,
    examResultSummary, setExamResultSummary,
    procedureNameInput, setProcedureNameInput,
    procedureInstructionsInput, setProcedureInstructionsInput,
    interSpecialty, setInterSpecialty,
    interPriority, setInterPriority,
    interClinicalSummary, setInterClinicalSummary,
    interQuestion, setInterQuestion,
    respondingInterId, setRespondingInterId,
    interResponseNotes, setInterResponseNotes,
    submitting,
    handleCreateExamRequest,
    handleRecordExamResult,
    handleCreateProcedureRequest,
    handleExecuteProcedure,
    handleCreateInterconsultation,
    handleRespondInterconsultation,
  } = form;

  return (
    <div className="space-y-6">
      <h4 className="text-sm font-semibold text-foreground">Exames, Procedimentos Ambulatoriais e Interconsultas (EXM-001..009)</h4>

      {/* 1. Solicitações de Exames */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold text-foreground">Exames Laboratoriais e de Imagem</h5>
        {examRequests.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {examRequests.map((exam) => (
              <div key={exam.id} className="rounded-md border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-sm text-foreground">{exam.examName}</strong>
                    <span className="ml-2 text-xs text-muted-foreground">({exam.examType})</span>
                  </div>
                  <Badge variant={exam.status === 'completed' ? 'success' : 'warning'}>
                    {exam.status === 'completed' ? 'Concluído / Resultado' : 'Solicitado'}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <strong>Indicação Clínica:</strong> {exam.clinicalIndication}
                </div>
                {exam.resultSummary && (
                  <div className="mt-1.5 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-2 text-sm">
                    <strong>Resultado / Laudo:</strong> {exam.resultSummary}
                  </div>
                )}

                {exam.status !== 'completed' && (
                  <div className="mt-2">
                    {recordingResultExamId === exam.id ? (
                      <div className="space-y-2 rounded-md border border-border bg-card p-2">
                        <Label className="text-xs">Lançar Resultado / Laudo Técnico *</Label>
                        <Input
                          type="text"
                          value={examResultSummary}
                          onChange={(e) => setExamResultSummary(e.target.value)}
                          placeholder="Descreva o laudo/resultado do exame..."
                        />
                        <div className="flex gap-1.5">
                          <Button type="button" size="sm" onClick={() => handleRecordExamResult(exam.id)}>
                            Salvar Resultado
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setRecordingResultExamId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => { setRecordingResultExamId(exam.id); setExamResultSummary(''); }}
                      >
                        Lançar Resultado
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhum exame solicitado" />
        )}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h6 className="text-sm font-semibold text-foreground">Solicitar Novo Exame</h6>
            <form onSubmit={handleCreateExamRequest} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pesquisar Exame *</Label>
                <ExamSearchInput
                  selectedItem={selectedExamItem}
                  onSelect={(item) => setSelectedExamItem(item)}
                  onClear={() => setSelectedExamItem(null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Indicação Clínica * (Mínimo 5 caracteres)</Label>
                <Input
                  type="text"
                  value={examClinicalIndication}
                  onChange={(e) => setExamClinicalIndication(e.target.value)}
                  placeholder="Ex: Suspeita de pneumonia / síndrome febril..."
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                Solicitar Exame
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 2. Procedimentos Ambulatoriais */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold text-foreground">Procedimentos Ambulatoriais</h5>
        {procedureRequests.length > 0 ? (
          <div className="flex flex-col gap-2">
            {procedureRequests.map((proc) => (
              <div key={proc.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 p-2.5">
                <div>
                  <strong className="text-sm text-foreground">{proc.procedureName}</strong>
                  {proc.instructions && <div className="text-xs text-muted-foreground">Instr: {proc.instructions}</div>}
                </div>
                <div>
                  {proc.status === 'completed' ? (
                    <Badge variant="success">Executado</Badge>
                  ) : (
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleExecuteProcedure(proc.id)}>
                      Marcar Executado
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhum procedimento solicitado" />
        )}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h6 className="text-sm font-semibold text-foreground">Solicitar Procedimento Ambulatorial</h6>
            <form onSubmit={handleCreateProcedureRequest} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="text"
                  value={procedureNameInput}
                  onChange={(e) => setProcedureNameInput(e.target.value)}
                  placeholder="Nome do procedimento (ex: Sutura, Nebulização)..."
                  required
                />
                <Input
                  type="text"
                  value={procedureInstructionsInput}
                  onChange={(e) => setProcedureInstructionsInput(e.target.value)}
                  placeholder="Instruções / Observações..."
                />
              </div>
              <Button type="submit" disabled={submitting}>
                Solicitar Procedimento
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 3. Interconsultas Médicas */}
      <div className="space-y-3">
        <h5 className="text-sm font-semibold text-foreground">Interconsultas Médicas Especializadas</h5>
        {interconsultations.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {interconsultations.map((inter) => (
              <div key={inter.id} className="rounded-md border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-foreground">Parecer Especialidade: {inter.specialty}</strong>
                  <Badge variant={inter.status === 'answered' ? 'success' : 'outline'}>
                    {inter.status === 'answered' ? 'Respondida' : 'Aguardando Parecer'}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <strong>Resumo:</strong> {inter.clinicalSummary} | <strong>Quesito:</strong> {inter.question}
                </div>
                {inter.responseNotes && (
                  <div className="mt-1.5 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-2 text-sm">
                    <strong>Parecer Técnico:</strong> {inter.responseNotes}
                  </div>
                )}

                {inter.status !== 'answered' && (
                  <div className="mt-2">
                    {respondingInterId === inter.id ? (
                      <div className="space-y-2 rounded-md border border-border bg-card p-2">
                        <Label className="text-xs">Emitir Parecer Técnico do Especialista * (Min 10 caracteres)</Label>
                        <Textarea
                          value={interResponseNotes}
                          onChange={(e) => setInterResponseNotes(e.target.value)}
                          rows={2}
                          placeholder="Descreva a avaliação e conduta do especialista..."
                          required
                        />
                        <div className="flex gap-1.5">
                          <Button type="button" size="sm" onClick={() => handleRespondInterconsultation(inter.id)}>
                            Salvar Parecer
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setRespondingInterId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => { setRespondingInterId(inter.id); setInterResponseNotes(''); }}
                      >
                        Responder Interconsulta
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhuma interconsulta solicitada" />
        )}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h6 className="text-sm font-semibold text-foreground">Solicitar Nova Interconsulta</h6>
            <form onSubmit={handleCreateInterconsultation} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Especialidade *</Label>
                  <Input
                    type="text"
                    value={interSpecialty}
                    onChange={(e) => setInterSpecialty(e.target.value)}
                    placeholder="Ex: Cardiologia, Ortopedia"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Prioridade *</Label>
                  <Select value={interPriority} onChange={(e) => setInterPriority(e.target.value as InterconsultationPriority)}>
                    <option value="routine">Rotina</option>
                    <option value="urgent">Urgente</option>
                    <option value="emergency">Emergência</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Resumo Clínico *</Label>
                <Input
                  type="text"
                  value={interClinicalSummary}
                  onChange={(e) => setInterClinicalSummary(e.target.value)}
                  placeholder="Breve histórico do caso..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dúvida / Quesito para o Especialista *</Label>
                <Input
                  type="text"
                  value={interQuestion}
                  onChange={(e) => setInterQuestion(e.target.value)}
                  placeholder="Quesito técnico para o parecer..."
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                Enviar Interconsulta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
