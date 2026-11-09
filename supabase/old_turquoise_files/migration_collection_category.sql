-- =========================================================
-- COLLECTION CATEGORY — run this once in Supabase SQL Editor
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- What this does: adds a category_id column to the collections
-- table, the same foreign key products.category_id already uses.
-- Because it's a foreign key, Table Editor automatically shows it
-- as a "pick from categories" dropdown per row — no extra setup.
--
-- Why this exists: lets you tag a "Shop The Look" collection (e.g.
-- a bracelet look) with a category (e.g. Bracelets) AND a style
-- (Gold Plated / Stainless Steel / etc. — that dropdown already
-- exists from migration_style.sql). Once BOTH are set on a
-- collection, its card also shows up mixed in with the regular
-- products on that category page, inside that style's section —
-- in addition to (not instead of) its normal spot on the full
-- /shop-the-look page and, if show_on_homepage is also ticked, the
-- homepage strip. A collection with no category and/or no style
-- set just keeps behaving exactly as it does today: visible on
-- /shop-the-look and optionally the homepage, but not on any
-- category page.
--
-- Where a collection's card lands inside the grid, relative to the
-- products around it, is controlled by the same display_order
-- column collections already have — set it like you would for a
-- product to place the card earlier or later in that style's grid.
--
-- After running this: open Table Editor > collections > the new
-- category_id column shows as a dropdown you can pick a category
-- from per row (leave it blank to keep a collection off every
-- category page).
-- =========================================================

alter table collections add column if not exists category_id uuid references categories(id) on delete set null;

create index if not exists idx_collections_category on collections(category_id);
