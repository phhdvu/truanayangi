-- Add the latest main dishes to Cơm anh Thắng's shared catalog.
-- Prices stay at zero until the restaurant prices are provided.
insert into public.dishes (id, restaurant_id, name, price, emoji, category)
values
  ('com-anh-thang-com-ca-kho', 'com-anh-thang', 'Cơm Cá Kho', 0, '🐟', 'Cơm'),
  ('com-anh-thang-com-ga-xao', 'com-anh-thang', 'Cơm Gà Xào', 0, '🍗', 'Cơm'),
  ('com-anh-thang-com-ga-rang', 'com-anh-thang', 'Cơm Gà Rang', 0, '🍗', 'Cơm')
on conflict (id) do update
set
  restaurant_id = excluded.restaurant_id,
  name = excluded.name,
  price = excluded.price,
  emoji = excluded.emoji,
  category = excluded.category,
  is_active = true,
  updated_at = now();
