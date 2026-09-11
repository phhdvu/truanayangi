-- Server-side storage for lunch groups.
-- The API connects with the database password, so no public Data API policy is
-- needed for this table. RLS stays enabled to prevent accidental future
-- exposure through Supabase's REST/GraphQL APIs.
create table if not exists public.lunch_groups (
  id uuid primary key,
  day text not null,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists lunch_groups_day_idx
  on public.lunch_groups (day, created_at desc);

alter table public.lunch_groups enable row level security;

-- Internal accounts are provisioned by the server-side create-user script.
-- Passwords are stored as scrypt hashes with a unique per-user salt.
create table if not exists public.internal_users (
  id uuid primary key,
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  password_salt text not null,
  password_algorithm text not null default 'scrypt-v1',
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_users_username_lowercase check (username = lower(username))
);

create table if not exists public.auth_sessions (
  id uuid primary key,
  user_id uuid not null references public.internal_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_sessions_user_id_idx
  on public.auth_sessions (user_id);

create index if not exists auth_sessions_expires_at_idx
  on public.auth_sessions (expires_at);

alter table public.internal_users enable row level security;
alter table public.auth_sessions enable row level security;
