import React from 'react';
import type { Prescription, RouteOfAdministration } from '../../../lib/prescriptions-api.js';
import { MedicationSearchInput } from '../../../components/MedicationSearchInput.js';
import type { PrescriptionsForm } from '../hooks/usePrescriptions.js';
import { EmptyState } from '../../../components/ui/empty-state.js';

interface Props {
  prescriptions: readonly Prescription[];
  form: PrescriptionsForm;
}

export const PrescricoesTab: React.FC<Props> = ({ prescriptions, form }) => {
  const {
    prescriptionItems,
    selectedMedication, setSelectedMedication,
    itemDose, setItemDose,
    itemDoseUnit, setItemDoseUnit,
    itemRoute, setItemRoute,
    itemFrequency, setItemFrequency,
    itemDuration, setItemDuration,
    itemInstructions, setItemInstructions,
    overrideJustification, setOverrideJustification,
    showAllergyModal,
    allergyModalMessage,
    cancelingPrescId, setCancelingPrescId,
    cancelReason, setCancelReason,
    submitting,
    handleAddItemToPrescription,
    handleRemovePrescriptionItem,
    handleCreatePrescription,
    handleCancelPrescription,
  } = form;

  return (
    <div style={{ marginTop: 20, borderTop: '2px solid #16a34a', paddingTop: 15, marginBottom: 20 }}>
      <h4 style={{ color: '#15803d' }}>Prescrição Médica Estruturada & Alertas de Alergia (MEDC-001..019)</h4>

      <div style={{ marginBottom: 15 }}>
        <h5>Prescrições Registradas no Atendimento</h5>
        {prescriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {prescriptions.map((presc) => (
              <div
                key={presc.id}
                style={{
                  padding: 15,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: presc.status === 'canceled' ? '#f1f5f9' : '#f0fdf4',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>Prescrição Médica #{presc.id.substring(0, 8)}</strong>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>
                      {new Date(presc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 'bold',
                      backgroundColor: presc.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: presc.status === 'active' ? '#166534' : '#991b1b',
                    }}
                  >
                    {presc.status === 'active' ? 'Ativa' : 'Cancelada'}
                  </span>
                </div>

                {presc.alerts && presc.alerts.length > 0 && (
                  <div style={{ marginBottom: 10, padding: 8, backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4 }}>
                    <strong style={{ color: '#b91c1c', fontSize: 12 }}>⚠️ Alerta de Alergia Sobreposto com Justificativa:</strong>
                    {presc.alerts.map((a) => (
                      <div key={a.id} style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                        • Alérgeno: <strong>{a.allergen}</strong> | Motivo médico: <em>"{a.overrideReason}"</em>
                      </div>
                    ))}
                  </div>
                )}

                {presc.items && presc.items.length > 0 && (
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 10 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: 6 }}>Medicamento</th>
                        <th style={{ padding: 6 }}>Dose</th>
                        <th style={{ padding: 6 }}>Via</th>
                        <th style={{ padding: 6 }}>Frequência</th>
                        <th style={{ padding: 6 }}>Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presc.items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: 6, fontWeight: 'bold' }}>{item.medicationName}</td>
                          <td style={{ padding: 6 }}>{item.dose} {item.doseUnit}</td>
                          <td style={{ padding: 6 }}>{item.route}</td>
                          <td style={{ padding: 6 }}>{item.frequency}</td>
                          <td style={{ padding: 6 }}>{item.duration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {presc.status === 'active' && (
                  <div>
                    {cancelingPrescId === presc.id ? (
                      <div style={{ marginTop: 8, padding: 10, backgroundColor: '#fff1f2', borderRadius: 4 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#9f1239' }}>Motivo do cancelamento *</label>
                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Informe o motivo médico do cancelamento..."
                          style={{ width: '100%', padding: 6, margin: '4px 0 8px 0', borderRadius: 4, border: '1px solid #ccc' }}
                          required
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleCancelPrescription(presc.id)}
                            style={{ padding: '4px 10px', backgroundColor: '#e11d48', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Confirmar Cancelamento
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelingPrescId(null)}
                            style={{ padding: '4px 10px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelingPrescId(presc.id);
                          setCancelReason('');
                        }}
                        style={{ padding: '4px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                      >
                        Cancelar Prescrição
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState className="p-4" title="Nenhuma prescrição registrada para este atendimento" />
        )}
      </div>

      {/* Formulário de nova prescrição médica */}
      <form onSubmit={handleCreatePrescription} style={{ backgroundColor: '#f0fdf4', padding: 15, borderRadius: 6, border: '1px solid #bbf7d0' }}>
        <h5 style={{ margin: '0 0 10px 0', color: '#15803d' }}>Nova Prescrição Médica</h5>

        <div style={{ marginBottom: 15, padding: 10, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <h6 style={{ margin: '0 0 8px 0' }}>Adicionar Medicamento à Prescrição</h6>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Medicamento *</label>
            <MedicationSearchInput
              selectedItem={selectedMedication}
              onSelect={(item) => {
                setSelectedMedication(item);
                if (item.defaultRoute) setItemRoute(item.defaultRoute);
              }}
              onClear={() => setSelectedMedication(null)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Dose *</label>
              <input
                type="number"
                step="any"
                value={itemDose}
                onChange={(e) => setItemDose(Number.parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Unidade *</label>
              <input
                type="text"
                value={itemDoseUnit}
                onChange={(e) => setItemDoseUnit(e.target.value)}
                placeholder="mg, ml, gotas"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Via *</label>
              <select
                value={itemRoute}
                onChange={(e) => setItemRoute(e.target.value as RouteOfAdministration)}
                style={{ width: '100%', padding: 6 }}
              >
                <option value="VO">VO (Via Oral)</option>
                <option value="EV">EV (Endovenoso)</option>
                <option value="IM">IM (Intramuscular)</option>
                <option value="SC">SC (Subcutâneo)</option>
                <option value="SL">SL (Sublingual)</option>
                <option value="Inalatoria">Inalatória</option>
                <option value="Topica">Tópica</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Frequência *</label>
              <input
                type="text"
                value={itemFrequency}
                onChange={(e) => setItemFrequency(e.target.value)}
                placeholder="6/6h, 12/12h"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12 }}>Duração</label>
              <input
                type="text"
                value={itemDuration}
                onChange={(e) => setItemDuration(e.target.value)}
                placeholder="Ex: 7 dias, dose única"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: 12 }}>Orientações</label>
              <input
                type="text"
                value={itemInstructions}
                onChange={(e) => setItemInstructions(e.target.value)}
                placeholder="Ex: Tomar após as refeições"
                style={{ width: '100%', padding: 6 }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItemToPrescription}
            style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            + Adicionar Item à Lista
          </button>
        </div>

        {/* Lista temporária de itens adicionados */}
        {prescriptionItems.length > 0 && (
          <div style={{ marginBottom: 15 }}>
            <h6>Itens a Prescrever ({prescriptionItems.length})</h6>
            <ul style={{ paddingLeft: 20 }}>
              {prescriptionItems.map((item, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  <strong>{item.medicationName}</strong> - {item.dose} {item.doseUnit} via {item.route} ({item.frequency})
                  <button
                    type="button"
                    onClick={() => handleRemovePrescriptionItem(idx)}
                    style={{ marginLeft: 10, color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    [Remover]
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showAllergyModal && (
          <div style={{ padding: 12, backgroundColor: '#fff1f2', border: '2px solid #e11d48', borderRadius: 6, marginBottom: 15 }}>
            <h5 style={{ color: '#9f1239', margin: '0 0 6px 0' }}>🚨 Alerta Crítico de Alergia do Paciente</h5>
            <p style={{ color: '#881337', fontSize: 13, margin: '0 0 10px 0' }}>{allergyModalMessage}</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#9f1239' }}>Justificativa Médica de Sobreposição (Mínimo 10 caracteres) *</label>
            <textarea
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              rows={2}
              placeholder="Descreva detalhadamente a justificativa técnica médica para prescrever o medicamento..."
              style={{ width: '100%', padding: 8, margin: '4px 0 10px 0', borderRadius: 4, border: '1px solid #fda4af' }}
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || prescriptionItems.length === 0}
          style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
        >
          Emitir Prescrição Médica
        </button>
      </form>
    </div>
  );
};
