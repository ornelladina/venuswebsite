-- =========================================================
-- VENUS BIJOUX — COMPLETE DATABASE SETUP (one file, run ONCE)
--
-- Supabase Dashboard > SQL Editor > New query > paste this whole file > Run.
-- Use it on a brand-new, empty Supabase project. It builds everything the
-- site needs: tables, security rules, checkout, stock, homepage settings,
-- customer accounts and saved carts. It is safe to run a second time.
--
-- It replaces the ~40 separate migration files from the Turquoise project
-- (kept for reference in supabase/old_turquoise_files/; do not run those).
-- Order alerts are in a SEPARATE file, setup_order_alerts.sql, because that
-- one needs your site address and a secret filled in.
-- =========================================================

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table categories add column if not exists cover_image_url text;
alter table categories add column if not exists cover_position text not null default '50% 50%';

-- ---------- MATERIAL / STYLE (dropdown values) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_style') then
    create type product_style as enum ('Gold Plated', 'Stainless Steel', 'Vintage', 'Silver 925', 'Silver-Plated');
  end if;
end $$;

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sku text unique,
  price numeric(10,2) not null,
  sale_price numeric(10,2),
  original_price numeric(10,2),
  stock_quantity int not null default 0,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table products add column if not exists is_shop_the_look boolean not null default false;
alter table products add column if not exists is_hamsa_eye boolean not null default false;
alter table products add column if not exists is_hamsa_eye_home boolean not null default false;
alter table products add column if not exists is_classical boolean not null default false;
alter table products add column if not exists is_set boolean not null default false;
alter table products add column if not exists is_best_seller boolean not null default false;
alter table products add column if not exists style product_style;
alter table products add column if not exists featured_order int not null default 0;
alter table products add column if not exists best_seller_order int not null default 0;
alter table products add column if not exists hamsa_eye_home_order int not null default 0;

-- ---------- PRODUCT IMAGES ----------
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table product_images add column if not exists color_tag text;
alter table product_images add column if not exists focal_point text;
alter table product_images add column if not exists label text;
alter table product_images add column if not exists zoom numeric not null default 1;
alter table product_images add column if not exists object_fit text;

-- ---------- PRODUCT VARIATIONS ----------
create table if not exists product_variations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  variation_type text not null,
  variation_value text not null,
  price_override numeric(10,2),
  stock_quantity int not null default 0,
  sku text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists variation_images (
  id uuid primary key default gen_random_uuid(),
  variation_id uuid not null references product_variations(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0
);

-- ---------- COLLECTIONS (Shop The Look) & SETS ----------
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  cover_image_url text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table collections add column if not exists show_on_homepage boolean not null default false;
alter table collections add column if not exists style product_style;
alter table collections add column if not exists category_id uuid references categories(id) on delete set null;
alter table collections add column if not exists is_featured boolean not null default false;
alter table collections add column if not exists is_best_seller boolean not null default false;
alter table collections add column if not exists is_hamsa_eye boolean not null default false;
alter table collections add column if not exists is_hamsa_eye_home boolean not null default false;
alter table collections add column if not exists featured_order int not null default 0;
alter table collections add column if not exists best_seller_order int not null default 0;
alter table collections add column if not exists shop_the_look_order int not null default 0;
alter table collections add column if not exists hamsa_eye_home_order int not null default 0;

create table if not exists collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  display_order int not null default 0
);
alter table collection_products
  add column if not exists featured_image_id uuid references product_images(id) on delete set null;

create table if not exists collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists set_items (
  id uuid primary key default gen_random_uuid(),
  set_product_id uuid not null references products(id) on delete cascade,
  item_product_id uuid not null references products(id) on delete cascade,
  display_order int not null default 0
);

-- ---------- ORDERS (Cash on Delivery) ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  notes text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 5.00,
  total numeric(10,2) not null,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);
alter table orders add column if not exists email text;
alter table orders add column if not exists customer_notified_at timestamptz;
alter table orders add column if not exists completed_at timestamptz;
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('Pending', 'Confirmed', 'Delivered', 'Cancelled', 'Completed'));

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variation_id uuid references product_variations(id) on delete set null,
  product_name text not null,
  variation_label text,
  unit_price numeric(10,2) not null,
  quantity int not null,
  line_total numeric(10,2) not null
);
alter table order_items add column if not exists image_url text;

