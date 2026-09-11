import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { restaurants as demoRestaurants, type Restaurant } from "@/lib/lunch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CatalogRow = {
  restaurantId: string;
  restaurantName: string;
  dishId: string | null;
  dishName: string | null;
  price: number | null;
  emoji: string | null;
  category: string | null;
};

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function catalogFromRows(rows: CatalogRow[]): Restaurant[] {
  const catalog = new Map<string, Restaurant>();
  for (const row of rows) {
    const restaurant =
      catalog.get(row.restaurantId) ??
      ({
        id: row.restaurantId,
        name: row.restaurantName,
        dishes: [],
        toppings: [],
        drinks: [],
        extras: [],
      } satisfies Restaurant);
    if (row.dishId && row.dishName) {
      const item = {
        id: row.dishId,
        name: row.dishName,
        restaurant: row.restaurantName,
        price: row.price ?? 0,
        emoji: row.emoji ?? "🍽️",
        category: row.category ?? "Món ăn",
      };
      const category = item.category.toLocaleLowerCase("vi");
      if (category === "topping")
        restaurant.toppings?.push(item);
      else if (category === "đồ uống") restaurant.drinks?.push(item);
      else if (category === "đồ gọi thêm") restaurant.extras?.push(item);
      else restaurant.dishes.push(item);
    }
    catalog.set(row.restaurantId, restaurant);
  }
  return [...catalog.values()].map((restaurant) => ({
    ...restaurant,
    mixFromMenu: (restaurant.toppings?.length ?? 0) > 0,
  }));
}

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL)
    return reply({ mode: "demo", restaurants: demoRestaurants });

  try {
    const user = await currentUser(req);
    if (!user)
      return reply(
        {
          error: "Bạn cần đăng nhập để xem danh sách quán.",
          code: "AUTH_REQUIRED",
        },
        401,
      );
    if (user.mustChangePassword)
      return reply(
        {
          error: "Hãy đổi mật khẩu trước khi xem danh sách quán.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        403,
      );

    const rows = (await db()`
      SELECT
        r.id AS "restaurantId",
        r.name AS "restaurantName",
        d.id AS "dishId",
        d.name AS "dishName",
        d.price,
        d.emoji,
        d.category
      FROM public.restaurants AS r
      LEFT JOIN public.dishes AS d
        ON d.restaurant_id = r.id
       AND d.is_active = true
      WHERE r.is_active = true
      ORDER BY r.name ASC, d.name ASC
    `) as CatalogRow[];

    return reply({ mode: "live", restaurants: catalogFromRows(rows) });
  } catch (error) {
    console.error(
      "Restaurant catalog read failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return reply(
      {
        error:
          "Chưa tải được danh sách quán. Kiểm tra migration catalog và kết nối Supabase.",
      },
      503,
    );
  }
}
