import React from 'react';
import type { Prescription, RouteOfAdministration } from '../../../lib/prescriptions-api.js';
import { MedicationSearchInput } from '../../../components/MedicationSearchInput.js';
import type { PrescriptionsForm } from '../hooks/usePrescriptions.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Card, CardContent } from '../../../components/ui/card.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Textarea } from '../../../components/ui/textarea.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

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
    <div className="space-y-5">
      <h4 className="text-sm font-semibold text-foreground">Prescrição Médica Estruturada &amp; Alertas de Alergia (MEDC-001..019)</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-semibold text-foreground">Prescrições Registradas no Atendimento</h5>
        {prescriptions.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {prescriptions.map((presc) => (
              <div
                key={presc.id}
                className={`rounded-md border border-border p-4 ${presc.status === 'canceled' ? 'bg-muted/40' : 'bg-[var(--color-success-soft)]/40'}`}
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-[15px] text-foreground">Prescrição Médica #{presc.id.substring(0, 8)}</strong>
                    <span className="ml-2.5 text-xs text-muted-foreground">
                      {new Date(presc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Badge variant={presc.status === 'active' ? 'success' : 'destructive'}>
                    {presc.status === 'active' ? 'Ativa' : 'Cancelada'}
                  </Badge>
                </div>

                {presc.alerts && presc.alerts.length > 0 && (
                  <div className="mb-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-2">
                    <strong className="text-xs text-[var(--color-danger)]">⚠️ Alerta de Alergia Sobreposto com Justificativa:</strong>
                    {presc.alerts.map((a) => (
                      <div key={a.id} className="mt-0.5 text-xs text-[var(--color-danger)]">
                        • Alérgeno: <strong>{a.allergen}</strong> | Motivo médico: <em>"{a.overrideReason}"</em>
                      </div>
                    ))}
                  </div>
                )}

                {presc.items && presc.items.length > 0 && (
                  <table className="mb-2.5 w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-muted text-xs uppercase text-muted-foreground">
                        <th className="p-1.5 font-medium">Medicamento</th>
                        <th className="p-1.5 font-medium">Dose</th>
                        <th className="p-1.5 font-medium">Via</th>
                        <th className="p-1.5 font-medium">Frequência</th>
                        <th className="p-1.5 font-medium">Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presc.items.map((item) => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="p-1.5 font-semibold text-foreground">{item.medicationName}</td>
                          <td className="p-1.5">{item.dose} {item.doseUnit}</td>
                          <td className="p-1.5">{item.route}</td>
                          <td className="p-1.5">{item.frequency}</td>
                          <td className="p-1.5">{item.duration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {presc.status === 'active' && (
                  <div>
                    {cancelingPrescId === presc.id ? (
                      <div className="mt-2 space-y-2 rounded-md bg-destructive/10 p-2.5">
                        <Label className="text-xs text-[var(--color-danger)]">Motivo do cancelamento *</Label>
                        <Input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Informe o motivo médico do cancelamento..."
                          required
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="destructive" onClick={() => handleCancelPrescription(presc.id)}>
                            Confirmar Cancelamento
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setCancelingPrescId(null)}>
                            Voltar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setCancelingPrescId(presc.id);
                          setCancelReason('');
                        }}
                      >
                        Cancelar Prescrição
                      </Button>
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

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h5 className="text-sm font-semibold text-foreground">Nova Prescrição Médica</h5>

          <form onSubmit={handleCreatePrescription} className="space-y-4">
            <div className="space-y-3 rounded-md border border-border p-3">
              <h6 className="text-sm font-semibold text-foreground">Adicionar Medicamento à Prescrição</h6>
              <div className="space-y-1.5">
                <Label className="text-xs">Medicamento *</Label>
                <MedicationSearchInput
                  selectedItem={selectedMedication}
                  onSelect={(item) => {
                    setSelectedMedication(item);
                    if (item.defaultRoute) setItemRoute(item.defaultRoute);
                  }}
                  onClear={() => setSelectedMedication(null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal">Dose *</Label>
                  <Input
                    type="number"
                    step="any"
                    value={itemDose}
                    onChange={(e) => setItemDose(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal">Unidade *</Label>
                  <Input
                    type="text"
                    value={itemDoseUnit}
                    onChange={(e) => setItemDoseUnit(e.target.value)}
                    placeholder="mg, ml, gotas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal">Via *</Label>
                  <Select value={itemRoute} onChange={(e) => setItemRoute(e.target.value as RouteOfAdministration)}>
                    <option value="VO">VO (Via Oral)</option>
                    <option value="EV">EV (Endovenoso)</option>
                    <option value="IM">IM (Intramuscular)</option>
                    <option value="SC">SC (Subcutâneo)</option>
                    <option value="SL">SL (Sublingual)</option>
                    <option value="Inalatoria">Inalatória</option>
                    <option value="Topica">Tópica</option>
                    <option value="Outra">Outra</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal">Frequência *</Label>
                  <Input
                    type="text"
                    value={itemFrequency}
                    onChange={(e) => setItemFrequency(e.target.value)}
                    placeholder="6/6h, 12/12h"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal">Duração</Label>
                  <Input
                    type="text"
                    value={itemDuration}
                    onChange={(e) => setItemDuration(e.target.value)}
                    placeholder="Ex: 7 dias, dose única"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-normal">Orientações</Label>
                  <Input
                    type="text"
                    value={itemInstructions}
                    onChange={(e) => setItemInstructions(e.target.value)}
                    placeholder="Ex: Tomar após as refeições"
                  />
                </div>
              </div>

              <Button type="button" size="sm" variant="secondary" onClick={handleAddItemToPrescription}>
                + Adicionar Item à Lista
              </Button>
            </div>

            {prescriptionItems.length > 0 && (
              <div className="space-y-1.5">
                <h6 className="text-sm font-semibold text-foreground">Itens a Prescrever ({prescriptionItems.length})</h6>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {prescriptionItems.map((item, idx) => (
                    <li key={idx}>
                      <strong>{item.medicationName}</strong> - {item.dose} {item.doseUnit} via {item.route} ({item.frequency})
                      <button
                        type="button"
                        onClick={() => handleRemovePrescriptionItem(idx)}
                        className="ml-2.5 border-0 bg-transparent text-[var(--color-danger)] hover:underline"
                      >
                        [Remover]
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showAllergyModal && (
              <div className="space-y-2 rounded-md border-2 border-destructive bg-destructive/10 p-3">
                <h5 className="text-sm font-semibold text-[var(--color-danger)]">🚨 Alerta Crítico de Alergia do Paciente</h5>
                <p className="text-xs text-[var(--color-danger)]">{allergyModalMessage}</p>
                <Label className="text-xs text-[var(--color-danger)]">
                  Justificativa Médica de Sobreposição (Mínimo 10 caracteres) *
                </Label>
                <Textarea
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  rows={2}
                  placeholder="Descreva detalhadamente a justificativa técnica médica para prescrever o medicamento..."
                  required
                />
              </div>
            )}

            <Button type="submit" disabled={submitting || prescriptionItems.length === 0}>
              Emitir Prescrição Médica
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
