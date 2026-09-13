import React from 'react';
import type { BedData } from '../../../lib/bed-api.js';
import type { Admission, AdmissionStatus } from '../../../lib/admission-api.js';
import type { AdmissionForm } from '../hooks/useAdmission.js';
import { Card, CardContent } from '../../../components/ui/card.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Textarea } from '../../../components/ui/textarea.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

interface Props {
  bedInfo: BedData | null;
  admission: Admission | null;
  form: AdmissionForm;
}

const DISCHARGE_STATUS_LABEL: Record<Extract<AdmissionStatus, 'discharged' | 'transferred_out' | 'deceased'>, string> = {
  discharged: 'Alta hospitalar',
  transferred_out: 'Transferência para outra unidade',
  deceased: 'Óbito',
};

export const InternacaoTab: React.FC<Props> = ({ bedInfo, admission, form }) => {
  const {
    diagnosisCode, setDiagnosisCode,
    diagnosisDescription, setDiagnosisDescription,
    justification, setJustification,
    evolutionJustification, setEvolutionJustification,
    dischargeStatus, setDischargeStatus,
    dischargeReason, setDischargeReason,
    submitting,
    handleAdmit,
    handleEvolve,
    handleDischarge,
  } = form;

  const isActiveAdmission = admission?.status === 'active';

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Internação (ADM-001..008)</h4>

      {bedInfo && (
        <Card>
          <CardContent className="space-y-1 pt-6 text-sm">
            <p><strong>Setor:</strong> {bedInfo.sectorName ?? '—'}</p>
            <p><strong>Leito:</strong> {bedInfo.bedNumber} {bedInfo.isIsolation && '(Isolamento)'}</p>
            {bedInfo.allocatedAt && (
              <p><strong>Alocado em:</strong> {new Date(bedInfo.allocatedAt).toLocaleString('pt-BR')}</p>
            )}
            {bedInfo.stayHours !== undefined && (
              <p>
                <strong>Permanência:</strong> {bedInfo.stayHours}h{' '}
                {bedInfo.is24hLimitExceeded && '⚠️ Estouro de 24h!'}
              </p>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-2">
              <a href="#/leitos">Ver Mapa de Leitos</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {isActiveAdmission && admission ? (
        <Card className="border-2 border-[var(--color-warning)]">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-base text-foreground">Paciente Internado</strong>
              <Badge variant="warning">ATIVA</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>Diagnóstico de admissão:</strong> {admission.admissionDiagnosisDescription}{admission.admissionDiagnosisCode ? ` (${admission.admissionDiagnosisCode})` : ''}</p>
              <p><strong>Justificativa:</strong> {admission.admissionJustification}</p>
              <p><strong>Internado desde:</strong> {new Date(admission.admittedAt).toLocaleString('pt-BR')}</p>
            </div>

            <form onSubmit={handleEvolve} className="space-y-2 border-t border-[var(--color-warning)]/40 pt-3">
              <Label className="text-xs">Evolução da Internação</Label>
              <Textarea
                value={evolutionJustification}
                onChange={(e) => setEvolutionJustification(e.target.value)}
                rows={2}
                placeholder="Nova justificativa/evolução clínica do quadro de internação..."
              />
              <Button type="submit" disabled={submitting || evolutionJustification.trim().length < 10}>
                Registrar Evolução
              </Button>
            </form>

            <form onSubmit={handleDischarge} className="space-y-2 border-t border-[var(--color-warning)]/40 pt-3">
              <Label className="text-xs">Encerrar Internação</Label>
              <Select value={dischargeStatus} onChange={(e) => setDischargeStatus(e.target.value as typeof dischargeStatus)}>
                {(Object.keys(DISCHARGE_STATUS_LABEL) as Array<keyof typeof DISCHARGE_STATUS_LABEL>).map((key) => (
                  <option key={key} value={key}>{DISCHARGE_STATUS_LABEL[key]}</option>
                ))}
              </Select>
              {dischargeStatus === 'deceased' && (
                <Textarea
                  value={dischargeReason}
                  onChange={(e) => setDischargeReason(e.target.value)}
                  rows={2}
                  placeholder="Causa/circunstância do óbito (obrigatório)..."
                />
              )}
              <Button type="submit" variant="destructive" disabled={submitting}>
                Encerrar Internação
              </Button>
              <p className="text-xs text-muted-foreground">
                Isso encerra o registro de internação. Pra concluir o atendimento (status "Concluído"),
                registre o desfecho na aba "Desfecho" em seguida.
              </p>
            </form>
          </CardContent>
        </Card>
      ) : bedInfo ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h5 className="text-sm font-semibold text-foreground">Internar Paciente</h5>
            <form onSubmit={handleAdmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código CID-10 (opcional)</Label>
                <Input
                  type="text"
                  value={diagnosisCode}
                  onChange={(e) => setDiagnosisCode(e.target.value)}
                  placeholder="Ex: J18.9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Diagnóstico de Admissão *</Label>
                <Input
                  type="text"
                  value={diagnosisDescription}
                  onChange={(e) => setDiagnosisDescription(e.target.value)}
                  placeholder="Ex: Pneumonia bacteriana grave"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Justificativa Clínica de Internação *</Label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={2}
                  placeholder="Motivo clínico pelo qual o paciente precisa permanecer internado..."
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || diagnosisDescription.trim().length < 3 || justification.trim().length < 10}
              >
                Internar Paciente
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum leito alocado para este atendimento. Aloque um leito no{' '}
          <a href="#/leitos" className="underline">Mapa de Leitos</a> antes de internar — a internação exige leito ativo
          (regra aplicada também no banco).
        </p>
      )}
    </div>
  );
};
