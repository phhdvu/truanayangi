-- Shared restaurant and dish catalog used when creating a lunch group.
-- The API reads this catalog with the server-side database connection; RLS is
-- enabled so the tables are not accidentally exposed through Supabase's
-- public Data API.
create table if not exists public.restaurants (
  id text primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists restaurants_name_lower_idx
  on public.restaurants (lower(name));

create table if not exists public.dishes (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  price integer not null default 0 check (price >= 0 and price <= 10000000),
  emoji text not null default '🍽️',
  category text not null default 'Món ăn',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dishes_restaurant_name_lower_idx
  on public.dishes (restaurant_id, lower(name));

create index if not exists dishes_restaurant_active_idx
  on public.dishes (restaurant_id, is_active, name);

alter table public.restaurants enable row level security;
alter table public.dishes enable row level security;

-- Seed the first shared menu. DO NOTHING keeps later edits made by an
-- administrator intact when the setup script is run again.
insert into public.restaurants (id, name)
values ('com-anh-thang', 'Cơm anh Thắng')
on conflict (id) do nothing;

insert into public.dishes (id, restaurant_id, name, price, emoji, category)
values
  ('com-anh-thang-com-ga-sot', 'com-anh-thang', 'Cơm Gà Sốt', 0, '🍗', 'Cơm'),
  ('com-anh-thang-com-bo-xao-dua', 'com-anh-thang', 'Cơm Bò Xào Dưa', 0, '🥩', 'Cơm'),
  ('com-anh-thang-com-xa-xiu', 'com-anh-thang', 'Cơm Xá Xíu', 0, '🍖', 'Cơm'),
  ('com-anh-thang-com-thit-kho', 'com-anh-thang', 'Cơm Thịt Kho', 0, '🍲', 'Cơm')
on conflict (id) do nothing;
