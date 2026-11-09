-- =========================================================
-- HERO & CATEGORY COVER IMAGES — run this once in Supabase SQL Editor.
-- Lets the hero slideshow photos and each category's cover photo be
-- uploaded/replaced/repositioned from the admin dashboard (Homepage
-- Sections -> Cover Images) instead of needing an exact filename
-- uploaded directly to Storage. Uses the site-assets bucket that
-- already exists (same one the old hero/category photos live in).
-- =========================================================

-- CATEGORY COVERS
-- cover_image_url: null until a photo is uploaded through the admin page,
-- at which point the site prefers it over the old "category-{slug}.webp"
-- filename convention — see app/page.tsx. So existing categories keep
-- showing exactly what they show today until you actually replace one.
-- cover_position: same "x% y%" format as product photos' focal_point.
alter table categories add column if not exists cover_image_url text;
alter table categories add column if not exists cover_position text not null default '50% 50%';

-- HOMEPAGE HERO SLIDESHOW
-- One row, holding all 3 desktop photos + 3 mobile photos plus one shared
-- focal point and one shared zoom per breakpoint — matches how the
-- crossfade CSS already treats all 3 slides in a breakpoint identically
-- (see components/HeroWaterRipple.tsx), so this doesn't change what's
-- possible, just makes what already exists editable.
-- The id column is a boolean fixed to true so there's only ever one row.
create table if not exists site_settings (
  id boolean primary key default true,
  hero_desktop_1 text not null default '/hero-water.webp',
  hero_desktop_2 text not null default 'https://ubalnxocwgpjgttvhpcu.supabase.co/storage/v1/object/public/site-assets/hero-water-2.webp?v=2',
  hero_desktop_3 text not null default 'https://ubalnxocwgpjgttvhpcu.supabase.co/storage/v1/object/public/site-assets/hero-water-3.webp?v=2',
  hero_desktop_position text not null default '50% 50%',
  -- Raw CSS inset percentage already used by the crossfade CSS to create a
  -- static crop-zoom (separate from the animation's own small breathing
  -- zoom, which this does not touch) — higher number = more cropped in.
  -- Stored as a plain number (3 means "-3%") so the admin field is a
  -- simple number input rather than needing someone to type a signed
  -- percentage string correctly.
  hero_desktop_zoom numeric not null default 3,
  hero_mobile_1 text not null default 'https://ubalnxocwgpjgttvhpcu.supabase.co/storage/v1/object/public/site-assets/hero-water-mobile.webp?v=1',
  hero_mobile_2 text not null default 'https://ubalnxocwgpjgttvhpcu.supabase.co/storage/v1/object/public/site-assets/hero-water-mobile-2.webp?v=2',
  hero_mobile_3 text not null default 'https://ubalnxocwgpjgttvhpcu.supabase.co/storage/v1/object/public/site-assets/hero-water-mobile-3.webp?v=2',
  hero_mobile_position text not null default '50% 0%',
  hero_mobile_zoom numeric not null default 12,
  constraint site_settings_singleton check (id)
);
insert into site_settings (id) values (true) on conflict (id) do nothing;

-- Public (the storefront) can read it; only the service-role key used by
-- admin Server Actions can write — same read-only-to-public pattern as
-- every other table in schema.sql.
alter table site_settings enable row level security;
drop policy if exists "Public can view site settings" on site_settings;
create policy "Public can view site settings" on site_settings for select using (true);
