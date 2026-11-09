-- =========================================================
-- ZOOM — run this once in Supabase SQL Editor.
-- Lets you set how zoomed-in a product photo appears, per photo,
-- without touching code. Works alongside focal_point: focal_point
-- controls WHICH part of the photo stays visible, zoom controls
-- HOW CLOSE it looks.
--
-- Value guide:
--   1    = normal, no zoom (default)
--   1.2  = zoomed in 20%
--   1.5  = zoomed in 50%
-- Anything below 1 zooms OUT and will show empty space, so keep it
-- at 1 or above.
-- =========================================================

alter table product_images add column zoom numeric not null default 1;
