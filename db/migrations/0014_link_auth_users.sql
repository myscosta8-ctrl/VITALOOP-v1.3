-- =====================================================================
-- VITALOOP 1.3 — Migration 0014 (Fase 1)
-- Vincula app.users.auth_subject ao Supabase Auth (auth.users), sem alterar
-- migrations históricas (Doc 4 §28). auth_subject era `text`; passa a `uuid`
-- com FK para auth.users(id) — só é seguro porque nenhuma linha existe ainda
-- (Fase 0 não inseriu dados de produção).
-- =====================================================================

alter table app.users
  alter column auth_subject type uuid using auth_subject::uuid;

alter table app.users
  add constraint users_auth_subject_fk
  foreign key (auth_subject) references auth.users(id) on delete set null;

comment on column app.users.auth_subject is 'FK para auth.users(id) do Supabase Auth. Identidade de credencial != identidade institucional.';
