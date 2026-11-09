-- =========================================================
-- RENAME MATERIAL: CHARM BRACELETS -> SILVER-PLATED
-- Run this once in Supabase SQL Editor.
-- The nav link customers see still says "Charm Bracelets" (that part
-- lives in the site's code, not the database), but the material tag
-- itself — the one you pick from the `style` dropdown when editing a
-- product/collection in Table Editor — is renamed to "Silver-Plated" to
-- actually describe the material.
--
-- Safe to run whether or not you already ran
-- migration_style_charm_bracelets.sql: if "Charm Bracelets" exists as an
-- option, this renames it (any product already tagged with it moves over
-- automatically); if it doesn't exist yet, this just adds "Silver-Plated"
-- fresh.
-- =========================================================

do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'product_style' and e.enumlabel = 'Charm Bracelets'
  ) then
    alter type product_style rename value 'Charm Bracelets' to 'Silver-Plated';
  else
    alter type product_style add value if not exists 'Silver-Plated';
  end if;
end $$;
