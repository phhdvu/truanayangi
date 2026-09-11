-- Durable snapshots of each member's selected lunch.
-- Group state remains the source for the live room, while this table keeps a
-- compact personal history that can be queried without scanning every group.
create table if not exists public.lunch_orders (
  group_id uuid not null references public.lunch_groups(id) on delete cascade,
  member_id uuid not null references public.internal_users(id) on delete cascade,
  day text not null,
  group_name text not null,
  dish_id text not null,
  dish_name text not null,
  restaurant text not null default '',
  price integer not null default 0 check (price >= 0 and price <= 10000000),
  emoji text not null default '🍽️',
  status text not null default 'selected' check (status in ('selected', 'locked')),
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

create index if not exists lunch_orders_member_day_idx
  on public.lunch_orders (member_id, day desc, updated_at desc);

create index if not exists lunch_orders_group_idx
  on public.lunch_orders (group_id);

alter table public.lunch_orders enable row level security;

-- Backfill selections already stored inside group snapshots. Demo identities do
-- not exist in internal_users and are intentionally skipped here.
insert into public.lunch_orders (
  group_id,
  member_id,
  day,
  group_name,
  dish_id,
  dish_name,
  restaurant,
  price,
  emoji,
  status,
  selected_at,
  updated_at
)
select
  groups.id,
  (vote.member_id)::uuid,
  groups.day,
  coalesce(groups.state->>'name', 'Nhóm ăn trưa'),
  dish.value->>'id',
  coalesce(dish.value->>'name', 'Món ăn'),
  coalesce(dish.value->>'restaurant', ''),
  least(
    greatest(
      case
        when (dish.value->>'price') ~ '^[0-9]+$'
          then (dish.value->>'price')::integer
        else 0
      end,
      0
    ),
    10000000
  ),
  coalesce(dish.value->>'emoji', '🍽️'),
  case
    when nullif(groups.state->>'closedAt', '') is not null
      or nullif(groups.state->>'winnerId', '') is not null
      then 'locked'
    else 'selected'
  end,
  groups.created_at,
  groups.created_at
from public.lunch_groups as groups
cross join lateral jsonb_each_text(
  coalesce(groups.state->'votes', '{}'::jsonb)
) as vote(member_id, dish_id)
cross join lateral jsonb_array_elements(
  coalesce(groups.state->'dishes', '[]'::jsonb)
) as dish(value)
where dish.value->>'id' = vote.dish_id
  and vote.member_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.internal_users as users
    where users.id = (vote.member_id)::uuid
  )
on conflict (group_id, member_id) do nothing;
