-- Migration 0047: Configuração real inicial de setores e leitos da unidade.
-- Diferente dos seeds em db/seeds/ (que são dados FICTÍCIOS de dev/teste),
-- esta é a configuração física real informada pela unidade — por isso vive
-- em migrations, não em seeds: deve existir também em produção.
--
-- Fonte: contagem informada pela unidade em 2026-09-03.
--   Sala Vermelha — 4 leitos
--   Internação Adulto — 17 leitos (1 de isolamento)
--   Pediátrico — 6 leitos (1 de isolamento)
--   Observação — 9 leitos (1 de isolamento)
--
-- Idempotente: pode rodar mais de uma vez sem duplicar (on conflict do nothing).

insert into app.bed_sectors (name, code, capacity) values
  ('Sala Vermelha', 'SALA_VERMELHA', 4),
  ('Internação Adulto', 'INTERNACAO_ADULTO', 17),
  ('Pediátrico', 'PEDIATRICO', 6),
  ('Observação', 'OBSERVACAO', 9)
on conflict (code) do nothing;

-- Leitos físicos de cada setor, numerados sequencialmente (ex.: SALA_VERMELHA-01).
-- Os primeiros N leitos de cada setor (conforme isolation_beds) são marcados
-- como isolamento — a unidade não especificou quais números, só a quantidade.
do $$
declare
  v_sector record;
  v_bed_number text;
begin
  for v_sector in
    select id, code, capacity,
      case code
        when 'INTERNACAO_ADULTO' then 1
        when 'PEDIATRICO' then 1
        when 'OBSERVACAO' then 1
        else 0
      end as isolation_beds
    from app.bed_sectors
    where code in ('SALA_VERMELHA', 'INTERNACAO_ADULTO', 'PEDIATRICO', 'OBSERVACAO')
  loop
    for i in 1..v_sector.capacity loop
      v_bed_number := v_sector.code || '-' || lpad(i::text, 2, '0');
      insert into app.beds (sector_id, bed_number, status, is_extra, is_isolation)
      values (v_sector.id, v_bed_number, 'available', false, i <= v_sector.isolation_beds)
      on conflict (sector_id, bed_number) do nothing;
    end loop;
  end loop;
end $$;