-- ---------- SAVED CART + FAVORITES (signed-in customers) ----------
create table if not exists customer_saved (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorites jsonb not null default '[]'::jsonb,
  cart jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- HOMEPAGE SETTINGS (one row: hero photos, hero text, banner) ----------
create table if not exists site_settings (
  id boolean primary key default true,
  hero_desktop_1 text not null default '/hero-water.webp',
  hero_desktop_2 text not null default '/hero-water.webp',
  hero_desktop_3 text not null default '/hero-water.webp',
  hero_desktop_position text not null default '50% 50%',
  hero_desktop_zoom numeric not null default 3,
  hero_mobile_1 text not null default '/hero-water-mobile.webp',
  hero_mobile_2 text not null default '/hero-water-mobile.webp',
  hero_mobile_3 text not null default '/hero-water-mobile.webp',
  hero_mobile_position text not null default '50% 0%',
  hero_mobile_zoom numeric not null default 12,
  constraint site_settings_singleton check (id)
);
alter table site_settings add column if not exists featured_subtitle text not null default 'Leather brand bracelets';
alter table site_settings
  add column if not exists hero_1_heading text not null default 'Trendy. Classy.
Affordable.',
  add column if not exists hero_1_subtext text not null default 'Fashion accessories that don''t make you choose.',
  add column if not exists hero_1_button_label text not null default 'SHOP NOW',
  add column if not exists hero_1_button_link text not null default '/shop',
  add column if not exists hero_2_heading text not null default 'Trendy. Classy.
Affordable.',
  add column if not exists hero_2_subtext text not null default 'Fashion accessories that don''t make you choose.',
  add column if not exists hero_2_button_label text not null default 'SHOP NOW',
  add column if not exists hero_2_button_link text not null default '/shop',
  add column if not exists hero_3_heading text not null default 'Trendy. Classy.
Affordable.',
  add column if not exists hero_3_subtext text not null default 'Fashion accessories that don''t make you choose.',
  add column if not exists hero_3_button_label text not null default 'SHOP NOW',
  add column if not exists hero_3_button_link text not null default '/shop';
alter table site_settings add column if not exists hero_1_text_color text not null default '';
alter table site_settings add column if not exists hero_2_text_color text not null default '';
alter table site_settings add column if not exists hero_3_text_color text not null default '';
alter table site_settings add column if not exists hero_mobile_1_position text not null default '50% 0%';
alter table site_settings add column if not exists hero_mobile_1_zoom numeric not null default 12;
alter table site_settings add column if not exists hero_mobile_2_position text not null default '50% 0%';
alter table site_settings add column if not exists hero_mobile_2_zoom numeric not null default 12;
alter table site_settings add column if not exists hero_mobile_3_position text not null default '50% 0%';
alter table site_settings add column if not exists hero_mobile_3_zoom numeric not null default 12;
alter table site_settings add column if not exists hero_desktop_1_position text not null default '50% 50%';
alter table site_settings add column if not exists hero_desktop_1_zoom numeric not null default 3;
alter table site_settings add column if not exists hero_desktop_2_position text not null default '50% 50%';
alter table site_settings add column if not exists hero_desktop_2_zoom numeric not null default 3;
alter table site_settings add column if not exists hero_desktop_3_position text not null default '50% 50%';
alter table site_settings add column if not exists hero_desktop_3_zoom numeric not null default 3;
alter table site_settings add column if not exists hero_mobile_1_text_color text not null default '';
alter table site_settings add column if not exists hero_mobile_2_text_color text not null default '';
alter table site_settings add column if not exists hero_mobile_3_text_color text not null default '';
alter table site_settings add column if not exists featured_banner_url text not null default '';
alter table site_settings add column if not exists featured_banner_position text not null default '50% 50%';
alter table site_settings add column if not exists featured_banner_zoom numeric not null default 0;
insert into site_settings (id) values (true) on conflict (id) do nothing;

-- ---------- INDEXES ----------
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(is_active);
create index if not exists idx_products_featured_order on products(featured_order);
create index if not exists idx_products_best_seller_order on products(best_seller_order);
create index if not exists idx_product_images_product on product_images(product_id);
create index if not exists idx_variations_product on product_variations(product_id);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_collection_products_collection on collection_products(collection_id);
create index if not exists idx_collection_products_product on collection_products(product_id);
create index if not exists idx_collection_images_collection on collection_images(collection_id);
create index if not exists idx_collections_category on collections(category_id);
create index if not exists idx_collections_featured_order on collections(featured_order);
create index if not exists idx_collections_best_seller_order on collections(best_seller_order);
create index if not exists idx_set_items_set on set_items(set_product_id);
create index if not exists idx_set_items_item on set_items(item_product_id);

-- ---------- ORDER NUMBERS (VB-1001, VB-1002, ...) ----------
create sequence if not exists order_number_seq start 1001;

create or replace function set_order_number()
returns trigger as $$
begin
  if new.order_number is null then
    new.order_number := 'VB-' || nextval('order_number_seq');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_order_number on orders;
create trigger trg_set_order_number
before insert on orders
for each row execute function set_order_number();

-- ---------- STOCK: reduce automatically when an order is placed ----------
create or replace function decrement_stock()
returns trigger as $$
begin
  if new.variation_id is not null then
    update product_variations
    set stock_quantity = greatest(stock_quantity - new.quantity, 0)
    where id = new.variation_id;
  else
    update products
    set stock_quantity = greatest(stock_quantity - new.quantity, 0)
    where id = new.product_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_decrement_stock on order_items;
create trigger trg_decrement_stock
after insert on order_items
for each row execute function decrement_stock();

-- ---------- CHECKOUT ----------
-- Totals are worked out here, never trusted from the browser.
-- Delivery: free from $75 of items, otherwise $4 Beirut / $5 elsewhere.
drop function if exists place_order(text, text, text, text, text, numeric, numeric, numeric, jsonb);
drop function if exists place_order(text, text, text, text, text, numeric, numeric, numeric, jsonb, text);

create or replace function place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_notes text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_items jsonb,
  p_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_subtotal numeric(10,2) := 0;
  v_fee numeric(10,2);
  v_total numeric(10,2);
  v_image_url text;
  v_email text;
begin
  select coalesce(sum((elem->>'line_total')::numeric), 0)
  into v_subtotal
  from jsonb_array_elements(p_items) as elem;

  v_fee := case
    when round(v_subtotal) >= 75 then 0
    when lower(trim(p_city)) = 'beirut' then 4
    else 5
  end;

  v_total := v_subtotal + v_fee;

  v_email := nullif(left(lower(trim(coalesce(p_email, ''))), 254), '');

  insert into orders (customer_name, phone, email, address, city, notes, subtotal, delivery_fee, total, user_id)
  values (p_customer_name, p_phone, v_email, p_address, p_city, p_notes, v_subtotal, v_fee, v_total, auth.uid())
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select image_url into v_image_url
    from product_images
    where product_id = nullif(v_item->>'product_id', '')::uuid
    order by display_order asc
    limit 1;

    insert into order_items (
      order_id, product_id, variation_id, product_name,
      variation_label, unit_price, quantity, line_total, image_url
    )
    values (
      v_order_id,
      nullif(v_item->>'product_id', '')::uuid,
      nullif(v_item->>'variation_id', '')::uuid,
      v_item->>'product_name',
      nullif(v_item->>'variation_label', ''),
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'line_total')::numeric,
      v_image_url
    );

    v_image_url := null;
  end loop;

  return v_order_number;
