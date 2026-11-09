-- =========================================================
-- FEATURED / BEST SELLERS — independent drag order — run this once in
-- Supabase SQL Editor.
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- Why this exists: until now, Featured Items and Best Sellers both sorted
-- by the same `display_order` column products already have. That's fine
-- if a product only ever sits in one of those sections, but a product
-- that's in BOTH would have shared one order value between them — moving
-- it in one section's admin list would silently move it in the other
-- too. This adds two separate columns so each admin section has its own
-- order, independent of the other and of `display_order` (which keeps
-- doing what it already did everywhere else — category pages, etc.).
--
-- Existing products default to 0 here, same starting point display_order
-- already used — the admin dashboard's drag-to-reorder writes real
-- values in as you use it.
-- =========================================================

alter table products add column if not exists featured_order int not null default 0;
alter table products add column if not exists best_seller_order int not null default 0;

create index if not exists idx_products_featured_order on products(featured_order);
create index if not exists idx_products_best_seller_order on products(best_seller_order);

-- Collections (a "shop the look" set) can also be added into Featured
-- Items / Best Sellers from the admin dashboard now, alongside regular
-- products — they need the same two order columns products have, kept
-- independent of the collection's own display_order (used elsewhere, e.g.
-- /shop-the-look and Hamsa & Eye).
alter table collections add column if not exists featured_order int not null default 0;
alter table collections add column if not exists best_seller_order int not null default 0;

create index if not exists idx_collections_featured_order on collections(featured_order);
create index if not exists idx_collections_best_seller_order on collections(best_seller_order);
