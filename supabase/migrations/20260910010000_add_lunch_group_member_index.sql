-- Keep personal spending lookups fast as the lunch group history grows.
create index if not exists lunch_groups_members_gin_idx
  on public.lunch_groups using gin ((state->'members'));
