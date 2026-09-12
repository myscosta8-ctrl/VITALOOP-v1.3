import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { createQualityApi } from '../lib/quality-api.js';
import { Card, CardContent, CardHeader } from './ui/card.js';
import { Button } from './ui/button.js';

export const DisasterRecoveryPanel: React.FC = () => {
  const { api } = useSession();
  const qualityApi = createQualityApi(api);

  const [msg, setMsg] = useState('');

  const backupMutation = useMutation({
    mutationFn: () => qualityApi.executeBackupRestoreJob('backup_logical'),
    onSuccess: (res) => setMsg(`Backup lógico executado com sucesso! Job ID: ${res.id} | Snapshot: ${res.snapshotHash}`),
    onError: (err: unknown) => setMsg((err as Error).message),
  });

  const restoreMutation = useMutation({
    mutationFn: () => qualityApi.executeBackupRestoreJob('restore_validation', 'SHA256-SNAP-99'),
    onSuccess: (res) => setMsg(`Validação de restore executada com sucesso! Status: ${res.status}`),
    onError: (err: unknown) => setMsg((err as Error).message),
  });

  const jobsMutation = useMutation({
    mutationFn: () => qualityApi.fetchBackupRestoreJobs(),
    onError: (err: unknown) => setMsg((err as Error).message),
  });

  const jobs = jobsMutation.data ?? [];

  return (
    <div data-testid="disaster-recovery-panel">
      <h2>Painel de Disaster Recovery, Backup & Restore (QLT-011..013)</h2>
      {msg && <p data-testid="dr-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      <Card>
        <CardHeader className="text-sm font-semibold text-muted-foreground">1. Execução de Backup Lógico (QLT-011)</CardHeader>
        <CardContent>
          <Button type="button" onClick={() => backupMutation.mutate()} data-testid="run-backup-btn">
            Executar Backup Lógico do Banco
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="text-sm font-semibold text-muted-foreground">2. Validação de Restore & Integridade (QLT-012)</CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={() => restoreMutation.mutate()} data-testid="run-restore-btn">
            Validar Restore de Backup
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="text-sm font-semibold text-muted-foreground">3. Histórico e Métricas de Disaster Recovery (QLT-013)</CardHeader>
        <CardContent>
          <p className="text-sm"><strong>RPO Alvo:</strong> 15 minutos | <strong>RTO Alvo:</strong> 60 minutos</p>
          <Button type="button" variant="ghost" className="mt-2" onClick={() => jobsMutation.mutate()} data-testid="load-jobs-btn">
            Carregar Histórico de Jobs
          </Button>

          {jobs.length > 0 && (
            <ul data-testid="jobs-list" className="mt-3 space-y-1 text-sm">
              {jobs.map((j) => (
                <li key={j.id}>
                  <strong>{j.jobType}:</strong> {j.status} ({j.snapshotHash})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
