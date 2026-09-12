import React from 'react';
import type { ConsultationForm } from '../hooks/useConsultationForm.js';
import { EmptyState } from '../../../components/ui/empty-state.js';

interface Props {
  form: ConsultationForm;
}

export const ConsultaTab: React.FC<Props> = ({ form }) => {
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
      <div>
        <div style={{ padding: 15, backgroundColor: '#f1f5f9', borderRadius: 6, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Consulta Médica Registrada</h3>
          <p><strong>Queixa Principal:</strong> {existingConsultation.chiefComplaint}</p>
          <p><strong>HMA:</strong> {existingConsultation.historyPresentIllness}</p>
          {existingConsultation.pastMedicalHistory && <p><strong>Antecedentes:</strong> {existingConsultation.pastMedicalHistory}</p>}
          <p><strong>Exame Físico Geral:</strong> {existingConsultation.generalExam}</p>
          <p><strong>Hipótese Diagnóstica:</strong> {existingConsultation.diagnosticHypothesis}</p>
          {existingConsultation.initialConduct && <p><strong>Conduta Inicial:</strong> {existingConsultation.initialConduct}</p>}
        </div>

        <div style={{ marginTop: 20, borderTop: '2px solid #e2e8f0', paddingTop: 15 }}>
          <h4>Evoluções / Reavaliações Médicas Sequenciais</h4>
          {existingConsultation.evolutions && existingConsultation.evolutions.length > 0 ? (
            <div style={{ marginBottom: 15 }}>
              {existingConsultation.evolutions.map((evo) => (
                <div key={evo.id} style={{ padding: 10, borderLeft: '4px solid #2563eb', backgroundColor: '#f8fafc', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {new Date(evo.createdAt).toLocaleString()} | Status: {evo.clinicalStatus || 'Estável'}
                  </div>
                  <div style={{ marginTop: 5 }}>{evo.evolutionText}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState className="p-4" title="Nenhuma evolução adicional registrada" />
          )}

          <form onSubmit={handleAddEvolution} style={{ display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: '#f8fafc', padding: 15, borderRadius: 6 }}>
            <h5>Adicionar Nova Evolução Médica</h5>
            <textarea
              value={evolutionText}
              onChange={(e) => setEvolutionText(e.target.value)}
              placeholder="Descreva a reavaliação ou evolução clínica do paciente..."
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              required
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 'bold' }}>Status Clínico:</label>
              <input
                type="text"
                value={clinicalStatus}
                onChange={(e) => setClinicalStatus(e.target.value)}
                placeholder="Ex.: estável, em melhora"
                style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Adicionar Evolução
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitConsultation}>
      <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
        <legend><strong>1. Anamnese Médica</strong></legend>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="chiefComplaint" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Queixa Principal *</label>
          <input
            id="chiefComplaint"
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Queixa relatada pelo paciente"
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="historyPresentIllness" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>História da Moléstia Atual (HMA) *</label>
          <textarea
            id="historyPresentIllness"
            value={historyPresentIllness}
            onChange={(e) => setHistoryPresentIllness(e.target.value)}
            rows={4}
            placeholder="Detalhamento cronológico da evolução dos sintomas..."
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Antecedentes Pessoais / Comorbidades</label>
            <textarea
              value={pastMedicalHistory}
              onChange={(e) => setPastMedicalHistory(e.target.value)}
              rows={2}
              placeholder="HAS, DM, Cirurgias anteriores..."
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Revisão de Sistemas</label>
            <textarea
              value={systemReview}
              onChange={(e) => setSystemReview(e.target.value)}
              rows={2}
              placeholder="Sintomas gerais por aparelhos..."
              style={{ width: '100%', padding: 8 }}
            />
          </div>
        </div>
      </fieldset>

      <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
        <legend><strong>2. Exame Físico</strong></legend>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="generalExam" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Exame Físico Geral *</label>
          <textarea
            id="generalExam"
            value={generalExam}
            onChange={(e) => setGeneralExam(e.target.value)}
            rows={2}
            placeholder="BEG, acianótico, anictérico, corado, hidratado..."
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13 }}>Aparelho Cardiovascular</label>
            <input
              type="text"
              value={cvExam}
              onChange={(e) => setCvExam(e.target.value)}
              placeholder="RCR 2T BNF sem sopros"
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13 }}>Aparelho Respiratório</label>
            <input
              type="text"
              value={respExam}
              onChange={(e) => setRespExam(e.target.value)}
              placeholder="MV+ sem ruídos adventícios"
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13 }}>Abdômen</label>
            <input
              type="text"
              value={abdExam}
              onChange={(e) => setAbdExam(e.target.value)}
              placeholder="Atípico, RHA+, flácido, indolor"
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13 }}>Neurológico</label>
            <input
              type="text"
              value={neuroExam}
              onChange={(e) => setNeuroExam(e.target.value)}
              placeholder="Consciente, orientado, sem déficits"
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13 }}>Membros / Extremidades</label>
            <input
              type="text"
              value={extExam}
              onChange={(e) => setExtExam(e.target.value)}
              placeholder="Sem edemas, pulsos presentes e simétricos"
              style={{ width: '100%', padding: 6 }}
            />
          </div>
        </div>
      </fieldset>

      <fieldset style={{ marginBottom: 15, padding: 15, borderRadius: 6, borderColor: '#ddd' }}>
        <legend><strong>3. Hipótese Diagnóstica & Conduta</strong></legend>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="diagnosticHypothesis" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Hipótese Diagnóstica Clínica *</label>
          <input
            id="diagnosticHypothesis"
            type="text"
            value={diagnosticHypothesis}
            onChange={(e) => setDiagnosticHypothesis(e.target.value)}
            placeholder="Hipótese clínica formulada pelo médico"
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Plano de Conduta Inicial</label>
          <textarea
            value={initialConduct}
            onChange={(e) => setInitialConduct(e.target.value)}
            rows={2}
            placeholder="Orientação, medicação sintomática, exames..."
            style={{ width: '100%', padding: 8 }}
          />
        </div>
      </fieldset>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
        >
          Registrar Consulta Médica
        </button>
      </div>
    </form>
  );
};
