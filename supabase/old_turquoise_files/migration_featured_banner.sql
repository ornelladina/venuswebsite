-- =========================================================
-- FEATURED ITEMS BANNER — run this once in Supabase SQL Editor
-- (safe to run twice).
-- Adds a full-width banner image above the Featured Items cards on the
-- homepage. The image, its position and its zoom are edited at
-- Admin > Homepage Sections > Cover Images > "Featured Items Banner".
-- Empty url = no banner is shown.
-- =========================================================

alter table site_settings add column if not exists featured_banner_url text not null default '';
alter table site_settings add column if not exists featured_banner_position text not null default '50% 50%';
alter table site_settings add column if not exists featured_banner_zoom numeric not null default 0;
