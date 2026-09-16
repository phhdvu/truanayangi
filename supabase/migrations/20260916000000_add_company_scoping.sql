-- Scope accounts, restaurants, groups, and durable orders by company code.
-- Existing data belongs to DST and is backfilled into the dst namespace.

alter table public.internal_users
  add column if not exists company_code text;

update public.internal_users
set company_code = case
  when position('.' in username) > 0 then split_part(username, '.', 1)
  else 'dst'
end
where company_code is null;

alter table public.internal_users
  alter column company_code set default 'dst',
  alter column company_code set not null;

alter table public.internal_users
  drop constraint if exists internal_users_company_code_format;

alter table public.internal_users
  add constraint internal_users_company_code_format
  check (company_code ~ '^[a-z0-9][a-z0-9-]{1,19}$');

alter table public.restaurants
  add column if not exists company_code text;

update public.restaurants
set company_code = 'dst'
where company_code is null;

alter table public.restaurants
  alter column company_code set default 'dst',
  alter column company_code set not null;

alter table public.restaurants
  drop constraint if exists restaurants_company_code_format;

alter table public.restaurants
  add constraint restaurants_company_code_format
  check (company_code ~ '^[a-z0-9][a-z0-9-]{1,19}$');

alter table public.lunch_groups
  add column if not exists company_code text;

update public.lunch_groups
set
  company_code = coalesce(nullif(state->>'companyCode', ''), company_code, 'dst'),
  state = state || jsonb_build_object(
    'companyCode', coalesce(nullif(state->>'companyCode', ''), company_code, 'dst')
  )
where company_code is null
   or nullif(state->>'companyCode', '') is null;

alter table public.lunch_groups
  alter column company_code set default 'dst',
  alter column company_code set not null;

alter table public.lunch_groups
  drop constraint if exists lunch_groups_company_code_format;

alter table public.lunch_groups
  add constraint lunch_groups_company_code_format
  check (company_code ~ '^[a-z0-9][a-z0-9-]{1,19}$');

alter table public.lunch_orders
  add column if not exists company_code text;

update public.lunch_orders as orders
set company_code = groups.company_code
from public.lunch_groups as groups
where groups.id = orders.group_id
  and orders.company_code is null;

update public.lunch_orders
set company_code = 'dst'
where company_code is null;

alter table public.lunch_orders
  alter column company_code set default 'dst',
  alter column company_code set not null;

alter table public.lunch_orders
  drop constraint if exists lunch_orders_company_code_format;

alter table public.lunch_orders
  add constraint lunch_orders_company_code_format
  check (company_code ~ '^[a-z0-9][a-z0-9-]{1,19}$');

create index if not exists internal_users_company_idx
  on public.internal_users (company_code, is_active, username);

create index if not exists restaurants_company_active_idx
  on public.restaurants (company_code, is_active, name);

create index if not exists lunch_groups_company_day_idx
  on public.lunch_groups (company_code, day, created_at desc);

create index if not exists lunch_orders_company_member_day_idx
  on public.lunch_orders (company_code, member_id, day desc, updated_at desc);
