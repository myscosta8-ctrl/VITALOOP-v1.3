-- Migration 0067: Decisões institucionais confirmadas — Break-Glass, Need-to-Know e Merge de Pacientes
-- Migration estritamente aditiva. Não altera 0001 a 0066.
--
-- Três pontos deixados como "NÃO DEFINIDO — NECESSITA DECISÃO" pela migration
-- 0005 (break_glass_access), 0013 (access_assignments) e 0017
-- (patient_merge_requests) foram decididos pelo usuário em 2026-09-08:
--
-- 1) BREAK-GLASS: duração de 24h (1440 min), acionável por doctor/nurse,
--    com justificativa obrigatória no ato (já exigida pela coluna
--    `justification`, sempre foi not null) e revisão posterior por
--    admin/direcao/system_admin. Adiciona colunas de revisão que não
--    existiam e concede as permissões `break_glass.use`/`break_glass.review`
--    (criadas em 0013, nunca concedidas a nenhuma role real).
--
-- 2) NEED-TO-KNOW CLÍNICO: escopo por SETOR — qualquer profissional lotado
--    em um setor pode ver os pacientes daquele setor, não só os
--    formalmente atribuídos a ele. A infraestrutura para isso
--    (`app.access_assignments.scope_type = 'sector'`, `app.can_access()`)
--    já existe desde a migration 0013. Esta migration apenas REGISTRA a
--    decisão de política — a aplicação efetiva (RLS das ~40 tabelas
--    clínicas hoje só checam `has_permission`, nunca `can_access`; e
--    popular `access_assignments` com a lotação real de cada um dos
--    profissionais cadastrados) fica para uma migration própria, pois
--    depende de dado operacional real (quem trabalha em qual setor) que
--    não está disponível nesta sessão — não deve ser inventado.
--
-- 3) MERGE DE PACIENTES DUPLICADOS: nunca fundir automaticamente dado
--    clínico. `patient_merge_requests` (0017) permanece só como
--    solicitação/aprovação da INTENÇÃO; a execução decidida é
--    vincular+arquivar (o cadastro duplicado passa a apontar para o
--    principal via `target_patient_id`, nunca é apagado nem tem seus
--    dados clínicos reatribuídos). Não requer mudança de schema — a
--    tabela já foi desenhada exatamente para isso; esta migration só
--    corrige o comentário, que ainda dizia "NÃO DEFINIDO".

-- ---------- 1) Break-Glass ----------
update app.security_settings set break_glass_default_minutes = 1440; -- 24h, decisão institucional 2026-09-08

alter table app.break_glass_access add column if not exists reviewed_at timestamptz;
alter table app.break_glass_access add column if not exists reviewed_by uuid references app.users(id) on delete set null;
alter table app.break_glass_access add column if not exists review_notes text;

comment on table app.break_glass_access is
  'Acesso excepcional. Política decidida (2026-09-08): duração padrão 24h (app.security_settings.break_glass_default_minutes), acionável por doctor/nurse mediante justificativa obrigatória no ato, com revisão posterior por admin/direcao/system_admin (colunas reviewed_at/reviewed_by/review_notes).';

drop policy if exists break_glass_review on app.break_glass_access;
create policy break_glass_review on app.break_glass_access for update to vitaloop_app
  using (app.has_permission('break_glass.review'))
  with check (app.has_permission('break_glass.review'));
grant update on app.break_glass_access to vitaloop_app;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse')
  and p.code = 'break_glass.use'
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'direcao', 'system_admin')
  and p.code = 'break_glass.review'
on conflict do nothing;

-- ---------- 2) Need-to-Know clínico (decisão registrada; aplicação pendente de dado real) ----------
comment on table app.access_assignments is
  'Need-to-Know: vínculo do usuário a um escopo. Decisão institucional (2026-09-08): escopo clínico por SETOR (scope_type=''sector'') — qualquer profissional lotado em um setor pode ver os pacientes daquele setor. Infraestrutura pronta (app.can_access), mas ainda PENDENTE DE APLICAÇÃO: (a) as políticas RLS das tabelas clínicas hoje checam só app.has_permission, não app.can_access; (b) esta tabela ainda não tem nenhuma linha de lotação real dos profissionais cadastrados. Ambos exigem dado operacional real (escala de lotação por setor), não devem ser inventados.';

-- ---------- 3) Merge de pacientes duplicados (decisão registrada; sem mudança de schema) ----------
comment on table app.patient_merge_requests is
  'Solicitação/aprovação de merge de pacientes (PAT-016). Decisão institucional (2026-09-08): EXECUÇÃO nunca funde dado clínico automaticamente — o cadastro de origem (source_patient_id) é vinculado ao principal (target_patient_id) e arquivado, nunca apagado nem reatribuído campo a campo. Esta tabela já foi desenhada para essa política (registra a intenção sem apagar a origem); a tela/rota de execução do merge ainda não existe.';
