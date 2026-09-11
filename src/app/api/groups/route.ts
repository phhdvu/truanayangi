import { createHash, randomBytes, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  changeGroup,
  isLocked,
  summary,
  today,
  type LunchGroup,
} from "@/lib/lunch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const text = z.string().trim().min(2).max(60);
const dish = z.object({
  id: z.string().min(1).max(80),
  name: text,
  restaurant: z.string().trim().max(100),
  price: z.number().int().min(0).max(10000000),
  emoji: z.string().max(12),
  category: z.string().max(30),
});
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: text,
    groupName: text,
    restaurantName: z.string().trim().min(2).max(100).optional(),
    dishes: z.array(dish).max(30),
    toppings: z.array(dish).max(20).optional(),
    drinks: z.array(dish).max(20).optional(),
    extras: z.array(dish).max(30).optional(),
    mixFromMenu: z.boolean().optional(),
  }),
  z.object({ action: z.literal("join"), groupId: z.uuid(), name: text }),
  z.object({
    action: z.literal("vote"),
    groupId: z.uuid(),
    dishId: z.string().max(80),
    mixIds: z.array(z.string().min(1).max(80)).max(2).optional(),
    drinkIds: z.array(z.string().min(1).max(80)).max(10).optional(),
    extraIds: z.array(z.string().min(1).max(80)).max(20).optional(),
  }),
  z.object({ action: z.literal("confirm"), groupId: z.uuid() }),
  z.object({ action: z.literal("unconfirm"), groupId: z.uuid() }),
  z.object({
    action: z.literal("close"),
    groupId: z.uuid(),
    dishId: z.string().max(80),
  }),
  z.object({ action: z.literal("lock"), groupId: z.uuid() }),
  z.object({ action: z.literal("reopen"), groupId: z.uuid() }),
  z.object({
    action: z.literal("complete"),
    groupId: z.uuid(),
    payerId: z.string().min(1).max(80).nullable().optional(),
    payerName: text,
  }),
  z.object({ action: z.literal("delete"), groupId: z.uuid() }),
  z.object({
    action: z.literal("removeDish"),
    groupId: z.uuid(),
    dishId: z.string().max(80),
  }),
  z.object({ action: z.literal("addDish"), groupId: z.uuid(), dish }),
  z.object({
    action: z.literal("draw"),
    groupId: z.uuid(),
    count: z.union([z.literal(1), z.literal(3)]),
  }),
  z.object({
    action: z.literal("deadline"),
    groupId: z.uuid(),
    deadline: z.iso.datetime({ offset: true }).nullable(),
  }),
]);
const orderLedgerActions = new Set([
  "vote",
  "close",
  "lock",
  "reopen",
  "complete",
  "removeDish",
]);
function identity(req: NextRequest) {
  const existing = req.cookies.get("lunch_identity")?.value;
  const token =
    existing && /^[a-f0-9]{64}$/.test(existing)
      ? existing
      : randomBytes(32).toString("hex");
  return { token, id: createHash("sha256").update(token).digest("hex") };
}
function reply(req: NextRequest, data: unknown, status = 200, token?: string) {
  const response = NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (token)
    response.cookies.set("lunch_identity", token, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  return response;
}
export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    const { token, id } = identity(req);
    return reply(req, { mode: "demo", memberId: id }, 200, token);
  }
  try {
    const user = await currentUser(req);
    if (!user)
      return reply(
        req,
        {
          error: "Bạn cần đăng nhập để vào bàn ăn.",
          code: "AUTH_REQUIRED",
        },
        401,
      );
    if (user.mustChangePassword)
      return reply(
        req,
        {
          error: "Hãy đổi mật khẩu trước khi vào bàn ăn.",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        403,
      );
    const id = user.id;
    const groupId = req.nextUrl.searchParams.get("id");
    if (groupId) {
      if (!z.uuid().safeParse(groupId).success)
        return reply(req, { error: "Mã nhóm không hợp lệ." }, 400);
      const rows =
        await db()`SELECT state FROM public.lunch_groups WHERE id = ${groupId}`;
      if (!rows.length)
        return reply(req, { error: "Không tìm thấy nhóm này." }, 404);
      const group = rows[0].state as LunchGroup;
      if (!group.members.some((m) => m.id === id))
        return reply(
          req,
          { error: "Hãy tham gia nhóm từ danh sách trước." },
          403,
        );
      return reply(req, { mode: "live", memberId: id, group });
    }
    const date = req.nextUrl.searchParams.get("date") ?? today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return reply(req, { error: "Ngày không hợp lệ." }, 400);
    const rows =
      await db()`SELECT state FROM public.lunch_groups WHERE day = ${date} ORDER BY created_at DESC LIMIT 100`;
    return reply(req, {
      mode: "live",
      memberId: id,
      groups: rows.map((r) => summary(r.state as LunchGroup, id)),
    });
  } catch (error) {
    console.error(
      "Group read failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return reply(
      req,
      {
        error:
          "Chưa kết nối được dữ liệu. Kiểm tra DATABASE_URL và chạy pnpm db:setup.",
      },
      503,
    );
  }
}
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return reply(req, { error: "Yêu cầu không hợp lệ." }, 403);
  if (!process.env.DATABASE_URL)
    return reply(req, { error: "Chế độ demo chỉ lưu trên trình duyệt." }, 503);
  let user: Awaited<ReturnType<typeof currentUser>>;
  try {
    user = await currentUser(req);
  } catch (error) {
    console.error(
      "Group auth failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return reply(req, { error: "Chưa kiểm tra được phiên đăng nhập." }, 503);
  }
  if (!user)
    return reply(
      req,
      { error: "Bạn cần đăng nhập để vào bàn ăn.", code: "AUTH_REQUIRED" },
      401,
    );
  if (user.mustChangePassword)
    return reply(
      req,
      {
        error: "Hãy đổi mật khẩu trước khi vào bàn ăn.",
        code: "PASSWORD_CHANGE_REQUIRED",
      },
      403,
    );
  let input: z.infer<typeof actionSchema>;
  try {
    const raw = await req.text();
    if (raw.length > 24000)
      return reply(req, { error: "Dữ liệu quá lớn." }, 413);
    const parsed = actionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return reply(
        req,
        { error: "Kiểm tra tên, món và thông tin vừa nhập nhé." },
        400,
      );
    input = parsed.data;
  } catch {
    return reply(
      req,
      { error: "Kiểm tra tên, món và thông tin vừa nhập nhé." },
      400,
    );
  }
  try {
    if (input.action === "create") {
      if (new Set(input.dishes.map((d) => d.id)).size !== input.dishes.length)
        return reply(req, { error: "Danh sách món bị trùng." }, 400);
      const toppings = input.toppings ?? [];
      const drinks = input.drinks ?? [];
      const extras = input.extras ?? [];
      if (new Set(toppings.map((topping) => topping.id)).size !== toppings.length)
        return reply(req, { error: "Danh sách topping bị trùng." }, 400);
      if (new Set(drinks.map((drink) => drink.id)).size !== drinks.length)
        return reply(req, { error: "Danh sách đồ uống bị trùng." }, 400);
      if (new Set(extras.map((extra) => extra.id)).size !== extras.length)
        return reply(req, { error: "Danh sách đồ gọi thêm bị trùng." }, 400);
      const allCatalogIds = [
        ...input.dishes.map((item) => item.id),
        ...toppings.map((item) => item.id),
        ...drinks.map((item) => item.id),
        ...extras.map((item) => item.id),
      ];
      if (new Set(allCatalogIds).size !== allCatalogIds.length)
        return reply(req, { error: "Các món trong thực đơn không được trùng mã." }, 400);
      const group: LunchGroup = {
        id: crypto.randomUUID(),
        name: input.groupName,
        restaurantName:
          input.restaurantName ?? input.dishes[0]?.restaurant ?? "Chưa chọn quán",
        date: today(),
        createdAt: new Date().toISOString(),
        ownerId: user.id,
        members: [{ id: user.id, name: user.displayName }],
        dishes: input.dishes,
        toppings,
        drinks,
        extras,
        mixFromMenu: input.mixFromMenu ?? toppings.length > 0,
        votes: {},
        mixes: {},
        drinkSelections: {},
        extraSelections: {},
        confirmedAt: {},
        candidates: [],
        winnerId: null,
        deadline: null,
        draws: {},
        closedAt: null,
        completedAt: null,
        payerId: null,
        payerName: null,
      };
      const result = await db().begin(async (sql) => {
        // Serialize creation for this identity to enforce the limit across instances.
        await sql`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
        const [count] =
          await sql`SELECT count(*)::int AS n FROM public.lunch_groups WHERE day = ${today()} AND state->>'ownerId' = ${user.id}`;
        if (count.n >= 10)
          return { error: "Bạn đã tạo đủ 10 nhóm trong hôm nay." };
        await sql`INSERT INTO public.lunch_groups (id, day, state) VALUES (${group.id}, ${group.date}, ${sql.json(JSON.parse(JSON.stringify(group)))})`;
        return { group };
      });
      return reply(
        req,
        { mode: "live", memberId: user.id, ...result },
        "error" in result ? 400 : 200,
      );
    }
    if (input.action === "delete") {
      const result = await db().begin(async (sql) => {
        const rows =
          await sql`SELECT state FROM public.lunch_groups WHERE id = ${input.groupId} FOR UPDATE`;
        if (!rows.length) return { error: "Không tìm thấy nhóm này." };
        const group = rows[0].state as LunchGroup;
        if (group.ownerId !== user.id)
          return { error: "Chỉ trưởng nhóm mới có thể xóa nhóm này." };
        if (group.completedAt)
          return { error: "Đơn đã hoàn thành. Không thể xóa nhóm này." };
        if (isLocked(group))
          return {
            error:
              "Nhóm đã khóa đơn. Hãy bấm Chỉnh sửa để mở lại trước khi xóa.",
          };
        await sql`DELETE FROM public.lunch_groups WHERE id = ${input.groupId}`;
        return { deleted: true };
      });
      return reply(
        req,
        { mode: "live", memberId: user.id, ...result },
        "error" in result ? 400 : 200,
      );
    }
    const result = await db().begin(async (sql) => {
      const rows =
        await sql`SELECT state FROM public.lunch_groups WHERE id = ${input.groupId} FOR UPDATE`;
      if (!rows.length) return { error: "Không tìm thấy nhóm này." };
      let group: LunchGroup;
      try {
        group = changeGroup(
          rows[0].state as LunchGroup,
          user.id,
          input.action === "join"
            ? { action: "join", name: user.displayName }
            : input,
          new Date(),
          () => randomInt(0, 2 ** 32) / 2 ** 32,
        );
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Không thể cập nhật nhóm.",
        };
      }
      await sql`UPDATE public.lunch_groups SET state = ${sql.json(JSON.parse(JSON.stringify(group)))} WHERE id = ${group.id}`;
      if (orderLedgerActions.has(input.action)) {
        if (input.action === "vote") {
          const dish = group.dishes.find(
            (item) => item.id === group.votes[user.id],
          );
          if (dish) {
            const price =
              Number.isFinite(dish.price) && dish.price > 0
                ? Math.round(dish.price)
                : 0;
            const mixDishes = (group.mixes?.[user.id] ?? [])
              .map((mixId) =>
                [
                  ...(group.mixFromMenu === false ? [] : group.dishes),
                  ...(group.toppings ?? []),
                ].find(
                  (item) => item.id === mixId,
                ),
              )
              .filter((mix): mix is (typeof group.dishes)[number] => !!mix);
            const mixIds = mixDishes.map((mix) => mix.id);
            const mixNames = mixDishes.map((mix) => mix.name);
            const drinkDishes = (group.drinkSelections?.[user.id] ?? [])
              .map((drinkId) =>
                (group.drinks ?? []).find((drink) => drink.id === drinkId),
              )
              .filter((drink): drink is NonNullable<typeof drink> => !!drink);
            const drinkIds = drinkDishes.map((drink) => drink.id);
            const drinkNames = drinkDishes.map((drink) => drink.name);
            const extraDishes = (group.extraSelections?.[user.id] ?? [])
              .map((extraId) =>
                (group.extras ?? []).find((extra) => extra.id === extraId),
              )
              .filter((extra): extra is NonNullable<typeof extra> => !!extra);
            const extraIds = extraDishes.map((extra) => extra.id);
            const extraNames = extraDishes.map((extra) => extra.name);
            const totalPrice = [dish, ...drinkDishes, ...extraDishes].reduce(
              (total, item) =>
                total +
                (Number.isFinite(item.price) && item.price > 0
                  ? Math.round(item.price)
                  : 0),
              0,
            );
            await sql`
              INSERT INTO public.lunch_orders (
                group_id,
                member_id,
                day,
                group_name,
                dish_id,
                dish_name,
                restaurant,
                price,
                total_price,
                emoji,
                mix_ids,
                mix_names,
                drink_ids,
                drink_names,
                extra_ids,
                extra_names,
                status,
                selected_at,
                updated_at
              )
              VALUES (
                ${group.id},
                ${user.id},
                ${group.date},
                ${group.name},
                ${dish.id},
                ${dish.name},
                ${dish.restaurant},
                ${price},
                ${totalPrice},
                ${dish.emoji},
                ${sql.array(mixIds, 25)},
                ${sql.array(mixNames, 25)},
                ${sql.array(drinkIds, 25)},
                ${sql.array(drinkNames, 25)},
                ${sql.array(extraIds, 25)},
                ${sql.array(extraNames, 25)},
                'selected',
                now(),
                now()
              )
              ON CONFLICT (group_id, member_id) DO UPDATE SET
                day = excluded.day,
                group_name = excluded.group_name,
                dish_id = excluded.dish_id,
                dish_name = excluded.dish_name,
                restaurant = excluded.restaurant,
                price = excluded.price,
                total_price = excluded.total_price,
                emoji = excluded.emoji,
                mix_ids = excluded.mix_ids,
                mix_names = excluded.mix_names,
                drink_ids = excluded.drink_ids,
                drink_names = excluded.drink_names,
                extra_ids = excluded.extra_ids,
                extra_names = excluded.extra_names,
                status = excluded.status,
                payer_id = null,
                payer_name = null,
                updated_at = now()
            `;
          }
        } else if (input.action === "removeDish") {
          await sql`
            DELETE FROM public.lunch_orders
            WHERE group_id = ${group.id} AND dish_id = ${input.dishId}
          `;
        } else {
          const orderStatus = group.completedAt
            ? "completed"
            : group.closedAt || group.winnerId
              ? "locked"
              : "selected";
          const payer = group.completedAt
            ? group.members.find((member) => member.id === group.payerId)
            : undefined;
          await sql`
            UPDATE public.lunch_orders
            SET
              status = ${orderStatus},
              payer_id = ${payer?.id ?? null},
              payer_name = ${group.completedAt ? group.payerName ?? payer?.name ?? null : null},
              updated_at = now()
            WHERE group_id = ${group.id}
          `;
        }
      }
      return { group };
    });
    return reply(
      req,
      { mode: "live", memberId: user.id, ...result },
      "error" in result ? 400 : 200,
    );
  } catch (error) {
    console.error(
      "Group update failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return reply(req, { error: "Chưa lưu được thay đổi. Hãy thử lại." }, 503);
  }
}
