import type { LunchGroup } from "@/lib/lunch";

export type SpendingEntry = {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  dishName: string;
  restaurant: string;
  emoji: string;
  price: number;
  mixNames?: string[];
  drinkNames?: string[];
  extraNames?: string[];
  /** The payer recorded when the group order was completed. */
  payerName?: string | null;
};

export type SpendingPeriod = "day" | "month" | "year";

export type SpendingBucket = {
  key: string;
  total: number;
  orders: number;
  unknownPriceOrders: number;
  entries: SpendingEntry[];
};

export function spendingEntriesFromGroups(
  groups: LunchGroup[],
  memberId: string,
): SpendingEntry[] {
  return groups.flatMap((group) => {
    const dishId = group.votes?.[memberId];
    if (!dishId) return [];

    const dish = group.dishes?.find((item) => item.id === dishId);
    if (!dish) return [];
    const mixNames = (group.mixes?.[memberId] ?? [])
      .map((mixId) =>
        [
          ...(group.mixFromMenu === false ? [] : group.dishes),
          ...(group.toppings ?? []),
        ].find(
          (item) => item.id === mixId,
        )?.name,
      )
      .filter((name): name is string => !!name);
    const drinkNames = (group.drinkSelections?.[memberId] ?? [])
      .map(
        (drinkId) =>
          (group.drinks ?? []).find((drink) => drink.id === drinkId)?.name,
      )
      .filter((name): name is string => !!name);
    const extraNames = (group.extraSelections?.[memberId] ?? [])
      .map(
        (extraId) =>
          (group.extras ?? []).find((extra) => extra.id === extraId)?.name,
      )
      .filter((name): name is string => !!name);
    const drinks = (group.drinkSelections?.[memberId] ?? [])
      .map((drinkId) =>
        (group.drinks ?? []).find((drink) => drink.id === drinkId),
      )
      .filter((drink): drink is NonNullable<typeof drink> => !!drink);
    const extras = (group.extraSelections?.[memberId] ?? [])
      .map((extraId) =>
        (group.extras ?? []).find((extra) => extra.id === extraId),
      )
      .filter((extra): extra is NonNullable<typeof extra> => !!extra);
    const basePrice =
      Number.isFinite(dish.price) && dish.price > 0
        ? Math.round(dish.price)
        : 0;
    const addOnPrice = [...drinks, ...extras].reduce(
      (total, item) =>
        total +
        (Number.isFinite(item.price) && item.price > 0
          ? Math.round(item.price)
          : 0),
      0,
    );
    const payer = group.completedAt
      ? group.members?.find((member) => member.id === group.payerId)
      : undefined;

    return [
      {
        id: `${group.id}:${memberId}`,
        groupId: group.id,
        groupName: group.name,
        date: group.date,
        dishName: dish.name,
        restaurant: dish.restaurant,
        emoji: dish.emoji,
        mixNames,
        drinkNames,
        extraNames,
        payerName: group.payerName ?? payer?.name ?? null,
        price: basePrice + addOnPrice,
      },
    ];
  });
}

export function spendingPeriodKey(
  date: string,
  period: SpendingPeriod,
): string {
  if (period === "year") return date.slice(0, 4);
  if (period === "month") return date.slice(0, 7);
  return date;
}

export function aggregateSpending(
  entries: SpendingEntry[],
  period: SpendingPeriod,
): SpendingBucket[] {
  const buckets = new Map<string, SpendingBucket>();

  for (const entry of entries) {
    const key = spendingPeriodKey(entry.date, period);
    const bucket =
      buckets.get(key) ?? {
        key,
        total: 0,
        orders: 0,
        unknownPriceOrders: 0,
        entries: [],
      };
    bucket.total += entry.price;
    bucket.orders += 1;
    if (!entry.price) bucket.unknownPriceOrders += 1;
    bucket.entries.push(entry);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
}
