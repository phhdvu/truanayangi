-- Keep the person who paid the completed group order alongside each member's
-- durable order snapshot so the spending history can show who to reimburse.
alter table public.lunch_orders
  add column if not exists payer_id uuid references public.internal_users(id) on delete set null;

alter table public.lunch_orders
  add column if not exists payer_name text;
