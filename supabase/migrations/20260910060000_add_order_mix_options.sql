-- Keep each member's optional mix/topping selections alongside the durable
-- order snapshot used by personal spending history.
alter table public.lunch_orders
  add column if not exists mix_ids text[] not null default '{}'::text[];

alter table public.lunch_orders
  add column if not exists mix_names text[] not null default '{}'::text[];
