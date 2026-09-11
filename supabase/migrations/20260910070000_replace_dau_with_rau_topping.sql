-- The restaurant's standard add-ons are Mix Lạc and Mix Rau. Deactivate the
-- earlier placeholder Mix Đậu row if that migration was already applied.
update public.dishes
set is_active = false
where id = 'com-anh-thang-dau';

insert into public.dishes (id, restaurant_id, name, price, emoji, category)
values ('com-anh-thang-rau', 'com-anh-thang', 'Rau', 0, '🥬', 'Topping')
on conflict (id) do update
set
  name = excluded.name,
  emoji = excluded.emoji,
  category = excluded.category,
  is_active = true,
  updated_at = now();
