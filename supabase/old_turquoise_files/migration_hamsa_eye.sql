-- =========================================================
-- HAMSA & EYE COLLECTION — run this once in Supabase SQL Editor
-- (This file is NOT part of the website code — it only sets up
-- the database. Run it, then you don't need to touch it again.)
--
-- What this does: adds an is_hamsa_eye checkbox to your existing
-- products table. It works exactly like the is_featured checkbox
-- already does for the "Featured Items" section:
--
--   - Set is_hamsa_eye = true (and is_active = true) on any product
--     and it will automatically show up in the "Hamsa & Eye
--     Collection" section on the homepage.
--   - Set it back to false (or set is_active = false) to remove it
--     from that section without deleting the product.
--   - You can do this from Table Editor > products > tick the
--     is_hamsa_eye checkbox for a row — no SQL needed after this
--     one-time setup.
-- =========================================================

alter table products add column if not exists is_hamsa_eye boolean not null default false;
