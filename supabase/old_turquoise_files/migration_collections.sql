-- =========================================================
-- COLLECTIONS & SETS — run this once in Supabase SQL Editor
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
-- =========================================================

create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cover_image_url text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  display_order int not null default 0
);

alter table products add column is_set boolean not null default false;

create table set_items (
  id uuid primary key default gen_random_uuid(),
  set_product_id uuid not null references products(id) on delete cascade,
  item_product_id uuid not null references products(id) on delete cascade,
  display_order int not null default 0
);

create index idx_collection_products_collection on collection_products(collection_id);
create index idx_collection_products_product on collection_products(product_id);
create index idx_set_items_set on set_items(set_product_id);
create index idx_set_items_item on set_items(item_product_id);

alter table collections enable row level security;
alter table collection_products enable row level security;
alter table set_items enable row level security;

create policy "Public can view active collections" on collections for select using (is_active = true);
create policy "Public can view collection products" on collection_products for select using (true);
create policy "Public can view set items" on set_items for select using (true);
