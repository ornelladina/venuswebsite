-- =========================================================
-- HERO TEXT SLIDES — run this once in Supabase SQL Editor.
-- Adds 3 independent sets of hero heading/subtext/button text+link (one
-- per hero photo) to site_settings, editable from the admin dashboard at
-- Cover Images -> "Hero Text & Buttons". All 3 default to today's exact
-- text/button so nothing changes on the live site until you edit them.
-- =========================================================

alter table site_settings
  add column if not exists hero_1_heading text not null default 'Trendy. Classy.
Affordable.',
  add column if not exists hero_1_subtext text not null default 'Fashion accessories that don''t make you choose.',
  add column if not exists hero_1_button_label text not null default 'SHOP NOW',
  add column if not exists hero_1_button_link text not null default '/shop',
  add column if not exists hero_2_heading text not null default 'Trendy. Classy.
Affordable.',
  add column if not exists hero_2_subtext text not null default 'Fashion accessories that don''t make you choose.',
  add column if not exists hero_2_button_label text not null default 'SHOP NOW',
  add column if not exists hero_2_button_link text not null default '/shop',
  add column if not exists hero_3_heading text not null default 'Trendy. Classy.
Affordable.',
  add column if not exists hero_3_subtext text not null default 'Fashion accessories that don''t make you choose.',
  add column if not exists hero_3_button_label text not null default 'SHOP NOW',
  add column if not exists hero_3_button_link text not null default '/shop';
