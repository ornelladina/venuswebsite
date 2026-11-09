-- =========================================================
-- CUSTOMER EMAIL (optional) + "confirmation email sent" tracking
-- Run this ONCE in Supabase SQL Editor, BEFORE uploading the new
-- website code to GitHub.
--
-- (This file is NOT part of the website code. It only updates the
-- database. Run it once and you don't need to touch it again.)
--
-- What it does:
--   1. Adds an optional "email" column to orders.
--   2. Adds "customer_notified_at", which is filled in when the
--      confirmation email actually went out, so the same customer
--      never gets the same email twice.
--   3. Updates place_order() so checkout can save the email. The
--      email is optional: if a customer leaves it empty, everything
--      works exactly like before.
-- =========================================================

alter table orders add column if not exists email text;
alter table orders add column if not exists customer_notified_at timestamptz;

-- The function gets a new last argument, so the old version has to be
-- removed first. Otherwise Supabase would see two versions and refuse to
-- pick one.
drop function if exists place_order(text, text, text, text, text, numeric, numeric, numeric, jsonb);

create or replace function place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_notes text,
  p_subtotal numeric,   -- not trusted, kept so existing calls still work
  p_delivery_fee numeric,
  p_total numeric,      -- not trusted, kept so existing calls still work
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
  v_total numeric(10,2);
  v_image_url text;
  v_email text;
begin
  select coalesce(sum((elem->>'line_total')::numeric), 0)
  into v_subtotal
  from jsonb_array_elements(p_items) as elem;

  v_total := v_subtotal + p_delivery_fee;

  v_email := nullif(left(lower(trim(coalesce(p_email, ''))), 254), '');

  insert into orders (customer_name, phone, email, address, city, notes, subtotal, delivery_fee, total)
  values (p_customer_name, p_phone, v_email, p_address, p_city, p_notes, v_subtotal, p_delivery_fee, v_total)
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
