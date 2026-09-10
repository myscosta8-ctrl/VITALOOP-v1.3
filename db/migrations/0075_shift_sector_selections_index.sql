-- Migration 0075: Índice de cobertura pra FK bed_sector_id em shift_sector_selections
-- Migration estritamente aditiva. Não altera 0001 a 0074.
--
-- Achado do advisor de performance do Supabase: app.shift_sector_selections
-- tinha uma foreign key (bed_sector_id -> app.bed_sectors) sem índice de
-- cobertura.

create index if not exists shift_sector_selections_bed_sector_idx
  on app.shift_sector_selections(bed_sector_id);
