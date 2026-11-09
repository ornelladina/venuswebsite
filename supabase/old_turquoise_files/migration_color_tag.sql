-- Adds a dedicated column for matching a gallery image to a variation value
-- (e.g. "Blue"), separate from `label` which is free-text notes for your own
-- reference (e.g. "pink hamsa animal bangle").
alter table product_images add column color_tag text;

comment on column product_images.color_tag is
  'Exact variation value (e.g. Blue, Pink, White) used to highlight this image when that option is selected. Leave blank if this image should not auto-select. Not shown to customers.';
