-- Shared menu for Bún Riêu Bà Kiều.
insert into public.restaurants (id, name)
values ('bun-rieu-ba-kieu', 'Bún Riêu Bà Kiều')
on conflict (id) do update
set name = excluded.name,
    is_active = true,
    updated_at = now();

insert into public.dishes (id, restaurant_id, name, price, emoji, category)
values
  ('bun-rieu-ba-kieu-bun-rieu-cha-nuong', 'bun-rieu-ba-kieu', 'Bún riêu chả nướng', 35000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-la-lot', 'bun-rieu-ba-kieu', 'Bún riêu lá lốt', 35000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-thap-cam', 'bun-rieu-ba-kieu', 'Bún riêu thập cẩm', 55000, '🍲', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-dau-bo', 'bun-rieu-ba-kieu', 'Bún riêu đậu bò', 35000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-gio-tai-bo', 'bun-rieu-ba-kieu', 'Bún riêu giò tai, bò', 40000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-banh-da-tron', 'bun-rieu-ba-kieu', 'Bánh đa trộn', 40000, '🍝', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-gio-tai', 'bun-rieu-ba-kieu', 'Bún riêu giò tai', 35000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-dau', 'bun-rieu-ba-kieu', 'Bún riêu đậu', 25000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-bun-rieu-moc', 'bun-rieu-ba-kieu', 'Bún riêu mọc', 35000, '🍜', 'Món chính'),
  ('bun-rieu-ba-kieu-tra-da', 'bun-rieu-ba-kieu', 'Trà đá', 3000, '🧊', 'Đồ uống'),
  ('bun-rieu-ba-kieu-tra-quat', 'bun-rieu-ba-kieu', 'Trà quất', 15000, '🍹', 'Đồ uống'),
  ('bun-rieu-ba-kieu-sua-dau-nanh', 'bun-rieu-ba-kieu', 'Sữa đậu nành', 10000, '🥛', 'Đồ uống'),
  ('bun-rieu-ba-kieu-coca-cola', 'bun-rieu-ba-kieu', 'Coca Cola', 15000, '🥤', 'Đồ uống'),
  ('bun-rieu-ba-kieu-nuoc-cam', 'bun-rieu-ba-kieu', 'Nước cam', 15000, '🍊', 'Đồ uống'),
  ('bun-rieu-ba-kieu-bia-tiger-bac', 'bun-rieu-ba-kieu', 'Bia Tiger Bạc', 22000, '🍺', 'Đồ uống'),
  ('bun-rieu-ba-kieu-bia-sai-gon', 'bun-rieu-ba-kieu', 'Bia Sài Gòn', 22000, '🍺', 'Đồ uống'),
  ('bun-rieu-ba-kieu-bo-huc', 'bun-rieu-ba-kieu', 'Bò húc', 20000, '🥫', 'Đồ uống'),
  ('bun-rieu-ba-kieu-quay', 'bun-rieu-ba-kieu', 'Quẩy', 2000, '🥖', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-trung-vit-lon', 'bun-rieu-ba-kieu', 'Trứng vịt lộn', 8000, '🥚', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-cha-nuong-them', 'bun-rieu-ba-kieu', 'Chả nướng thêm', 10000, '🍢', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-cha-la-lot-them', 'bun-rieu-ba-kieu', 'Chả lá lốt thêm', 10000, '🍢', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-gio-tai-them', 'bun-rieu-ba-kieu', 'Giò tai thêm', 10000, '🍖', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-top-mo-them', 'bun-rieu-ba-kieu', 'Tóp mỡ thêm', 10000, '🥓', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-moc-them', 'bun-rieu-ba-kieu', 'Mọc thêm', 10000, '🍡', 'Đồ gọi thêm'),
  ('bun-rieu-ba-kieu-bo-them', 'bun-rieu-ba-kieu', 'Bò thêm', 10000, '🥩', 'Đồ gọi thêm')
on conflict (id) do update
set restaurant_id = excluded.restaurant_id,
    name = excluded.name,
    price = excluded.price,
    emoji = excluded.emoji,
    category = excluded.category,
    is_active = true,
    updated_at = now();
