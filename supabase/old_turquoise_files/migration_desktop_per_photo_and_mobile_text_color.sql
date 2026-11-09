-- =========================================================
-- DESKTOP HERO: PER-PHOTO POSITION/ZOOM  +  MOBILE HERO TEXT COLORS
-- Run this once in Supabase SQL Editor (safe to run twice).
--
-- 1) The 3 desktop hero photos each get their own position + zoom (before,
--    all 3 shared one pair). Whatever the shared position/zoom was is
--    copied into each, so the hero looks the same right after running this.
--
-- 2) Each hero text slide gets its own MOBILE text color. Whatever color the
--    slide already had is copied across, so nothing changes visually until
--    you pick a different one. Empty = default (beige on mobile).
-- =========================================================

alter table site_settings add column if not exists hero_desktop_1_position text not null default '50% 50%';
alter table site_settings add column if not exists hero_desktop_1_zoom numeric not null default 3;
alter table site_settings add column if not exists hero_desktop_2_position text not null default '50% 50%';
alter table site_settings add column if not exists hero_desktop_2_zoom numeric not null default 3;
alter table site_settings add column if not exists hero_desktop_3_position text not null default '50% 50%';
alter table site_settings add column if not exists hero_desktop_3_zoom numeric not null default 3;

alter table site_settings add column if not exists hero_mobile_1_text_color text not null default '';
alter table site_settings add column if not exists hero_mobile_2_text_color text not null default '';
alter table site_settings add column if not exists hero_mobile_3_text_color text not null default '';

update site_settings
set
  hero_desktop_1_position = hero_desktop_position,
  hero_desktop_1_zoom = hero_desktop_zoom,
  hero_desktop_2_position = hero_desktop_position,
  hero_desktop_2_zoom = hero_desktop_zoom,
  hero_desktop_3_position = hero_desktop_position,
  hero_desktop_3_zoom = hero_desktop_zoom,
  hero_mobile_1_text_color = hero_1_text_color,
  hero_mobile_2_text_color = hero_2_text_color,
  hero_mobile_3_text_color = hero_3_text_color
where id = true;
