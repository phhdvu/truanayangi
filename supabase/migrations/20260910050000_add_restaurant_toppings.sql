-- Optional mix/topping choices for each restaurant. They live in the same
-- catalog table as dishes and are separated by the category value so older
-- deployments keep working until this seed migration is applied.
insert into public.dishes (id, restaurant_id, name, price, emoji, category)
values
  ('com-anh-thang-lac', 'com-anh-thang', 'Lạc', 0, '🥜', 'Topping'),
  ('com-anh-thang-rau', 'com-anh-thang', 'Rau', 0, '🥬', 'Topping')
on conflict (id) do nothing;
