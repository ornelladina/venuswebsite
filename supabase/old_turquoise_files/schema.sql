-- =========================================================
-- WOMANLY LEBANON — DATABASE SCHEMA (Stage 1)
-- Run this once in Supabase: Dashboard > SQL Editor > New query > Paste > Run
-- =========================================================

-- ---------- CATEGORIES ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,           -- e.g. "necklaces" -> used in URLs
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- PRODUCTS ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,           -- e.g. "gold-heart-necklace" -> used in URLs
  description text,
  sku text unique,
  price numeric(10,2) not null,
  sale_price numeric(10,2),            -- optional, if on sale
  original_price numeric(10,2),        -- optional, "was" price
  stock_quantity int not null default 0,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  display_order int not null default 0,
  is_active boolean not null default true,   -- lets you hide a product without deleting it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PRODUCT IMAGES ----------
-- A product can have many images. First one (lowest display_order) = main image.
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- PRODUCT VARIATIONS ----------
-- Fully optional. A product with no rows here = no variation selector shown.
create table product_variations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  variation_type text not null,        -- e.g. 'Color', 'Size', 'Style'
  variation_value text not null,       -- e.g. 'Gold', 'Small'
  price_override numeric(10,2),        -- optional: overrides base product price
  stock_quantity int not null default 0,
  sku text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Optional images specific to a variation (e.g. gold vs silver photo)
create table variation_images (
  id uuid primary key default gen_random_uuid(),
  variation_id uuid not null references product_variations(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0
);

-- ---------- ORDERS (Cash on Delivery) ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,   -- human friendly, e.g. WL-1001
  customer_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  notes text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 5.00,
  total numeric(10,2) not null,
  status text not null default 'Pending'
    check (status in ('Pending','Confirmed','Delivered','Cancelled')),
  created_at timestamptz not null default now()
);

-- ---------- ORDER ITEMS ----------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variation_id uuid references product_variations(id) on delete set null,
  product_name text not null,          -- snapshot, in case product changes later
  variation_label text,                -- snapshot, e.g. "Gold / Small"
  unit_price numeric(10,2) not null,
  quantity int not null,
  line_total numeric(10,2) not null
);

-- =========================================================
-- HELPFUL INDEXES (keeps the site fast as it grows)
-- =========================================================
create index idx_products_category on products(category_id);
create index idx_products_active on products(is_active);
create index idx_product_images_product on product_images(product_id);
create index idx_variations_product on product_variations(product_id);
create index idx_order_items_order on order_items(order_id);

-- =========================================================
-- ORDER NUMBER GENERATOR (WL-1001, WL-1002, ...)
-- =========================================================
create sequence order_number_seq start 1001;

create or replace function set_order_number()
returns trigger as $$
begin
  if new.order_number is null then
    new.order_number := 'WL-' || nextval('order_number_seq');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_order_number
before insert on orders
for each row execute function set_order_number();

-- =========================================================
-- ROW LEVEL SECURITY (keeps your data safe)
-- Public (customers) can READ products/categories, and CREATE orders.
-- Only you (via Supabase Studio, logged in as project owner) can edit/delete.
-- =========================================================
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variations enable row level security;
alter table variation_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Public read access for the storefront
create policy "Public can view categories" on categories for select using (true);
create policy "Public can view active products" on products for select using (is_active = true);
create policy "Public can view product images" on product_images for select using (true);
create policy "Public can view variations" on product_variations for select using (true);
create policy "Public can view variation images" on variation_images for select using (true);

-- Public can place orders, but cannot read or edit other people's orders
create policy "Public can create orders" on orders for insert with check (true);
create policy "Public can create order items" on order_items for insert with check (true);

-- Note: You (the shop owner) manage everything, including viewing/updating orders,
-- through Supabase Studio while logged in — that access bypasses these public
-- policies automatically, so no extra setup is needed for you to manage the shop.
