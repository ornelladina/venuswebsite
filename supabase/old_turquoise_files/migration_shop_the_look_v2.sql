-- =========================================================
-- SHOP THE LOOK v2 — run this once in Supabase SQL Editor
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- Why this exists: "Shop The Look" is now powered by the COLLECTIONS
-- table instead of individual products (a "look" is a set of several
-- pieces, which is what a collection already is — a single product
-- can't be a "look" on its own). Meanwhile "Sets & Collections" now
-- links out to individual SET products (products with is_set = true)
-- instead of the collections table.
--
-- What this does:
--   1. Adds a show_on_homepage checkbox to the collections table.
--      - Every ACTIVE collection (is_active = true) always shows on
--        the full /shop-the-look page.
--      - Tick show_on_homepage = true as well to ALSO show that
--        collection in the curated "Shop The Look" strip on the
--        homepage (same idea as is_featured for products — it just
--        controls the homepage highlight, not overall visibility).
--   2. Makes sure products.is_set exists (it should already, from
--      migration_collections.sql — this is just a safe no-op if so).
--      Tick is_set = true on a product and it will show up on the
--      "Sets & Collections" page automatically.
-- =========================================================

alter table collections add column if not exists show_on_homepage boolean not null default false;
alter table products add column if not exists is_set boolean not null default false;
