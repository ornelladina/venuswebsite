-- =========================================================
-- PRODUCT & COLLECTION STYLE — run this once in Supabase SQL Editor
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- What this does: turns "style" into a real dropdown you can pick
-- from in Table Editor, instead of a free-text field you had to
-- type into exactly (and could easily typo/miscase, which would
-- silently break the /style/* pages since they match on exact
-- text).
--
--   - Creates a Postgres ENUM type "product_style" with the 4
--     allowed values: Stainless Steel, Vintage, Gold Plated,
--     Silver 925.
--   - Adds/converts a `style` column on `products` to that enum
--     (if you already added a plain text `style` column by hand
--     earlier, this safely converts it over instead of erroring —
--     any existing values must already match one of the 4 labels
--     above exactly, or the conversion will fail and tell you
--     which row to fix).
--   - Adds/converts a matching `style` column on `collections` the
--     same way, so you can also tag a whole collection with a
--     style.
--
-- After running this: open Table Editor > products (or
-- collections) > the `style` column now shows as a dropdown you
-- can pick from per row — no more typing required.
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_style') then
    create type product_style as enum ('Gold Plated', 'Stainless Steel', 'Vintage', 'Silver 925');
  end if;
end $$;

-- ---------- products.style ----------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'style'
  ) then
    alter table products
      alter column style type product_style
      using (nullif(trim(style::text), '')::product_style);
  else
    alter table products add column style product_style;
  end if;
end $$;

-- ---------- collections.style ----------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'collections' and column_name = 'style'
  ) then
    alter table collections
      alter column style type product_style
      using (nullif(trim(style::text), '')::product_style);
  else
    alter table collections add column style product_style;
  end if;
end $$;
