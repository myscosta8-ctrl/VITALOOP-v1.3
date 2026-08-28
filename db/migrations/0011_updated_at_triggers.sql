-- =====================================================================
-- VITALOOP 1.3 — Migration 0011
-- Manutenção de updated_at via trigger (Doc 2 §16)
-- =====================================================================

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'institutions','units','sectors','users','professional_profiles','roles'
  ] loop
    execute format(
      'create trigger %I_touch_updated before update on app.%I '
      || 'for each row execute function app.touch_updated_at();',
      t, t);
  end loop;
end$$;
