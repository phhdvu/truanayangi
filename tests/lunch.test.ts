import test from "node:test";
import assert from "node:assert/strict";
import {
  changeGroup,
  isLocked,
  menu,
  restaurants,
  summary,
  today,
  type LunchGroup,
} from "../src/lib/lunch.ts";
import { spendingEntriesFromGroups } from "../src/lib/spending.ts";

const now = new Date("2026-09-09T03:00:00Z");
function fixture(): LunchGroup {
  return {
    id: "a",
    name: "Hội tầng 3",
    date: "2026-09-09",
    ownerId: "owner",
    createdAt: now.toISOString(),
    members: [
      { id: "owner", name: "An" },
      { id: "member", name: "Bình" },
    ],
    dishes: structuredClone(menu),
    toppings: structuredClone(restaurants[0].toppings ?? []),
    drinks: structuredClone(restaurants[1]?.drinks ?? []),
    extras: structuredClone(restaurants[1]?.extras ?? []),
    votes: {},
    candidates: [],
    winnerId: null,
    deadline: null,
    draws: {},
    closedAt: null,
  };
}
test("Bún Riêu Bà Kiều catalog keeps mains, drinks, and extras separate", () => {
  const restaurant = restaurants.find((item) => item.id === "bun-rieu-ba-kieu");
  assert.ok(restaurant);
  assert.equal(restaurant.dishes.length, 9);
  assert.equal(restaurant.drinks?.length, 8);
  assert.equal(restaurant.extras?.length, 8);
  assert.equal(
    restaurant.dishes.find((dish) => dish.name === "Bún riêu thập cẩm")?.price,
    55000,
  );
  assert.equal(
    restaurant.drinks?.find((drink) => drink.name === "Nước cam")?.price,
    15000,
  );
  assert.equal(
    restaurant.extras?.find((extra) => extra.name === "Tóp mỡ thêm")?.price,
    10000,
  );
  assert.equal(restaurant.mixFromMenu, false);
});
test("default Lạc and Rau mix/toppings are limited to the rice restaurant", () => {
  const riceRestaurant = restaurants.find((item) => item.id === "com-anh-thang");
  const bunRestaurant = restaurants.find((item) => item.id === "bun-rieu-ba-kieu");
  assert.ok(riceRestaurant);
  assert.deepEqual(
    riceRestaurant.toppings?.map((topping) => topping.name),
    ["Lạc", "Rau"],
  );
  assert.equal(riceRestaurant.mixFromMenu, true);
  assert.ok(bunRestaurant);
  assert.deepEqual(bunRestaurant.toppings ?? [], []);
  assert.equal(bunRestaurant.mixFromMenu, false);
});
test("lunch day follows Vietnam timezone across UTC midnight", () => {
  assert.equal(today(new Date("2026-09-08T18:00:00Z")), "2026-09-09");
  assert.equal(today(new Date("2026-09-09T17:00:00Z")), "2026-09-10");
});
test("changing a vote replaces the old vote, without modifying input", () => {
  const original = fixture();
  const first = changeGroup(
    original,
    "member",
    { action: "vote", dishId: menu[0].id },
    now,
  );
  const next = changeGroup(
    first,
    "member",
    { action: "vote", dishId: menu[1].id },
    now,
  );
  assert.deepEqual(original.votes, {});
  assert.deepEqual(next.votes, { member: menu[1].id });
  assert.equal(Object.keys(next.votes).length, 1);
});
test("a member must confirm a new selection before the owner can lock it", () => {
  const original = fixture();
  original.confirmedAt = {};
  const selected = changeGroup(
    original,
    "member",
    { action: "vote", dishId: menu[0].id },
    now,
  );
  assert.equal(selected.confirmedAt?.member, undefined);
  assert.throws(
    () => changeGroup(selected, "owner", { action: "lock" }, now),
    /chưa xác nhận/,
  );
  const confirmed = changeGroup(
    selected,
    "member",
    { action: "confirm" },
    now,
  );
  assert.equal(confirmed.confirmedAt?.member, now.toISOString());
  assert.doesNotThrow(() => changeGroup(confirmed, "owner", { action: "lock" }, now));
  const edited = changeGroup(
    confirmed,
    "member",
    { action: "vote", dishId: menu[1].id },
    now,
  );
  assert.equal(edited.confirmedAt?.member, undefined);
});
test("a member can reopen their selected order to edit it before locking", () => {
  const group = fixture();
  const selected = changeGroup(
    group,
    "member",
    { action: "vote", dishId: menu[0].id },
    now,
  );
  const confirmed = changeGroup(selected, "member", { action: "confirm" }, now);
  const reopened = changeGroup(confirmed, "member", { action: "unconfirm" }, now);
  assert.equal(reopened.confirmedAt?.member, undefined);
  assert.equal(reopened.votes.member, menu[0].id);
});
test("members can save up to two mix options for their own order", () => {
  const group = fixture();
  const next = changeGroup(
    group,
    "member",
    {
      action: "vote",
      dishId: menu[0].id,
      mixIds: [menu[1].id, restaurants[0].toppings![0].id],
    },
    now,
  );
  assert.deepEqual(next.votes, { member: menu[0].id });
  assert.deepEqual(next.mixes?.member, [menu[1].id, restaurants[0].toppings![0].id]);
  assert.throws(
    () =>
      changeGroup(
        next,
        "member",
        {
          action: "vote",
          dishId: menu[0].id,
          mixIds: [menu[1].id, menu[2].id, restaurants[0].toppings![0].id],
        },
        now,
      ),
    /tối đa 2/,
  );
  assert.throws(
    () =>
      changeGroup(
        next,
        "member",
        { action: "vote", dishId: menu[0].id, mixIds: ["missing"] },
        now,
      ),
    /không còn/,
  );
});
test("members can add drinks and extra items without mixing them", () => {
  const group = fixture();
  const drink = restaurants[1].drinks![4];
  const extra = restaurants[1].extras![5];
  const next = changeGroup(
    group,
    "member",
    {
      action: "vote",
      dishId: menu[0].id,
      drinkIds: [drink.id],
      extraIds: [extra.id],
    },
    now,
  );
  assert.deepEqual(next.drinkSelections?.member, [drink.id]);
  assert.deepEqual(next.extraSelections?.member, [extra.id]);
  const entry = spendingEntriesFromGroups([next], "member")[0];
  assert.deepEqual(entry?.drinkNames, [drink.name]);
  assert.deepEqual(entry?.extraNames, [extra.name]);
  assert.deepEqual(next.mixes?.member, []);

  const pricedGroup = fixture();
  const main = restaurants[1].dishes![0];
  pricedGroup.votes.member = main.id;
  pricedGroup.drinkSelections = { member: [drink.id] };
  pricedGroup.extraSelections = { member: [extra.id] };
  assert.equal(
    spendingEntriesFromGroups([pricedGroup], "member")[0]?.price,
    main.price + drink.price + extra.price,
  );
});
test("restaurant extras stay separate from the mix choices", () => {
  const group = fixture();
  group.dishes = structuredClone(restaurants[1].dishes ?? []);
  group.toppings = [];
  group.mixFromMenu = false;
  group.drinks = structuredClone(restaurants[1].drinks ?? []);
  group.extras = structuredClone(restaurants[1].extras ?? []);
  assert.throws(
    () =>
      changeGroup(
        group,
        "member",
        {
          action: "vote",
          dishId: group.dishes[0].id,
          mixIds: [group.dishes[1].id],
        },
        now,
      ),
    /Mix\/topping này không còn/,
  );
  const voted = changeGroup(
    group,
    "member",
    {
      action: "vote",
      dishId: group.dishes[0].id,
      extraIds: [group.extras[0].id],
    },
    now,
  );
  assert.deepEqual(voted.extraSelections?.member, [group.extras[0].id]);
  assert.deepEqual(voted.mixes?.member, []);
});
test("different group members retain their individual votes", () => {
  let group = changeGroup(
    fixture(),
    "owner",
    { action: "vote", dishId: menu[0].id },
    now,
  );
  group = changeGroup(
    group,
    "member",
    { action: "vote", dishId: menu[1].id },
    now,
  );
  assert.equal(Object.keys(group.votes).length, 2);
  assert.equal(fixture().votes.owner, undefined);
});
test("a nonmember cannot vote or draw; every member can draw and only the owner can lock", () => {
  assert.throws(
    () =>
      changeGroup(
        fixture(),
        "outsider",
        { action: "vote", dishId: menu[0].id },
        now,
      ),
    /tham gia/,
  );
  assert.throws(
    () =>
      changeGroup(
        fixture(),
        "member",
        { action: "close", dishId: menu[0].id },
        now,
      ),
    /trưởng nhóm/,
  );
  assert.throws(
    () => changeGroup(fixture(), "outsider", { action: "draw", count: 3 }, now),
    /tham gia/,
  );
  assert.throws(
    () => changeGroup(fixture(), "member", { action: "lock" }, now),
    /trưởng nhóm/,
  );
  const result = changeGroup(
    fixture(),
    "member",
    { action: "draw", count: 3 },
    now,
    () => 0.2,
  );
  assert.equal(result.draws?.member.length, 3);
});
test("joining twice updates name without adding another member", () => {
  const group = changeGroup(
    fixture(),
    "member",
    { action: "join", name: "Bình Nguyễn" },
    now,
  );
  assert.equal(group.members.length, 2);
  assert.equal(group.members[1].name, "Bình Nguyễn");
});
test("deadline locks votes but allows the owner to close or extend", () => {
  const group = fixture();
  group.deadline = now.toISOString();
  assert.ok(isLocked(group, now));
  assert.throws(
    () =>
      changeGroup(group, "member", { action: "vote", dishId: menu[0].id }, now),
    /hết giờ/,
  );
  assert.equal(
    changeGroup(group, "owner", { action: "close", dishId: menu[0].id }, now)
      .winnerId,
    menu[0].id,
  );
  assert.ok(
    !isLocked(
      changeGroup(
        group,
        "owner",
        { action: "deadline", deadline: "2026-09-09T04:00:00Z" },
        now,
      ),
      now,
    ),
  );
  assert.throws(
    () =>
      changeGroup(
        group,
        "owner",
        { action: "deadline", deadline: "2026-09-10T04:00:00Z" },
        now,
      ),
    /hôm nay/,
  );
});
test("closed groups reject new members and modifications", () => {
  const group = changeGroup(
    fixture(),
    "owner",
    { action: "close", dishId: menu[0].id },
    now,
  );
  assert.throws(
    () => changeGroup(group, "new", { action: "join", name: "Chi" }, now),
    /ngừng nhận/,
  );
  assert.throws(
    () =>
      changeGroup(group, "member", { action: "vote", dishId: menu[1].id }, now),
    /đã chốt/,
  );
  assert.throws(
    () =>
      changeGroup(group, "owner", { action: "deadline", deadline: null }, now),
    /đã chốt/,
  );
});
test("yesterday's group cannot accept today's vote", () => {
  const group = fixture();
  group.date = "2026-09-08";
  assert.ok(isLocked(group, now));
  assert.throws(
    () =>
      changeGroup(group, "owner", { action: "vote", dishId: menu[0].id }, now),
    /đã kết thúc/,
  );
});
test("gacha returns distinct existing dishes and leaves votes intact", () => {
  const group = fixture();
  group.votes.member = menu[0].id;
  const result = changeGroup(
    group,
    "owner",
    { action: "draw", count: 3 },
    now,
    () => 0.2,
  );
  assert.equal(result.candidates.length, 3);
  assert.deepEqual(result.draws?.owner, result.candidates);
  assert.equal(new Set(result.candidates).size, 3);
  assert.ok(
    result.candidates.every((id) => group.dishes.some((d) => d.id === id)),
  );
  assert.deepEqual(result.votes, group.votes);
  const memberResult = changeGroup(
    result,
    "member",
    { action: "draw", count: 1 },
    now,
    () => 0.8,
  );
  assert.equal(memberResult.draws?.member.length, 1);
  assert.deepEqual(memberResult.draws?.owner, result.draws?.owner);
  group.dishes = [menu[0]];
  assert.equal(
    changeGroup(group, "owner", { action: "draw", count: 3 }, now).candidates
      .length,
    1,
  );
});
test("invalid or duplicate dishes are rejected", () => {
  assert.throws(
    () =>
      changeGroup(
        fixture(),
        "member",
        { action: "addDish", dish: { ...menu[0], id: "other", name: "Other" } },
        now,
      ),
    /trưởng nhóm/,
  );
  assert.throws(
    () =>
      changeGroup(
        fixture(),
        "owner",
        { action: "vote", dishId: "missing" },
        now,
      ),
    /không còn/,
  );
  assert.throws(
    () =>
      changeGroup(
        fixture(),
        "owner",
        { action: "addDish", dish: { ...menu[0], name: "Other" } },
        now,
      ),
    /Mã món/,
  );
  const group = fixture();
  group.dishes = [];
  assert.throws(
    () => changeGroup(group, "owner", { action: "draw", count: 3 }, now),
    /ít nhất/,
  );
});
test("removing a dish clears dependent votes and gacha references", () => {
  const group = fixture();
  group.votes.member = menu[0].id;
  group.drinkSelections = { member: [restaurants[1].drinks![0].id] };
  group.extraSelections = { member: [restaurants[1].extras![0].id] };
  group.candidates = [menu[0].id];
  group.draws = { member: [menu[0].id], owner: [menu[1].id] };
  const result = changeGroup(
    group,
    "owner",
    { action: "removeDish", dishId: menu[0].id },
    now,
  );
  assert.deepEqual(result.votes, {});
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.draws, { member: [], owner: [menu[1].id] });
  assert.deepEqual(result.drinkSelections, {});
  assert.deepEqual(result.extraSelections, {});
  assert.ok(!result.dishes.some((d) => d.id === menu[0].id));
});
test("owner can lock a group order and members cannot change it afterward", () => {
  const group = fixture();
  const locked = changeGroup(group, "owner", { action: "lock" }, now);
  assert.equal(locked.closedAt, now.toISOString());
  assert.ok(isLocked(locked, now));
  assert.throws(
    () => changeGroup(locked, "member", { action: "vote", dishId: menu[0].id }, now),
    /khóa đơn/,
  );
});
test("owner can reopen a locked group for more members and votes", () => {
  const group = fixture();
  const locked = changeGroup(group, "owner", { action: "lock" }, now);
  const reopened = changeGroup(locked, "owner", { action: "reopen" }, now);
  assert.equal(reopened.closedAt, null);
  assert.ok(!isLocked(reopened, now));
  const joined = changeGroup(
    reopened,
    "new-member",
    { action: "join", name: "Chi" },
    now,
  );
  assert.equal(joined.members.at(-1)?.id, "new-member");
  assert.doesNotThrow(() =>
    changeGroup(
      joined,
      "new-member",
      { action: "vote", dishId: menu[0].id },
      now,
    ),
  );
});
test("owner can complete a locked group and record its payer", () => {
  const group = fixture();
  group.votes.member = menu[0].id;
  group.mixes = {
    member: [menu[1].id, restaurants[0].toppings![0].id],
  };
  const locked = changeGroup(group, "owner", { action: "lock" }, now);
  const completed = changeGroup(
    locked,
    "owner",
    { action: "complete", payerId: "member", payerName: "Bình" },
    now,
  );
  assert.equal(completed.completedAt, now.toISOString());
  assert.equal(completed.payerId, "member");
  assert.equal(completed.payerName, "Bình");
  assert.ok(isLocked(completed, now));
  assert.equal(summary(completed, "member").completed, true);
  assert.equal(
    spendingEntriesFromGroups([completed], "member")[0]?.payerName,
    "Bình",
  );
  assert.deepEqual(
    spendingEntriesFromGroups([completed], "member")[0]?.mixNames,
    [menu[1].name, restaurants[0].toppings![0].name],
  );
  const older = fixture();
  older.date = "2026-09-08";
  older.closedAt = now.toISOString();
  assert.equal(
    changeGroup(
      older,
      "owner",
      { action: "complete", payerId: "member", payerName: "Bình" },
      now,
    ).payerId,
    "member",
  );
});
test("completion accepts a payer outside the group and makes the group immutable", () => {
  const locked = changeGroup(fixture(), "owner", { action: "lock" }, now);
  const externalPayer = changeGroup(
    locked,
    "owner",
    { action: "complete", payerId: null, payerName: "Chị Lan" },
    now,
  );
  assert.equal(externalPayer.payerId, null);
  assert.equal(externalPayer.payerName, "Chị Lan");
  assert.throws(
    () =>
      changeGroup(
        locked,
        "member",
        { action: "complete", payerId: "member", payerName: "Bình" },
        now,
      ),
    /trưởng nhóm/,
  );
  const completed = changeGroup(
    locked,
    "owner",
    { action: "complete", payerId: "member", payerName: "Bình" },
    now,
  );
  assert.throws(
    () => changeGroup(completed, "owner", { action: "reopen" }, now),
    /hoàn thành/,
  );
  assert.throws(
    () => changeGroup(completed, "member", { action: "vote", dishId: menu[0].id }, now),
    /hoàn thành/,
  );
  assert.throws(
    () => changeGroup(completed, "member", { action: "join", name: "Bình mới" }, now),
    /hoàn thành/,
  );
});
test("reopening an expired deadline clears the old deadline", () => {
  const group = fixture();
  group.deadline = now.toISOString();
  const reopened = changeGroup(group, "owner", { action: "reopen" }, now);
  assert.equal(reopened.deadline, null);
  assert.ok(!isLocked(reopened, now));
});
test("summary does not expose member identities or individual votes", () => {
  const item = summary(fixture(), "member");
  assert.equal(item.restaurantName, "Cơm anh Thắng");
  assert.equal(item.joined, true);
  assert.equal(item.memberCount, 2);
  assert.ok(!("members" in item));
  assert.ok(!("votes" in item));
  assert.ok(!("ownerId" in item));
});
