-- Drinks and extra items are ordered separately from mix/topping choices.
-- Keep both the ids and names in the durable order snapshot for history.
alter table public.lunch_orders
  add column if not exists drink_ids text[] not null default '{}'::text[];

alter table public.lunch_orders
  add column if not exists drink_names text[] not null default '{}'::text[];

alter table public.lunch_orders
  add column if not exists extra_ids text[] not null default '{}'::text[];

alter table public.lunch_orders
  add column if not exists extra_names text[] not null default '{}'::text[];
