-- =========================================================
-- SAVED CART + FAVORITES FOR SIGNED-IN CUSTOMERS
-- Run this ONCE in Supabase SQL Editor, BEFORE (or right after) uploading
-- the new website code. Safe to run again.
--
-- (This file is NOT part of the website code. It only updates the
-- database.)
--
-- What it does: creates a small table that stores each signed-in
-- customer's cart and favorites, so they follow the customer to any
-- device. Each customer can only read and change their OWN row.
-- Guests (not signed in) are not affected: their cart and favorites
-- stay in their own browser, as before.
-- =========================================================

create table if not exists customer_saved (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorites jsonb not null default '[]'::jsonb,
  cart jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table customer_saved enable row level security;

drop policy if exists "Customers manage their own saved items" on customer_saved;
create policy "Customers manage their own saved items"
  on customer_saved for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
