-- =========================================================
-- CHECKOUT FIX — run this once in Supabase SQL Editor.
-- Lets checkout create an order and hand back the confirmation
-- number, without making customer orders publicly readable.
-- =========================================================

create or replace function place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_notes text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
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
begin
  insert into orders (customer_name, phone, address, city, notes, subtotal, delivery_fee, total)
  values (p_customer_name, p_phone, p_address, p_city, p_notes, p_subtotal, p_delivery_fee, p_total)
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (
      order_id, product_id, variation_id, product_name,
      variation_label, unit_price, quantity, line_total
    )
    values (
      v_order_id,
      nullif(v_item->>'product_id', '')::uuid,
      nullif(v_item->>'variation_id', '')::uuid,
      v_item->>'product_name',
      nullif(v_item->>'variation_label', ''),
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'line_total')::numeric
    );
  end loop;

  return v_order_number;
end;
$$;

grant execute on function place_order(text, text, text, text, text, numeric, numeric, numeric, jsonb) to anon, authenticated;
