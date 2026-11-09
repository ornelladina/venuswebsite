-- =========================================================
-- HERO TEXT COLORS + PER-PHOTO MOBILE HERO POSITION/ZOOM
-- Run this once in Supabase SQL Editor.
--
-- 1) Adds an optional text color per hero slide (heading + subtext
--    together), editable at /admin/dashboard/homepage/images -> "Hero
--    Text & Buttons". Defaults to '' (empty = "no override"), so nothing
--    changes visually until a slide's color is actually set — the
--    existing CSS defaults keep applying as-is (brown on desktop, beige
--    on mobile, see the "Site beige on mobile per request" comments in
--    globals.css). Once set, that one color applies on both desktop and
--    mobile for that slide.
--
-- 2) Splits the mobile hero's shared position/zoom (hero_mobile_position
--    / hero_mobile_zoom — one crop setting applied to all 3 mobile
--    photos) into one position + zoom per photo, so each of the 3
--    mobile photos can be repositioned/resized independently. The old
--    shared columns are left in place (unused) rather than dropped, so
--    this migration is safe to run without anything breaking if it's
--    run twice or alongside older code.
-- =========================================================

alter table site_settings add column if not exists hero_1_text_color text not null default '';
alter table site_settings add column if not exists hero_2_text_color text not null default '';
alter table site_settings add column if not exists hero_3_text_color text not null default '';

-- Same "raw inset percentage" convention as hero_desktop_zoom /
-- hero_mobile_zoom (higher number = more cropped in). Range in the admin
-- UI now goes well past the old 25 cap since these are per-photo.
alter table site_settings add column if not exists hero_mobile_1_position text not null default '50% 0%';
alter table site_settings add column if not exists hero_mobile_1_zoom numeric not null default 12;
alter table site_settings add column if not exists hero_mobile_2_position text not null default '50% 0%';
alter table site_settings add column if not exists hero_mobile_2_zoom numeric not null default 12;
alter table site_settings add column if not exists hero_mobile_3_position text not null default '50% 0%';
alter table site_settings add column if not exists hero_mobile_3_zoom numeric not null default 12;

-- Carry over whatever the shared mobile position/zoom already was, so the
-- mobile hero looks exactly the same right after running this — the 3
-- photos just become independently adjustable going forward.
update site_settings
set
  hero_mobile_1_position = hero_mobile_position,
  hero_mobile_1_zoom = hero_mobile_zoom,
  hero_mobile_2_position = hero_mobile_position,
  hero_mobile_2_zoom = hero_mobile_zoom,
  hero_mobile_3_position = hero_mobile_position,
  hero_mobile_3_zoom = hero_mobile_zoom
where id = true;
