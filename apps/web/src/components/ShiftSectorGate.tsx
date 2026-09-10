import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createShiftSectorSelectionApi, type ShiftArea } from '../lib/shift-sector-selection-api.js';
import { createBedApi, type BedSectorData } from '../lib/bed-api.js';
import { ApiError } from '../lib/api-client.js';

// Só o técnico de enfermagem é restrito por setor durante o plantão (os
// demais profissionais assistenciais atendem em toda a unidade) — por
// isso só essa role precisa escolher o setor a cada login. A escolha vale
// por 12h (duração de um plantão); passado esse prazo, precisa escolher de
// novo no próximo login.
export const ShiftSectorGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { api, identity } = useSession();
  const shiftApi = createShiftSectorSelectionApi(api);
  const bedApi = createBedApi(api);

  const isNursingTechnician = (identity?.roles ?? []).includes('nursing_technician');

  const [checking, setChecking] = useState(isNursingTechnician);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [sectors, setSectors] = useState<BedSectorData[]>([]);
  const [area, setArea] = useState<ShiftArea>('pronto_atendimento');
  const [bedSectorId, setBedSectorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNursingTechnician) return;
    let cancelled = false;
    (async () => {
      try {
        const [current, sectorList] = await Promise.all([shiftApi.getCurrentSelection(), bedApi.getSectors()]);
        if (cancelled) return;
        setSectors(sectorList);
        setNeedsSelection(current === null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Falha ao verificar o setor do plantão.');
        setNeedsSelection(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNursingTechnician]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (area === 'internacao' && !bedSectorId) {
      setError('Selecione o setor de internação.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await shiftApi.selectSector({ area, bedSectorId: area === 'internacao' ? bedSectorId : null });
      setNeedsSelection(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao registrar o setor do plantão.');
    } finally {
      setSaving(false);
    }
  };

  if (!isNursingTechnician) return <>{children}</>;
  if (checking) return <p role="status">Carregando…</p>;
  if (!needsSelection) return <>{children}</>;

  return (
    <main aria-labelledby="shift-sector-heading" className="vl-auth-shell">
      <div className="vl-auth-card">
        <h1 id="shift-sector-heading">Em qual setor você está hoje?</h1>
        <p>Sua função (técnico de enfermagem) é fixa em um setor durante o plantão. Escolha onde você está agora.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="shift-area">Área</label>
          <select
            id="shift-area"
            value={area}
            onChange={(e) => {
              setArea(e.target.value as ShiftArea);
              setBedSectorId('');
            }}
          >
            <option value="pronto_atendimento">Pronto Atendimento</option>
            <option value="internacao">Prontuário de Internação</option>
          </select>

          {area === 'internacao' && (
            <>
              <label htmlFor="shift-bed-sector">Setor</label>
              <select id="shift-bed-sector" value={bedSectorId} onChange={(e) => setBedSectorId(e.target.value)} required>
                <option value="">Selecione…</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={saving}>
            {saving ? 'Confirmando…' : 'Confirmar e entrar'}
          </button>
        </form>
      </div>
    </main>
  );
};
