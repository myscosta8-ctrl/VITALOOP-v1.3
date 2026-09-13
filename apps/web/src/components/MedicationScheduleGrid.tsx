import React from 'react';
import { MedicationScheduleData } from '../lib/nursing-api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { EmptyState } from './ui/empty-state.js';

interface MedicationScheduleGridProps {
  schedules: MedicationScheduleData[];
  onSelectScheduleForAdmin: (schedule: MedicationScheduleData) => void;
  onSchedulePrescription?: () => void;
  disabled?: boolean;
}

export const MedicationScheduleGrid: React.FC<MedicationScheduleGridProps> = ({
  schedules,
  onSelectScheduleForAdmin,
  onSchedulePrescription,
  disabled = false,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'administered':
        return <Badge variant="success">Administrado</Badge>;
      case 'refused':
        return <Badge variant="warning">Recusado</Badge>;
      case 'not_administered':
        return <Badge variant="destructive">Não Administrado</Badge>;
      case 'suspended':
        return <Badge variant="outline">Suspenso</Badge>;
      default:
        return <Badge>Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Grade de Aprazamento e Checagem Beira-Leito (MEDC-009..011)</CardTitle>
        {onSchedulePrescription && (
          <Button type="button" size="sm" variant="secondary" onClick={onSchedulePrescription} disabled={disabled}>
            Aprazar Prescrição Ativa
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {schedules.length === 0 ? (
          <EmptyState
            title="Nenhum horário aprazado para este atendimento."
            description='Clique em "Aprazar Prescrição Ativa" para gerar a grade a partir da prescrição vigente.'
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {schedules.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-foreground">{s.medicationName}</h4>
                    <p className="text-xs text-muted-foreground">
                      Dose: {s.dose} {s.doseUnit} | Via: {s.route} | Freq: {s.frequency}
                    </p>
                  </div>
                  {getStatusBadge(s.status)}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                  <span className="text-sm text-foreground">
                    Horário:{' '}
                    <strong>{new Date(s.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                  {s.status === 'pending' && (
                    <Button type="button" size="sm" onClick={() => onSelectScheduleForAdmin(s)} disabled={disabled}>
                      Checar &amp; Administrar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
