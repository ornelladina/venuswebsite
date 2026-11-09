-- =========================================================
-- ORDER TOTAL FIX + ITEM IMAGES
-- Run this once in Supabase SQL Editor.
--
-- Part 1: stops trusting the browser's math for the order total.
-- From now on, the subtotal/total are always calculated from the
-- actual line items on the server, so they can never be wrong.
--
-- Part 2: captures each item's photo at the moment of purchase
-- (so even if you later change or delete a product's photos,
-- the order history still shows what the customer actually saw).
-- =========================================================

alter table order_items add column if not exists image_url text;

create or replace function place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_notes text,
  p_subtotal numeric,   -- no longer trusted, kept only so old calls still work
  p_delivery_fee numeric,
  p_total numeric,      -- no longer trusted, kept only so old calls still work
  p_items jsonb
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
begin
  -- Calculate the real subtotal from the line items themselves.
  select coalesce(sum((elem->>'line_total')::numeric), 0)
  into v_subtotal
  from jsonb_array_elements(p_items) as elem;

  v_total := v_subtotal + p_delivery_fee;

  insert into orders (customer_name, phone, address, city, notes, subtotal, delivery_fee, total)
  values (p_customer_name, p_phone, p_address, p_city, p_notes, v_subtotal, p_delivery_fee, v_total)
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- Grab that product's main photo to snapshot onto the order item
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

grant execute on function place_order(text, text, text, text, text, numeric, numeric, numeric, jsonb) to anon, authenticated;
