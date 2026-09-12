import React from 'react';
import type { Triage } from '../../../lib/triages-api.js';
import { MANCHESTER_BADGE_STYLE } from '../../QueueDashboardPage.js';
import { Badge } from '../../../components/ui/badge.js';

interface Props {
  triage: Triage | null;
}

export const TriagemTab: React.FC<Props> = ({ triage }) => {
  if (!triage) {
    return <p className="text-sm text-muted-foreground">Nenhuma triagem registrada para este atendimento.</p>;
  }

  const risk = MANCHESTER_BADGE_STYLE[triage.riskColor];

  return (
    <div className="rounded-md border border-border bg-muted/40 p-4">
      <h4 className="mb-2 font-semibold">Dados da Triagem & Sinais Vitais</h4>
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
          {triage.painScore !== undefined && <span><strong className="text-foreground">Dor:</strong> {triage.painScore}/10</span>}
        </div>
      )}
    </div>
  );
};
