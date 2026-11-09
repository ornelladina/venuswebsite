-- =========================================================
-- STOCK AUTO-DECREMENT
-- Run this in Supabase SQL Editor (New Query > paste > Run).
-- Automatically reduces stock the moment an order is placed,
-- whether it comes from the website or you adding an order manually.
-- =========================================================

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

create trigger trg_decrement_stock
after insert on order_items
for each row execute function decrement_stock();
