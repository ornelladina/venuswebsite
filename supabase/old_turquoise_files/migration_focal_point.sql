-- =========================================================
-- FOCAL POINT — run this once in Supabase SQL Editor.
-- Lets you control which part of a product photo stays visible
-- under the "Add to Cart" button, per photo, without touching code.
-- =========================================================

alter table product_images add column focal_point text;

-- =========================================================
-- LABEL — a short name for each photo, so product_images is easy
-- to scan once you have lots of photos. Also used as the image's
-- alt text (accessibility + SEO), so it's worth filling in.
-- =========================================================

alter table product_images add column label text;
