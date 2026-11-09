-- =========================================================
-- COLLECTION IMAGES — run this once in Supabase SQL Editor
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- Why this exists: a "Shop The Look" collection's page used to show
-- only its single cover_image_url. Some looks have more than one photo
-- worth showing (different angles, the look worn different ways, etc.),
-- so this adds a collection_images table — same idea as product_images,
-- just for collections. The cover photo (collections.cover_image_url)
-- still always shows first; any rows added here show after it as
-- additional swipeable photos on the collection's page. A collection
-- with no rows here behaves exactly as before (just the one cover photo,
-- no swiping).
--
-- To add extra photos to a collection: open Table Editor > collection_images
-- in Supabase, add a row with collection_id (pick the collection) and
-- image_url (paste the photo's URL from Storage), and display_order to
-- control the order they appear in (lower = earlier, after the cover).
-- =========================================================

create table if not exists collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_collection_images_collection on collection_images(collection_id);

alter table collection_images enable row level security;

create policy "Public can view collection images" on collection_images for select using (true);
