-- =========================================================
-- NEW MATERIAL/STYLE: CHARM BRACELETS — run this once in Supabase SQL Editor.
-- Adds "Charm Bracelets" as a new option in the same dropdown Gold-Plated /
-- Stainless Steel / Vintage / Silver 925 already come from (the
-- product_style enum — see supabase/migration_style.sql). After running
-- this, open Table Editor > products (or collections) > the `style`
-- column and "Charm Bracelets" shows up as a pickable option, same as
-- the others.
-- =========================================================

alter type product_style add value if not exists 'Charm Bracelets';
