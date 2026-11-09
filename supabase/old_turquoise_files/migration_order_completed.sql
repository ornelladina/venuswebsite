-- =========================================================
-- ORDERS — add a "Completed" status — run this once in Supabase SQL
-- Editor.
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- orders.status currently only allows 'Pending', 'Confirmed',
-- 'Delivered', 'Cancelled' (see supabase/schema.sql). This widens that
-- list to include 'Completed', which the admin dashboard's "Mark
-- Completed" button now sets — nothing else about existing orders
-- changes.
-- =========================================================

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('Pending', 'Confirmed', 'Delivered', 'Cancelled', 'Completed'));
