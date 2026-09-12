import React from 'react';
import type { ExamRequest, ProcedureRequest, Interconsultation, InterconsultationPriority } from '../../../lib/exams-api.js';
import { ExamSearchInput } from '../../../components/ExamSearchInput.js';
import type { ExamsAndProceduresForm } from '../hooks/useExamsAndProcedures.js';
import { EmptyState } from '../../../components/ui/empty-state.js';

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
    <div style={{ marginTop: 20, borderTop: '2px solid #7c3aed', paddingTop: 15, marginBottom: 20 }}>
      <h4 style={{ color: '#6d28d9' }}>Exames, Procedimentos Ambulatoriais e Interconsultas (EXM-001..009)</h4>

      {/* 1. Solicitações de Exames */}
      <div style={{ marginBottom: 20 }}>
        <h5>Exames Laboratoriais e de Imagem</h5>
        {examRequests.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
            {examRequests.map((exam) => (
              <div key={exam.id} style={{ padding: 12, borderRadius: 6, border: '1px solid #e9d5ff', backgroundColor: '#faf5ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 14, color: '#581c87' }}>{exam.examName}</strong>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({exam.examType})</span>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 'bold',
                      backgroundColor: exam.status === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: exam.status === 'completed' ? '#166534' : '#92400e',
                    }}
                  >
                    {exam.status === 'completed' ? 'Concluído / Resultado' : 'Solicitado'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  <strong>Indicação Clínica:</strong> {exam.clinicalIndication}
                </div>
                {exam.resultSummary && (
                  <div style={{ marginTop: 6, padding: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 13 }}>
                    <strong>Resultado / Laudo:</strong> {exam.resultSummary}
                  </div>
                )}

                {exam.status !== 'completed' && (
                  <div style={{ marginTop: 8 }}>
                    {recordingResultExamId === exam.id ? (
                      <div style={{ padding: 8, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Lançar Resultado / Laudo Técnico *</label>
                        <input
                          type="text"
                          value={examResultSummary}
                          onChange={(e) => setExamResultSummary(e.target.value)}
                          placeholder="Descreva o laudo/resultado do exame..."
                          style={{ width: '100%', padding: 6, margin: '4px 0 6px 0' }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => handleRecordExamResult(exam.id)} style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                            Salvar Resultado
                          </button>
                          <button type="button" onClick={() => setRecordingResultExamId(null)} style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setRecordingResultExamId(exam.id); setExamResultSummary(''); }} style={{ padding: '3px 8px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                        Lançar Resultado
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhum exame solicitado" />
        )}

        <form onSubmit={handleCreateExamRequest} style={{ backgroundColor: '#faf5ff', padding: 12, borderRadius: 6, border: '1px solid #e9d5ff' }}>
          <h6 style={{ margin: '0 0 8px 0', color: '#6d28d9' }}>Solicitar Novo Exame</h6>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Pesquisar Exame *</label>
            <ExamSearchInput
              selectedItem={selectedExamItem}
              onSelect={(item) => setSelectedExamItem(item)}
              onClear={() => setSelectedExamItem(null)}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Indicação Clínica * (Mínimo 5 caracteres)</label>
            <input
              type="text"
              value={examClinicalIndication}
              onChange={(e) => setExamClinicalIndication(e.target.value)}
              placeholder="Ex: Suspeita de pneumonia / síndrome febril..."
              style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
              required
            />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '6px 14px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
            Solicitar Exame
          </button>
        </form>
      </div>

      {/* 2. Procedimentos Ambulatoriais */}
      <div style={{ marginBottom: 20 }}>
        <h5>Procedimentos Ambulatoriais</h5>
        {procedureRequests.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15 }}>
            {procedureRequests.map((proc) => (
              <div key={proc.id} style={{ padding: 10, borderRadius: 6, border: '1px solid #fed7aa', backgroundColor: '#fff7ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 13 }}>{proc.procedureName}</strong>
                  {proc.instructions && <div style={{ fontSize: 12, color: '#64748b' }}>Instr: {proc.instructions}</div>}
                </div>
                <div>
                  {proc.status === 'completed' ? (
                    <span style={{ padding: '2px 6px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>Executado</span>
                  ) : (
                    <button type="button" onClick={() => handleExecuteProcedure(proc.id)} style={{ padding: '3px 8px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                      Marcar Executado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhum procedimento solicitado" />
        )}

        <form onSubmit={handleCreateProcedureRequest} style={{ backgroundColor: '#fff7ed', padding: 12, borderRadius: 6, border: '1px solid #fed7aa' }}>
          <h6 style={{ margin: '0 0 8px 0', color: '#c2410c' }}>Solicitar Procedimento Ambulatorial</h6>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input
              type="text"
              value={procedureNameInput}
              onChange={(e) => setProcedureNameInput(e.target.value)}
              placeholder="Nome do procedimento (ex: Sutura, Nebulização)..."
              style={{ flex: 1, padding: 6 }}
              required
            />
            <input
              type="text"
              value={procedureInstructionsInput}
              onChange={(e) => setProcedureInstructionsInput(e.target.value)}
              placeholder="Instruções / Observações..."
              style={{ flex: 1, padding: 6 }}
            />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '6px 14px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
            Solicitar Procedimento
          </button>
        </form>
      </div>

      {/* 3. Interconsultas Médicas */}
      <div>
        <h5>Interconsultas Médicas Especializadas</h5>
        {interconsultations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
            {interconsultations.map((inter) => (
              <div key={inter.id} style={{ padding: 12, borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Parecer Especialidade: {inter.specialty}</strong>
                  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 'bold', backgroundColor: inter.status === 'answered' ? '#dcfce7' : '#e0f2fe', color: inter.status === 'answered' ? '#166534' : '#0369a1' }}>
                    {inter.status === 'answered' ? 'Respondida' : 'Aguardando Parecer'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  <strong>Resumo:</strong> {inter.clinicalSummary} | <strong>Quesito:</strong> {inter.question}
                </div>
                {inter.responseNotes && (
                  <div style={{ marginTop: 6, padding: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: 13 }}>
                    <strong>Parecer Técnico:</strong> {inter.responseNotes}
                  </div>
                )}

                {inter.status !== 'answered' && (
                  <div style={{ marginTop: 8 }}>
                    {respondingInterId === inter.id ? (
                      <div style={{ padding: 8, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Emitir Parecer Técnico do Especialista * (Min 10 caracteres)</label>
                        <textarea
                          value={interResponseNotes}
                          onChange={(e) => setInterResponseNotes(e.target.value)}
                          rows={2}
                          placeholder="Descreva a avaliação e conduta do especialista..."
                          style={{ width: '100%', padding: 6, margin: '4px 0 6px 0' }}
                          required
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => handleRespondInterconsultation(inter.id)} style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                            Salvar Parecer
                          </button>
                          <button type="button" onClick={() => setRespondingInterId(null)} style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setRespondingInterId(inter.id); setInterResponseNotes(''); }} style={{ padding: '3px 8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                        Responder Interconsulta
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhuma interconsulta solicitada" />
        )}

        <form onSubmit={handleCreateInterconsultation} style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <h6 style={{ margin: '0 0 8px 0' }}>Solicitar Nova Interconsulta</h6>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12 }}>Especialidade *</label>
              <input
                type="text"
                value={interSpecialty}
                onChange={(e) => setInterSpecialty(e.target.value)}
                placeholder="Ex: Cardiologia, Ortopedia"
                style={{ width: '100%', padding: 6 }}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12 }}>Prioridade *</label>
              <select
                value={interPriority}
                onChange={(e) => setInterPriority(e.target.value as InterconsultationPriority)}
                style={{ width: '100%', padding: 6 }}
              >
                <option value="routine">Rotina</option>
                <option value="urgent">Urgente</option>
                <option value="emergency">Emergência</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12 }}>Resumo Clínico *</label>
            <input
              type="text"
              value={interClinicalSummary}
              onChange={(e) => setInterClinicalSummary(e.target.value)}
              placeholder="Breve histórico do caso..."
              style={{ width: '100%', padding: 6 }}
              required
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12 }}>Dúvida / Quesito para o Especialista *</label>
            <input
              type="text"
              value={interQuestion}
              onChange={(e) => setInterQuestion(e.target.value)}
              placeholder="Quesito técnico para o parecer..."
              style={{ width: '100%', padding: 6 }}
              required
            />
          </div>
          <button type="submit" disabled={submitting} style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
            Enviar Interconsulta
          </button>
        </form>
      </div>
    </div>
  );
};
