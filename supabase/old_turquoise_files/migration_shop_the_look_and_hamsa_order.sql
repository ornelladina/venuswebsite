-- =========================================================
-- Adds drag-to-reorder support for the "Shop the Look" and "Hamsa & Eye"
-- sections on the admin dashboard's Homepage Sections page — run this
-- once in Supabase SQL Editor.
-- (This file is NOT part of the website code — it only sets up the
-- database. Run it, then you don't need to touch it again.)
--
-- Featured Items and Best Sellers already have their own order column
-- (featured_order / best_seller_order — see migration_section_order.sql)
-- so dragging them doesn't disturb a product/collection's general
-- display_order, which is used elsewhere (product grids, the admin
-- Collections list, etc). Shop the Look and Hamsa & Eye were still
-- ordered by that same general display_order, so reordering them here
-- would have silently reordered products/collections everywhere else on
-- the site too. This gives them the same kind of independent order
-- column Featured/Best Sellers already have.
-- =========================================================

alter table collections add column if not exists shop_the_look_order integer not null default 0;

alter table products add column if not exists hamsa_eye_home_order integer not null default 0;
alter table collections add column if not exists hamsa_eye_home_order integer not null default 0;
