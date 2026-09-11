-- Preserve the final payment/completion state in the order ledger.
alter table public.lunch_orders
  drop constraint if exists lunch_orders_status_check;

alter table public.lunch_orders
  add constraint lunch_orders_status_check
  check (status in ('selected', 'locked', 'completed'));
