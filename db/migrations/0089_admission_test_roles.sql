-- Migration 0089: Concede admission.read/write às roles de teste
-- Migration estritamente aditiva. Não altera 0001 a 0088.
--
-- ACHADO (2026-09-13): a migration 0082 concedeu admission.read/write às
-- roles REAIS (doctor/nurse/.../admin), mas esqueceu o padrão seguido por
-- toda migration de feature desde 0017 (ex.: 0031_outcomes_summaries.sql):
-- conceder a mesma permissão também a `test_patient_full` (leitura+escrita)
-- e `test_patient_readonly` (só leitura). Sem isso, nenhum teste de
-- integração do projeto (que usa `test_patient_full` como fixture padrão)
-- consegue exercitar as rotas de internação — só recebe 403.

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('admission.read', 'admission.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'admission.read'
on conflict do nothing;
