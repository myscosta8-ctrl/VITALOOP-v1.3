import React from 'react';
import type { Triage, TriageDestinationType, TriageExamCategory, TriageProcedureKind } from '../../../lib/triages-api.js';
import type { ConsultationRoom } from '../../../lib/consultation-rooms-api.js';
import type { PatientAllergy } from '../../../lib/patients-api.js';
import { MANCHESTER_BADGE_STYLE } from '../../QueueDashboardPage.js';
import { Badge } from '../../../components/ui/badge.js';

interface Props {
  triage: Triage | null;
  rooms: readonly ConsultationRoom[];
  allergies: readonly PatientAllergy[];
}

// Bloco 6 — espelha os rótulos já usados em TriageOpenPage.tsx (Bloco 3/4);
// resumo da Triagem aqui é somente leitura (TRIAGEM ≠ CONSULTA MÉDICA — o
// médico não edita nada nesta aba).
const DESTINATION_TYPE_LABEL: Record<TriageDestinationType, string> = {
  medical_consultation: 'Atendimento médico',
  red_room: 'Sala Vermelha',
  exam: 'Exame',
  procedure: 'Procedimento',
};
const EXAM_CATEGORY_LABEL: Record<TriageExamCategory, string> = { laboratory: 'Laboratorial', imaging: 'Imagem' };
const PROCEDURE_KIND_LABEL: Record<TriageProcedureKind, string> = {
  dressing_change: 'Troca de curativo',
  urinary_catheter_change: 'Troca de SVD',
  other: 'Outro procedimento institucional',
};

export const TriagemTab: React.FC<Props> = ({ triage, rooms, allergies }) => {
  if (!triage) {
    return <p className="text-sm text-muted-foreground">Nenhuma triagem registrada para este atendimento.</p>;
  }

  const risk = MANCHESTER_BADGE_STYLE[triage.riskColor];
  const destType = triage.destination.type;
  const roomName = triage.destination.roomId ? rooms.find((r) => r.id === triage.destination.roomId)?.name : null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h4 className="mb-2 font-semibold">Queixa &amp; História (registrada na Triagem)</h4>
        <p className="text-sm"><strong className="text-foreground">Queixa principal:</strong> {triage.chiefComplaint}</p>
        {triage.history && <p className="mt-1 text-sm"><strong className="text-foreground">HDA:</strong> {triage.history}</p>}
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h4 className="mb-2 font-semibold">Classificação de Risco &amp; Sinais Vitais</h4>
        <div className="mb-2 flex items-center gap-3">
          <span className="font-semibold">Classificação Manchester:</span>
          <Badge style={{ color: risk.text, backgroundColor: risk.bg }}>{risk.label}</Badge>
        </div>
        {triage.vitals && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span><strong className="text-foreground">PA:</strong> {triage.vitals.systolicBp}/{triage.vitals.diastolicBp} mmHg</span>
            <span><strong className="text-foreground">FC:</strong> {triage.vitals.heartRate} bpm</span>
            <span><strong className="text-foreground">FR:</strong> {triage.vitals.respiratoryRate} ipm</span>
            <span><strong className="text-foreground">Temp:</strong> {triage.vitals.temperature} ºC</span>
            <span><strong className="text-foreground">SpO2:</strong> {triage.vitals.oxygenSaturation} %</span>
            {triage.painScore !== undefined && triage.painScore !== null && <span><strong className="text-foreground">Dor:</strong> {triage.painScore}/10</span>}
          </div>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h4 className="mb-1 font-semibold">Alergias</h4>
        {allergies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma alergia registrada.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {allergies.map((a) => (
              <li key={a.id}>{a.substance} {a.severity ? `— ${a.severity}` : ''}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-4">
        <h4 className="mb-1 font-semibold">Encaminhamento definido pela Triagem</h4>
        {destType ? (
          <p className="text-sm">
            <strong className="text-foreground">Destino:</strong> {DESTINATION_TYPE_LABEL[destType]}
            {destType === 'medical_consultation' && roomName ? ` — ${roomName}` : ''}
            {destType === 'exam' && triage.destination.examCategory ? ` — ${EXAM_CATEGORY_LABEL[triage.destination.examCategory]}` : ''}
            {destType === 'procedure' && triage.destination.procedureKind
              ? ` — ${triage.destination.procedureKind === 'other' && triage.destination.procedureOther ? triage.destination.procedureOther : PROCEDURE_KIND_LABEL[triage.destination.procedureKind]}`
              : ''}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Destino não definido.</p>
        )}
      </div>

      {triage.classificationHistory.length > 0 && (
        <div className="rounded-md border border-border bg-muted/40 p-4">
          <h4 className="mb-1 font-semibold">Histórico de Classificação</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {triage.classificationHistory.map((ev) => (
              <li key={ev.id}>
                {new Date(ev.classifiedAt).toLocaleString('pt-BR')} — <strong className="text-foreground">{MANCHESTER_BADGE_STYLE[ev.riskColor].label}</strong>
                {ev.reason ? ` (${ev.reason})` : ''} — {ev.professionalName ?? 'profissional'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {triage.destinationHistory.length > 0 && (
        <div className="rounded-md border border-border bg-muted/40 p-4">
          <h4 className="mb-1 font-semibold">Histórico de Encaminhamento</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {triage.destinationHistory.map((ev) => (
              <li key={ev.id}>
                {new Date(ev.setAt).toLocaleString('pt-BR')} — <strong className="text-foreground">{DESTINATION_TYPE_LABEL[ev.destinationType]}</strong>
                {ev.reason ? ` (${ev.reason})` : ''} — {ev.professionalName ?? 'profissional'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
