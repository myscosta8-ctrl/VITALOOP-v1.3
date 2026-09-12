import React from 'react';
import type { EncounterDiagnosis, DiagnosisType } from '../../../lib/diagnoses-api.js';
import { CidSearchInput } from '../../../components/CidSearchInput.js';
import type { DiagnosesForm } from '../hooks/useDiagnoses.js';
import { EmptyState } from '../../../components/ui/empty-state.js';

interface Props {
  diagnoses: readonly EncounterDiagnosis[];
  form: DiagnosesForm;
}

export const DiagnosticosTab: React.FC<Props> = ({ diagnoses, form }) => {
  const {
    selectedCid, setSelectedCid,
    diagType, setDiagType,
    diagNotes, setDiagNotes,
    refutingDiagId, setRefutingDiagId,
    refutationNotes, setRefutationNotes,
    submitting,
    handleAddDiagnosis,
    handleUpdateDiagnosisStatus,
  } = form;

  return (
    <div style={{ marginTop: 20, borderTop: '2px solid #2563eb', paddingTop: 15, marginBottom: 20 }}>
      <h4 style={{ color: '#1e40af' }}>Diagnósticos Clínicos e Catálogo CID-10 (MED-005, MED-006)</h4>

      <div style={{ marginBottom: 15 }}>
        <h5>Diagnósticos Registrados no Atendimento</h5>
        {diagnoses.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diagnoses.map((diag) => (
              <div
                key={diag.id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  borderLeft: diag.diagnosisType === 'principal' ? '6px solid #dc2626' : '6px solid #64748b',
                  backgroundColor: diag.status === 'refuted' ? '#fecdd3' : '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        marginRight: 8,
                        backgroundColor: diag.diagnosisType === 'principal' ? '#fee2e2' : '#e2e8f0',
                        color: diag.diagnosisType === 'principal' ? '#991b1b' : '#334155',
                      }}
                    >
                      {diag.diagnosisType === 'principal' ? 'Diagnóstico Principal' : 'Diagnóstico Secundário'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: 15 }}>[{diag.cidCode}]</strong>{' '}
                    <span style={{ fontSize: 14 }}>{diag.cidDescription || ''}</span>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 'bold',
                      backgroundColor: diag.status === 'active' ? '#dcfce7' : diag.status === 'resolved' ? '#e0f2fe' : '#ffe4e6',
                      color: diag.status === 'active' ? '#166534' : diag.status === 'resolved' ? '#0369a1' : '#9f1239',
                    }}
                  >
                    {diag.status === 'active' ? 'Ativo' : diag.status === 'resolved' ? 'Resolvido' : 'Refutado'}
                  </span>
                </div>
                {diag.notes && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Nota: {diag.notes}</div>}

                {diag.status === 'active' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 12 }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateDiagnosisStatus(diag.id, 'resolved')}
                      style={{ padding: '3px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Marcar Resolvido
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRefutingDiagId(diag.id);
                        setRefutationNotes('');
                      }}
                      style={{ padding: '3px 8px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Refutar Diagnóstico
                    </button>
                  </div>
                )}

                {refutingDiagId === diag.id && (
                  <div style={{ marginTop: 8, padding: 10, backgroundColor: '#fff1f2', borderRadius: 4, border: '1px solid #fda4af' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#9f1239' }}>Justificativa médica para refutar *</label>
                    <input
                      type="text"
                      value={refutationNotes}
                      onChange={(e) => setRefutationNotes(e.target.value)}
                      placeholder="Descreva o motivo clínico da refutação..."
                      style={{ width: '100%', padding: 6, margin: '4px 0 8px 0', borderRadius: 4, border: '1px solid #ccc' }}
                      required
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateDiagnosisStatus(diag.id, 'refuted')}
                        style={{ padding: '4px 10px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Confirmar Refutação
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefutingDiagId(null)}
                        style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhum diagnóstico CID-10 vinculado a este atendimento" />
        )}
      </div>

      <form onSubmit={handleAddDiagnosis} style={{ backgroundColor: '#eff6ff', padding: 15, borderRadius: 6, border: '1px solid #bfdbfe' }}>
        <h5 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>Adicionar Novo Diagnóstico CID-10</h5>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Pesquisar CID-10 *</label>
          <CidSearchInput
            selectedItem={selectedCid}
            onSelect={(item) => setSelectedCid(item)}
            onClear={() => setSelectedCid(null)}
          />
        </div>

        <div style={{ display: 'flex', gap: 15, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Tipo de Diagnóstico</label>
            <select
              value={diagType}
              onChange={(e) => setDiagType(e.target.value as DiagnosisType)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            >
              <option value="principal">Diagnóstico Principal (Único ativo)</option>
              <option value="secondary">Diagnóstico Secundário / Comórbido</option>
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Observações / Notas</label>
            <input
              type="text"
              value={diagNotes}
              onChange={(e) => setDiagNotes(e.target.value)}
              placeholder="Notas complementares sobre o diagnóstico..."
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '8px 16px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
        >
          Vincular Diagnóstico CID-10
        </button>
      </form>
    </div>
  );
};
