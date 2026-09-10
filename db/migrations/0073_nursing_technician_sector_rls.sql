-- Migration 0073: Restrição de acesso por setor para técnico de enfermagem
-- Migration estritamente aditiva. Não altera 0001 a 0072.
--
-- Decisão do usuário (2026-09-09): apenas o TÉCNICO DE ENFERMAGEM é
-- restrito ao setor escolhido no login do plantão (migration 0072) — todos
-- os demais profissionais assistenciais (médico, enfermeiro, farmacêutico,
-- nutricionista, serviço social, fisioterapeuta) têm acesso direto ao
-- prontuário clínico independente de setor, porque na prática atendem
-- pacientes em toda a unidade. Aplica a restrição em app.patients e
-- app.encounters (tabelas-raiz — a maioria das demais tabelas clínicas
-- depende delas). Sem alterar o comportamento pra ninguém que não seja
-- exclusivamente técnico de enfermagem.
--
-- NOTA DE PROCESSO (registrado a pedido do usuário): esta mudança foi
-- aplicada direto em produção, sem passar por uma branch de teste do
-- Supabase antes — avaliação de risco: hoje não existe nenhum técnico de
-- enfermagem real cadastrado (só roles de teste), e a restrição só entra
-- em vigor para quem tem EXCLUSIVAMENTE essa role, então o "raio de
-- explosão" de um eventual erro é nulo neste momento. Quando existirem
-- técnicos de enfermagem reais em produção, mudanças de RLS como esta
-- devem voltar a passar primeiro por uma branch de desenvolvimento
-- (mcp create_branch) antes de aplicar aqui.

-- Verdadeiro quando o ator tem EXCLUSIVAMENTE a role nursing_technician
-- (nenhuma das roles com acesso amplo) — só nesse caso a restrição de
-- setor se aplica.
create or replace function app.nursing_technician_sector_restricted()
returns boolean
language sql stable security definer set search_path = '' as $$
  select 'nursing_technician' = any(app.ctx_roles())
     and not (app.ctx_roles() && array['doctor','nurse','manager','direcao','admin','system_admin']);
$$;

grant execute on function app.nursing_technician_sector_restricted() to vitaloop_app;

-- Acesso ao atendimento: sem restrição de setor pra quem não é técnico de
-- enfermagem exclusivo; para o técnico, exige que o setor atual do
-- atendimento (app.encounter_current_sector, migration 0070) bata com a
-- área/setor escolhida no login do plantão (app.shift_sector_selections,
-- migration 0072, seleção mais recente ainda não expirada).
create or replace function app.nursing_technician_can_access_encounter(p_encounter_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when not app.nursing_technician_sector_restricted() then true
    else exists (
      select 1 from app.shift_sector_selections s
      where s.user_id = app.ctx_user_id()
        and s.expires_at > now()
        and (
          (s.area = 'pronto_atendimento' and app.encounter_current_sector(p_encounter_id) is null)
          or (s.area = 'internacao' and app.encounter_current_sector(p_encounter_id) = s.bed_sector_id)
        )
      order by s.selected_at desc
      limit 1
    )
  end;
$$;

grant execute on function app.nursing_technician_can_access_encounter(uuid) to vitaloop_app;

-- Acesso ao paciente: liberado se houver pelo menos um atendimento não
-- terminal (não completed/canceled) desse paciente acessível pela regra
-- acima. Paciente sem atendimento ativo nenhum fica invisível pro técnico
-- restrito (não deveria aparecer na prática nesse caso).
create or replace function app.nursing_technician_can_access_patient(p_patient_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when not app.nursing_technician_sector_restricted() then true
    else exists (
      select 1 from app.encounters e
      where e.patient_id = p_patient_id
        and e.status not in ('completed', 'canceled')
        and app.nursing_technician_can_access_encounter(e.id)
    )
  end;
$$;

grant execute on function app.nursing_technician_can_access_patient(uuid) to vitaloop_app;

-- ---------- Reaplica as políticas de select com a restrição adicional ----------
drop policy if exists encounters_read on app.encounters;
create policy encounters_read on app.encounters for select to vitaloop_app
  using (app.has_permission('encounter.read') and app.nursing_technician_can_access_encounter(id));

drop policy if exists patients_read on app.patients;
create policy patients_read on app.patients for select to vitaloop_app
  using (app.has_permission('patient.read') and app.nursing_technician_can_access_patient(id));
