-- Lets a "Shop The Look" collection card be tagged into the same
-- sections a regular product can be tagged into (Featured Items, Best
-- Sellers, Hamsa & Eye), so it can show up mixed in among products there
-- instead of only ever appearing on /shop-the-look, the homepage strip,
-- its own /collection/[slug] page, or (with category_id + style already
-- set, see migration_collection_category.sql) a category page.
--
-- Mirrors the identically-named columns already on `products`. Run this
-- once in Supabase's SQL Editor.

alter table collections add column if not exists is_featured boolean not null default false;
alter table collections add column if not exists is_best_seller boolean not null default false;
alter table collections add column if not exists is_hamsa_eye boolean not null default false;
alter table collections add column if not exists is_hamsa_eye_home boolean not null default false;
