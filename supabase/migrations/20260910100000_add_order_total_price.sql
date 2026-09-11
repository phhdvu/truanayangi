-- Store the full amount for one member's order, including drinks and extra
-- items. Keep price as the main-dish price for backwards compatibility.
alter table public.lunch_orders
  add column if not exists total_price integer not null default 0;

update public.lunch_orders
set total_price = price
where total_price = 0
  and price > 0;
