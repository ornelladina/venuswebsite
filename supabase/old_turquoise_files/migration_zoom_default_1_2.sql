-- =========================================================
-- ZOOM DEFAULT — run this once in Supabase SQL Editor.
-- Bumps the default zoom on product photos from 1 (no zoom) to 1.2
-- (zoomed in 20%), so photos fill their frame more by default instead
-- of showing empty cream space around them. You can still set any
-- individual photo's zoom higher or lower than 1.2 at any time —
-- see migration_zoom.sql for how that column works.
--
-- This does two things:
--   1. Changes the column's default, so any NEW photo you add from now
--      on starts at 1.2 instead of 1.
--   2. Updates every EXISTING photo that's still sitting at the old
--      default (1) up to 1.2. It only touches rows at exactly 1 — any
--      photo you've already customized to a different zoom value is
--      left exactly as you set it.
-- =========================================================

alter table product_images alter column zoom set default 1.2;

update product_images set zoom = 1.2 where zoom = 1;
