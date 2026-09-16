import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { SpendingEntry } from "@/lib/spending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL)
    return reply({ mode: "demo", entries: [] satisfies SpendingEntry[] });

  try {
    const user = await currentUser(req);
    if (!user)
      return reply(
        {
          error: "Bạn cần đăng nhập để xem thống kê cá nhân.",
          code: "AUTH_REQUIRED",
        },
        401,
      );
    if (user.mustChangePassword)
      return reply(
        {
          error: "Hãy đổi mật khẩu trước khi xem thống kê.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        403,
      );

    const sql = db();
    const rows = await sql`
      SELECT
        group_id AS "groupId",
        member_id AS "memberId",
        day,
        group_name AS "groupName",
        dish_id AS "dishId",
        dish_name AS "dishName",
        restaurant,
        price,
        total_price AS "totalPrice",
        emoji,
        mix_names AS "mixNames",
        drink_names AS "drinkNames",
        extra_names AS "extraNames",
        payer_name AS "payerName"
      FROM public.lunch_orders
      WHERE member_id = ${user.id}
        AND company_code = ${user.companyCode}
      ORDER BY day DESC, updated_at DESC
    `;
    const orders = rows as unknown as Array<{
      groupId: string;
      memberId: string;
      day: string;
      groupName: string;
      dishId: string;
      dishName: string;
      restaurant: string;
      price: number;
      totalPrice: number | null;
      emoji: string;
      mixNames: string[] | null;
      drinkNames: string[] | null;
      extraNames: string[] | null;
      payerName: string | null;
    }>;
    return reply({
      mode: "live",
      entries: orders.map((order): SpendingEntry => ({
        id: `${order.groupId}:${order.memberId}`,
        groupId: order.groupId,
        groupName: order.groupName,
        date: order.day,
        dishName: order.dishName,
        restaurant: order.restaurant,
        emoji: order.emoji,
        mixNames: Array.isArray(order.mixNames) ? order.mixNames : [],
        drinkNames: Array.isArray(order.drinkNames) ? order.drinkNames : [],
        extraNames: Array.isArray(order.extraNames) ? order.extraNames : [],
        payerName: order.payerName,
        price:
          Number.isFinite(Number(order.totalPrice)) && Number(order.totalPrice) > 0
            ? Math.round(Number(order.totalPrice))
            : Number.isFinite(Number(order.price)) && Number(order.price) > 0
              ? Math.round(Number(order.price))
            : 0,
      })),
    });
  } catch (error) {
    console.error(
      "Spending stats read failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return reply(
      { error: "Chưa tải được thống kê. Hãy thử lại sau." },
      503,
    );
  }
}
