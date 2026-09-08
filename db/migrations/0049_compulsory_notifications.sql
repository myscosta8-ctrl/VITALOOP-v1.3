-- Migration 0049: Notificação compulsória de agravos — registro interno (NOTIF-001..003)
-- Migration estritamente aditiva. Não altera 0001 a 0048.
--
-- Registro interno (sem integração real com o SINAN nesta etapa — mesmo
-- padrão já usado pra AIH/SIGTAP no sistema: captura os dados essenciais
-- localmente, exportação/integração oficial fica pra uma etapa futura).
-- Lista de agravos fixa por enquanto, sem UI de edição.

create table if not exists app.notifiable_diseases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists app.compulsory_notifications (
  id uuid primary key default gen_random_uuid(),
  disease_id uuid not null references app.notifiable_diseases(id) on delete restrict,
  patient_id uuid not null references app.patients(id) on delete cascade,
  encounter_id uuid references app.encounters(id) on delete set null,
  notified_by uuid not null references app.users(id) on delete restrict,
  symptom_onset_date date,
  clinical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists compulsory_notifications_disease_idx on app.compulsory_notifications(disease_id);
create index if not exists compulsory_notifications_patient_idx on app.compulsory_notifications(patient_id);

alter table app.notifiable_diseases enable row level security;
alter table app.compulsory_notifications enable row level security;

drop policy if exists notifiable_diseases_select on app.notifiable_diseases;
create policy notifiable_diseases_select on app.notifiable_diseases for select to vitaloop_app using (app.has_permission('notification.read'));

drop policy if exists compulsory_notifications_select on app.compulsory_notifications;
drop policy if exists compulsory_notifications_insert on app.compulsory_notifications;
create policy compulsory_notifications_select on app.compulsory_notifications for select to vitaloop_app using (app.has_permission('notification.read'));
create policy compulsory_notifications_insert on app.compulsory_notifications for insert to vitaloop_app with check (app.has_permission('notification.write'));

grant select on app.notifiable_diseases to vitaloop_app;
grant select, insert on app.compulsory_notifications to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('notification.read',  'Visualizar notificações de agravos compulsórios', 'notification', 'read'),
  ('notification.write', 'Registrar notificação de agravo compulsório', 'notification', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('notification.read', 'notification.write')
on conflict do nothing;

-- Lista inicial de agravos de notificação compulsória (baseada na LNCAT/MS),
-- priorizando os mais relevantes para uma UPA 24h.
insert into app.notifiable_diseases (code, name) values
  ('DENGUE', 'Dengue'),
  ('CHIKUNGUNYA', 'Chikungunya'),
  ('ZIKA', 'Zika'),
  ('COVID19', 'COVID-19'),
  ('SRAG', 'Síndrome Respiratória Aguda Grave (SRAG)'),
  ('SARAMPO', 'Sarampo'),
  ('COQUELUCHE', 'Coqueluche'),
  ('MENINGITE', 'Meningite'),
  ('TUBERCULOSE', 'Tuberculose'),
  ('HANSENIASE', 'Hanseníase'),
  ('SIFILIS', 'Sífilis'),
  ('HEPATITES_VIRAIS', 'Hepatites Virais'),
  ('LEPTOSPIROSE', 'Leptospirose'),
  ('FEBRE_AMARELA', 'Febre Amarela'),
  ('TETANO_ACIDENTAL', 'Tétano Acidental'),
  ('RAIVA_HUMANA', 'Raiva Humana (risco/exposição)'),
  ('ACIDENTE_ANIMAL_PECONHENTO', 'Acidente por Animal Peçonhento'),
  ('INTOXICACAO_EXOGENA', 'Intoxicação Exógena'),
  ('VIOLENCIA_INTERPESSOAL', 'Violência Interpessoal/Autoprovocada')
on conflict (code) do nothing;