end;
$$;

grant execute on function place_order(text, text, text, text, text, numeric, numeric, numeric, jsonb, text) to anon, authenticated;

-- ---------- SECURITY (row level security) ----------
-- Customers can read the catalog and place orders. Only the admin (through the
-- site's server, using the service key) can edit anything else.
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variations enable row level security;
alter table variation_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table collections enable row level security;
alter table collection_products enable row level security;
alter table collection_images enable row level security;
alter table set_items enable row level security;
alter table site_settings enable row level security;
alter table customer_saved enable row level security;

drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories" on categories for select using (true);
drop policy if exists "Public can view active products" on products;
create policy "Public can view active products" on products for select using (is_active = true);
drop policy if exists "Public can view product images" on product_images;
create policy "Public can view product images" on product_images for select using (true);
drop policy if exists "Public can view variations" on product_variations;
create policy "Public can view variations" on product_variations for select using (true);
drop policy if exists "Public can view variation images" on variation_images;
create policy "Public can view variation images" on variation_images for select using (true);
drop policy if exists "Public can create orders" on orders;
create policy "Public can create orders" on orders for insert with check (true);
drop policy if exists "Public can create order items" on order_items;
create policy "Public can create order items" on order_items for insert with check (true);
drop policy if exists "Public can view active collections" on collections;
create policy "Public can view active collections" on collections for select using (is_active = true);
drop policy if exists "Public can view collection products" on collection_products;
create policy "Public can view collection products" on collection_products for select using (true);
drop policy if exists "Public can view collection images" on collection_images;
create policy "Public can view collection images" on collection_images for select using (true);
drop policy if exists "Public can view set items" on set_items;
create policy "Public can view set items" on set_items for select using (true);
drop policy if exists "Public can view site settings" on site_settings;
create policy "Public can view site settings" on site_settings for select using (true);

drop policy if exists "Customers can view their own orders" on orders;
create policy "Customers can view their own orders"
  on orders for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Customers can view their own order items" on order_items;
create policy "Customers can view their own order items"
  on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid()));
drop policy if exists "Customers manage their own saved items" on customer_saved;
create policy "Customers manage their own saved items"
  on customer_saved for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- STORAGE BUCKETS (public photo folders) ----------
-- Already created by hand? This does nothing in that case.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true), ('product-images', 'product-images', true)
on conflict (id) do nothing;
