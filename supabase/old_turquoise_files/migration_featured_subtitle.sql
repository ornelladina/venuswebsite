-- =========================================================
-- FEATURED ITEMS SUBTITLE — run this once in Supabase SQL Editor.
-- Lets the small uppercase line under the "Featured Items" heading on
-- the homepage ("Leather brand bracelets") be edited from the admin
-- dashboard (Homepage Sections -> Featured Items) instead of being
-- hardcoded in app/page.tsx. Uses the same site_settings singleton row
-- the hero slideshow settings already live in — see
-- supabase/migration_hero_and_category_images.sql.
-- =========================================================

alter table site_settings
  add column if not exists featured_subtitle text not null default 'Leather brand bracelets';
