import React, { useState } from 'react';
import { NursingRecordData } from '../lib/nursing-api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { EmptyState } from './ui/empty-state.js';
import { Label } from './ui/label.js';
import { Textarea } from './ui/textarea.js';

interface NursingRecordsViewProps {
  records: NursingRecordData[];
  onAddRecord: (type: 'admission' | 'evolution' | 'annotation', content: string) => Promise<void>;
  disabled?: boolean;
}

const RECORD_BADGE: Record<'admission' | 'evolution' | 'annotation', { label: string; variant: 'warning' | 'secondary' | 'outline' }> = {
  admission: { label: 'Admissão', variant: 'warning' },
  evolution: { label: 'Evolução', variant: 'secondary' },
  annotation: { label: 'Anotação', variant: 'outline' },
};

export const NursingRecordsView: React.FC<NursingRecordsViewProps> = ({ records, onAddRecord, disabled = false }) => {
  const [recordType, setRecordType] = useState<'admission' | 'evolution' | 'annotation'>('annotation');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (recordType === 'admission' && content.trim().length < 10) {
      setError('A admissão de enfermagem exige um histórico/motivo de no mínimo 10 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddRecord(recordType, content);
      setContent('');
    } catch (err) {
      const e = err as Error;
      setError(e?.message || 'Erro ao registrar anotação de enfermagem.');
    } finally {
      setLoading(false);
    }
  };

  const radioOptions: Array<{ value: 'admission' | 'evolution' | 'annotation'; label: string }> = [
    { value: 'annotation', label: 'Anotação' },
    { value: 'evolution', label: 'Evolução (Enfermeiro)' },
    { value: 'admission', label: 'Admissão no Setor' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros e Anotações de Enfermagem (NUR-001..003)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <p role="alert" className="rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo de Registro</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {radioOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm font-normal text-foreground">
                  <input
                    type="radio"
                    name="recordType"
                    value={opt.value}
                    checked={recordType === opt.value}
                    onChange={() => setRecordType(opt.value)}
                    disabled={disabled}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nursing-record-content">Registro</Label>
            <Textarea
              id="nursing-record-content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={disabled || loading}
              placeholder="Descreva as observações, queixas do paciente, repouso, sinais vitais ou evolução da enfermagem..."
            />
          </div>

          <Button type="submit" disabled={disabled || loading || !content.trim()}>
            {loading ? 'Gravando...' : 'Salvar Registro de Enfermagem'}
          </Button>
        </form>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Histórico de Enfermagem</h4>
          {records.length === 0 ? (
            <EmptyState title="Nenhum registro de enfermagem até o momento." />
          ) : (
            <div className="flex flex-col gap-3">
              {records.map((r) => {
                const badge = RECORD_BADGE[r.recordType];
                return (
                  <div key={r.id} className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-xs text-muted-foreground">Por: {r.professionalId}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{r.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
