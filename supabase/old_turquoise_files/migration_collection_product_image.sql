-- =========================================================
-- COLLECTION-SPECIFIC PRODUCT PHOTO — run this once in Supabase SQL Editor.
-- Lets you pick, per product inside a "Shop The Look" collection, which
-- of that product's own photos (e.g. a specific color/variation) shows
-- on its card within THAT collection — from the admin dashboard
-- (Collections -> edit a collection -> "Products in this Look").
-- Leaving it unset keeps today's behavior (the product's normal first
-- photo). Doesn't affect how the product looks anywhere else on the
-- site (its own page, Best Sellers, category pages, etc.) — only within
-- this one collection's "Shop The Items" grid.
-- =========================================================

alter table collection_products
  add column if not exists featured_image_id uuid references product_images(id) on delete set null;
