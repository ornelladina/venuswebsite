-- =========================================================
-- ZOOM RESET — run this once in Supabase SQL Editor.
--
-- Undoes migration_zoom_default_1_2.sql. That migration set every
-- photo's zoom to 1.2 so photos would fill their frame with no cream
-- on the sides. But object_fit: cover (see migration below / the
-- code) already does that job on its own — it scales a photo up just
-- enough to completely fill the frame, with zero cream, regardless of
-- the photo's own proportions. Stacking an extra 1.2x zoom on top of
-- that was cropping the photo a 2nd time — cropping into the product
-- itself, not just the empty space around it — which is the "image
-- gets cropped, then the zoom is applied on the already cropped
-- image" problem.
--
-- This does two things:
--   1. Changes the column's default back to 1, so any NEW photo you
--      add from now on starts at 1 (no extra zoom — cover alone fills
--      the frame).
--   2. Updates every EXISTING photo that's still sitting at exactly
--      1.2 back down to 1. It only touches rows at exactly 1.2 — any
--      photo you've deliberately zoomed in further than that (e.g. to
--      3+, for a close-up of detail work) is left exactly as you set
--      it, since that's an intentional choice rather than the old
--      blanket default.
-- =========================================================

alter table product_images alter column zoom set default 1;

update product_images set zoom = 1 where zoom = 1.2;
