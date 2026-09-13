import React from 'react';
import type { EncounterOutcome, EncounterSummary, OutcomeType } from '../../../lib/outcomes-api.js';
import { MedicalSummaryView } from '../../../components/MedicalSummaryView.js';
import type { OutcomeForm } from '../hooks/useOutcome.js';
import { Card, CardContent } from '../../../components/ui/card.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Textarea } from '../../../components/ui/textarea.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

interface Props {
  outcome: EncounterOutcome | null;
  summary: EncounterSummary | null;
  form: OutcomeForm;
}

export const DesfechoTab: React.FC<Props> = ({ outcome, summary, form }) => {
  const {
    selectedOutcomeType, setSelectedOutcomeType,
    outcomeNotes, setOutcomeNotes,
    destinationUnit, setDestinationUnit,
    dischargeInstructions, setDischargeInstructions,
    causeMortisA, setCauseMortisA,
    causeMortisB, setCauseMortisB,
    causeMortisC, setCauseMortisC,
    causeMortisD, setCauseMortisD,
    deathManner, setDeathManner,
    declarantName, setDeclarantName,
    declarantDocument, setDeclarantDocument,
    submitting,
    handleCreateOutcome,
  } = form;

  return (
    <div className="space-y-4 border-t-4 border-foreground pt-4">
      <h4 className="text-sm font-semibold text-foreground">Encerramento do Atendimento &amp; Sumário de Alta (OUT-001..014)</h4>

      {outcome ? (
        <Card className="border-2 border-foreground">
          <CardContent className="space-y-2.5 pt-6">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-base text-foreground">Atendimento Encerrado — Desfecho Assistencial</strong>
              <Badge variant="success">{outcome.outcomeType.toUpperCase()}</Badge>
            </div>
            {outcome.notes && <div className="text-sm text-muted-foreground"><strong>Observações:</strong> {outcome.notes}</div>}
            {outcome.destinationUnit && <div className="text-sm text-muted-foreground"><strong>Unidade de Destino:</strong> {outcome.destinationUnit}</div>}
            {outcome.deathCertificateData && (
              <div className="text-sm text-muted-foreground">
                <strong>Declaração de Óbito:</strong> Causa Mortis A: {outcome.deathCertificateData.causeMortisA}
                {outcome.deathCertificateData.causeMortisB && ` | B: ${outcome.deathCertificateData.causeMortisB}`}
                {outcome.deathCertificateData.causeMortisC && ` | C: ${outcome.deathCertificateData.causeMortisC}`}
                {outcome.deathCertificateData.causeMortisD && ` | D: ${outcome.deathCertificateData.causeMortisD}`}
                {' '}— Circunstância: {outcome.deathCertificateData.deathManner}
              </div>
            )}

            {summary && <MedicalSummaryView summary={summary} patientName="Paciente UPA" />}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h5 className="text-sm font-semibold text-foreground">Registrar Desfecho Assistencial</h5>
            <form onSubmit={handleCreateOutcome} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo de Desfecho Assistencial *</Label>
                <Select value={selectedOutcomeType} onChange={(e) => setSelectedOutcomeType(e.target.value as OutcomeType)}>
                  <option value="medical_discharge">Alta Médica com Orientações (Exige CID-10 Principal)</option>
                  <option value="discharge_against_medical_advice">Alta a Pedido (Exige Justificativa em Notas)</option>
                  <option value="administrative_discharge">Alta Administrativa</option>
                  <option value="transfer">Transferência Externa Regulada (Exige Unidade de Destino)</option>
                  <option value="admission_bed">Internação / Permanência em Leito UPA</option>
                  <option value="evasion">Evasão / Saída Não Autorizada</option>
                  <option value="death">Óbito (Exige Timestamp e Causa em Notas)</option>
                </Select>
              </div>

              {selectedOutcomeType === 'transfer' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidade Hospitalar de Destino *</Label>
                  <Input
                    type="text"
                    value={destinationUnit}
                    onChange={(e) => setDestinationUnit(e.target.value)}
                    placeholder="Ex: Hospital Regional de Referência / Santa Casa"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Orientações Médicas de Alta / Prescrição Domiciliar</Label>
                <Textarea
                  value={dischargeInstructions}
                  onChange={(e) => setDischargeInstructions(e.target.value)}
                  rows={2}
                  placeholder="Orientações de cuidados, sinais de alarme, receitas..."
                />
              </div>

              {selectedOutcomeType === 'death' && (
                <div className="space-y-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <h5 className="text-sm font-semibold text-[var(--color-danger)]">Declaração de Óbito — Causa Mortis (Bloco V)</h5>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Causa Mortis A — Causa Terminal *</Label>
                    <Input
                      type="text"
                      value={causeMortisA}
                      onChange={(e) => setCauseMortisA(e.target.value)}
                      placeholder="Causa imediata da morte"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Causa Mortis B (antecedente)</Label>
                    <Input type="text" value={causeMortisB} onChange={(e) => setCauseMortisB(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Causa Mortis C (antecedente)</Label>
                    <Input type="text" value={causeMortisC} onChange={(e) => setCauseMortisC(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Causa Mortis D (causa básica)</Label>
                    <Input type="text" value={causeMortisD} onChange={(e) => setCauseMortisD(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Circunstância do Óbito *</Label>
                    <Select value={deathManner} onChange={(e) => setDeathManner(e.target.value as typeof deathManner)}>
                      <option value="natural">Natural</option>
                      <option value="violent">Violento (causa externa)</option>
                      <option value="undetermined">Indeterminado</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Declarante</Label>
                      <Input type="text" value={declarantName} onChange={(e) => setDeclarantName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Documento do Declarante</Label>
                      <Input type="text" value={declarantDocument} onChange={(e) => setDeclarantDocument(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Observações / Motivo / Justificativa *</Label>
                <Textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={2}
                  placeholder="Observações do desfecho assistencial..."
                />
              </div>

              <Button type="submit" disabled={submitting}>
                Concluir Atendimento e Emitir Sumário de Alta
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
