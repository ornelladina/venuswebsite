-- =========================================================
-- OBJECT_FIT — safe to run even if you already have this column.
-- The app code (ProductCard.tsx, ProductDetail.tsx, types/index.ts) has
-- referenced product_images.object_fit for a while, but no migration
-- file for it was in the project export, so this makes sure it actually
-- exists in your database. Run this once in the Supabase SQL Editor.
-- =========================================================

alter table product_images add column if not exists object_fit text;

comment on column product_images.object_fit is
  '''contain'' (default, full photo visible, may letterbox) or ''cover'' (fills the frame, crops using focal_point). Null = treated as contain.';
