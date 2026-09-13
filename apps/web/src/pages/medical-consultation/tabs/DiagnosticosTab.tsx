import React from 'react';
import type { EncounterDiagnosis, DiagnosisType } from '../../../lib/diagnoses-api.js';
import { CidSearchInput } from '../../../components/CidSearchInput.js';
import type { DiagnosesForm } from '../hooks/useDiagnoses.js';
import { EmptyState } from '../../../components/ui/empty-state.js';
import { Card, CardContent } from '../../../components/ui/card.js';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Select } from '../../../components/ui/select.js';

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
    <div className="space-y-5">
      <h4 className="text-sm font-semibold text-foreground">Diagnósticos Clínicos e Catálogo CID-10 (MED-005, MED-006)</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-semibold text-foreground">Diagnósticos Registrados no Atendimento</h5>
        {diagnoses.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {diagnoses.map((diag) => (
              <div
                key={diag.id}
                className={`rounded-md border-l-4 p-3 ${diag.diagnosisType === 'principal' ? 'border-l-destructive' : 'border-l-border'} ${diag.status === 'refuted' ? 'bg-destructive/10' : 'bg-muted/40'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Badge variant={diag.diagnosisType === 'principal' ? 'destructive' : 'secondary'} className="mr-2 uppercase">
                      {diag.diagnosisType === 'principal' ? 'Diagnóstico Principal' : 'Diagnóstico Secundário'}
                    </Badge>
                    <strong className="text-[15px] text-foreground">[{diag.cidCode}]</strong>{' '}
                    <span className="text-sm">{diag.cidDescription || ''}</span>
                  </div>
                  <Badge variant={diag.status === 'active' ? 'success' : diag.status === 'resolved' ? 'outline' : 'destructive'}>
                    {diag.status === 'active' ? 'Ativo' : diag.status === 'resolved' ? 'Resolvido' : 'Refutado'}
                  </Badge>
                </div>
                {diag.notes && <div className="mt-1 text-xs text-muted-foreground">Nota: {diag.notes}</div>}

                {diag.status === 'active' && (
                  <div className="mt-2 flex gap-2.5">
                    <Button type="button" size="sm" variant="secondary" onClick={() => handleUpdateDiagnosisStatus(diag.id, 'resolved')}>
                      Marcar Resolvido
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRefutingDiagId(diag.id);
                        setRefutationNotes('');
                      }}
                    >
                      Refutar Diagnóstico
                    </Button>
                  </div>
                )}

                {refutingDiagId === diag.id && (
                  <div className="mt-2 space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5">
                    <Label className="text-xs text-[var(--color-danger)]">Justificativa médica para refutar *</Label>
                    <Input
                      type="text"
                      value={refutationNotes}
                      onChange={(e) => setRefutationNotes(e.target.value)}
                      placeholder="Descreva o motivo clínico da refutação..."
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="destructive" onClick={() => handleUpdateDiagnosisStatus(diag.id, 'refuted')}>
                        Confirmar Refutação
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setRefutingDiagId(null)}>
                        Cancelar
                      </Button>
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

      <Card>
        <CardContent className="space-y-3 pt-6">
          <h5 className="text-sm font-semibold text-foreground">Adicionar Novo Diagnóstico CID-10</h5>
          <form onSubmit={handleAddDiagnosis} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pesquisar CID-10 *</Label>
              <CidSearchInput
                selectedItem={selectedCid}
                onSelect={(item) => setSelectedCid(item)}
                onClear={() => setSelectedCid(null)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Tipo de Diagnóstico</Label>
                <Select value={diagType} onChange={(e) => setDiagType(e.target.value as DiagnosisType)}>
                  <option value="principal">Diagnóstico Principal (Único ativo)</option>
                  <option value="secondary">Diagnóstico Secundário / Comórbido</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="font-normal">Observações / Notas</Label>
                <Input
                  type="text"
                  value={diagNotes}
                  onChange={(e) => setDiagNotes(e.target.value)}
                  placeholder="Notas complementares sobre o diagnóstico..."
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting}>
              Vincular Diagnóstico CID-10
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
