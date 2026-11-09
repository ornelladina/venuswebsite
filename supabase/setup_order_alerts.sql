-- =========================================================
-- VENUS BIJOUX — ORDER ALERTS (run AFTER setup.sql and AFTER the first deploy)
-- Run this once in Supabase SQL Editor. Does the exact same
-- job as the Database > Webhooks screen would have, just
-- without needing that screen to show up.
--
-- BEFORE RUNNING: replace the two placeholders below —
--   1. YOUR-DOMAIN-HERE -> your real Vercel site address
--   2. YOUR-WEBHOOK-SECRET-HERE -> the exact WEBHOOK_SECRET
--      value you typed into Vercel's environment variables
-- =========================================================

create extension if not exists pg_net;

create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://YOUR-DOMAIN-HERE/api/order-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'YOUR-WEBHOOK-SECRET-HERE'
    ),
    body := jsonb_build_object('record', row_to_json(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_order on orders;

create trigger trg_notify_new_order
after insert on orders
for each row execute function public.notify_new_order();
