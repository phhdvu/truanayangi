export type Dish = {
  id: string;
  name: string;
  restaurant: string;
  price: number;
  emoji: string;
  category: string;
};
export type Restaurant = {
  id: string;
  name: string;
  /** Namespace used to keep this catalog inside one company's menu. */
  companyCode?: string;
  dishes: Dish[];
  /** Optional add-ons that members can mix into their selected dish. */
  toppings?: Dish[];
  /** Whether other main dishes can be used as mix choices. */
  mixFromMenu?: boolean;
  /** Drinks the owner can make available for each group's order. */
  drinks?: Dish[];
  /** Extra items that are ordered separately from mix/toppings. */
  extras?: Dish[];
};
export type Member = { id: string; name: string };
export type LunchGroup = {
  id: string;
  name: string;
  /** Company namespace for this group. Older demo groups may omit it. */
  companyCode?: string;
  /** Restaurant selected when the group was created. Older groups derive this from their dishes. */
  restaurantName?: string;
  date: string;
  ownerId: string;
  createdAt: string;
  members: Member[];
  dishes: Dish[];
  /** Add-ons the owner made available for this group's orders. */
  toppings?: Dish[];
  /** Whether other main dishes can be used as mix choices. */
  mixFromMenu?: boolean;
  /** Drinks the owner made available for this group's orders. */
  drinks?: Dish[];
  /** Extra items the owner made available for this group's orders. */
  extras?: Dish[];
  votes: Record<string, string>;
  /** Optional mix/topping selections keyed by member id. */
  mixes?: Record<string, string[]>;
  /** Optional drink selections keyed by member id. */
  drinkSelections?: Record<string, string[]>;
  /** Optional extra-item selections keyed by member id. */
  extraSelections?: Record<string, string[]>;
  /** Timestamp keyed by member id for members who explicitly confirmed their order. */
  confirmedAt?: Record<string, string>;
  candidates: string[];
  winnerId: string | null;
  deadline: string | null;
  /** Personal gacha results keyed by member id. Older groups may not have this field. */
  draws?: Record<string, string[]>;
  /** Set when the owner locks the group order. Older groups may not have this field. */
  closedAt?: string | null;
  /** Set when the owner records the final payer and completes the order. */
  completedAt?: string | null;
  /** Member who paid the complete group order. */
  payerId?: string | null;
  /** Display name of the person who paid. May be someone outside the group. */
  payerName?: string | null;
};
export type GroupSummary = Pick<
  LunchGroup,
  "id" | "name" | "date" | "createdAt" | "deadline"
> & {
  restaurantName: string;
  ownerName: string;
  memberCount: number;
  voteCount: number;
  dishCount: number;
  joined: boolean;
  closed: boolean;
  completed: boolean;
  winner: string | null;
};
const comAnhThangDishes: Dish[] = [
  {
    id: "com-anh-thang-com-ga-sot",
    name: "Cơm Gà Sốt",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🍗",
    category: "Cơm",
  },
  {
    id: "com-anh-thang-com-bo-xao-dua",
    name: "Cơm Bò Xào Dưa",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🥩",
    category: "Cơm",
  },
  {
    id: "com-anh-thang-com-xa-xiu",
    name: "Cơm Xá Xíu",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🍖",
    category: "Cơm",
  },
  {
    id: "com-anh-thang-com-thit-kho",
    name: "Cơm Thịt Kho",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🍲",
    category: "Cơm",
  },
  {
    id: "com-anh-thang-com-ca-kho",
    name: "Cơm Cá Kho",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🐟",
    category: "Cơm",
  },
  {
    id: "com-anh-thang-com-ga-xao",
    name: "Cơm Gà Xào",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🍗",
    category: "Cơm",
  },
  {
    id: "com-anh-thang-com-ga-rang",
    name: "Cơm Gà Rang",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🍗",
    category: "Cơm",
  },
];
const comAnhThangToppings: Dish[] = [
  {
    id: "com-anh-thang-lac",
    name: "Lạc",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🥜",
    category: "Topping",
  },
  {
    id: "com-anh-thang-rau",
    name: "Rau",
    restaurant: "Cơm anh Thắng",
    price: 0,
    emoji: "🥬",
    category: "Topping",
  },
];

const bunRieuBaKieuDishes: Dish[] = [
  {
    id: "bun-rieu-ba-kieu-bun-rieu-cha-nuong",
    name: "Bún riêu chả nướng",
    restaurant: "Bún Riêu Bà Kiều",
    price: 35000,
    emoji: "🍜",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-la-lot",
    name: "Bún riêu lá lốt",
    restaurant: "Bún Riêu Bà Kiều",
    price: 35000,
    emoji: "🍜",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-thap-cam",
    name: "Bún riêu thập cẩm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 55000,
    emoji: "🍲",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-dau-bo",
    name: "Bún riêu đậu bò",
    restaurant: "Bún Riêu Bà Kiều",
    price: 35000,
    emoji: "🍜",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-gio-tai-bo",
    name: "Bún riêu giò tai, bò",
    restaurant: "Bún Riêu Bà Kiều",
    price: 40000,
    emoji: "🍜",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-banh-da-tron",
    name: "Bánh đa trộn",
    restaurant: "Bún Riêu Bà Kiều",
    price: 40000,
    emoji: "🍝",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-gio-tai",
    name: "Bún riêu giò tai",
    restaurant: "Bún Riêu Bà Kiều",
    price: 35000,
    emoji: "🍜",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-dau",
    name: "Bún riêu đậu",
    restaurant: "Bún Riêu Bà Kiều",
    price: 25000,
    emoji: "🍜",
    category: "Món chính",
  },
  {
    id: "bun-rieu-ba-kieu-bun-rieu-moc",
    name: "Bún riêu mọc",
    restaurant: "Bún Riêu Bà Kiều",
    price: 35000,
    emoji: "🍜",
    category: "Món chính",
  },
];

const bunRieuBaKieuDrinks: Dish[] = [
  {
    id: "bun-rieu-ba-kieu-tra-da",
    name: "Trà đá",
    restaurant: "Bún Riêu Bà Kiều",
    price: 3000,
    emoji: "🧊",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-tra-quat",
    name: "Trà quất",
    restaurant: "Bún Riêu Bà Kiều",
    price: 15000,
    emoji: "🍹",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-sua-dau-nanh",
    name: "Sữa đậu nành",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🥛",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-coca-cola",
    name: "Coca Cola",
    restaurant: "Bún Riêu Bà Kiều",
    price: 15000,
    emoji: "🥤",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-nuoc-cam",
    name: "Nước cam",
    restaurant: "Bún Riêu Bà Kiều",
    price: 15000,
    emoji: "🍊",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-bia-tiger-bac",
    name: "Bia Tiger Bạc",
    restaurant: "Bún Riêu Bà Kiều",
    price: 22000,
    emoji: "🍺",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-bia-sai-gon",
    name: "Bia Sài Gòn",
    restaurant: "Bún Riêu Bà Kiều",
    price: 22000,
    emoji: "🍺",
    category: "Đồ uống",
  },
  {
    id: "bun-rieu-ba-kieu-bo-huc",
    name: "Bò húc",
    restaurant: "Bún Riêu Bà Kiều",
    price: 20000,
    emoji: "🥫",
    category: "Đồ uống",
  },
];

const bunRieuBaKieuExtras: Dish[] = [
  {
    id: "bun-rieu-ba-kieu-quay",
    name: "Quẩy",
    restaurant: "Bún Riêu Bà Kiều",
    price: 2000,
    emoji: "🥖",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-trung-vit-lon",
    name: "Trứng vịt lộn",
    restaurant: "Bún Riêu Bà Kiều",
    price: 8000,
    emoji: "🥚",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-cha-nuong-them",
    name: "Chả nướng thêm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🍢",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-cha-la-lot-them",
    name: "Chả lá lốt thêm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🍢",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-gio-tai-them",
    name: "Giò tai thêm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🍖",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-top-mo-them",
    name: "Tóp mỡ thêm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🥓",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-moc-them",
    name: "Mọc thêm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🍡",
    category: "Đồ gọi thêm",
  },
  {
    id: "bun-rieu-ba-kieu-bo-them",
    name: "Bò thêm",
    restaurant: "Bún Riêu Bà Kiều",
    price: 10000,
    emoji: "🥩",
    category: "Đồ gọi thêm",
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "com-anh-thang",
    name: "Cơm anh Thắng",
    companyCode: "dst",
    dishes: comAnhThangDishes,
    toppings: comAnhThangToppings,
    mixFromMenu: true,
  },
  {
    id: "bun-rieu-ba-kieu",
    name: "Bún Riêu Bà Kiều",
    companyCode: "dst",
    dishes: bunRieuBaKieuDishes,
    drinks: bunRieuBaKieuDrinks,
    extras: bunRieuBaKieuExtras,
    mixFromMenu: false,
  },
];

export const menu: Dish[] = restaurants.flatMap(
  (restaurant) => restaurant.dishes,
);
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function isLocked(group: LunchGroup, now = new Date()) {
  return (
    !!group.winnerId ||
    !!group.closedAt ||
    !!group.completedAt ||
    group.date !== today(now) ||
    (!!group.deadline && new Date(group.deadline) <= now)
  );
}

/**
 * Older groups predate explicit confirmation. Their existing votes remain
 * valid, while newly created groups only become confirmed after the member
 * presses the confirmation button.
 */
export function isOrderConfirmed(group: LunchGroup, memberId: string) {
  return group.confirmedAt
    ? !!group.confirmedAt[memberId]
    : !!group.votes[memberId];
}

export function confirmedOrderCount(group: LunchGroup) {
  return Object.keys(group.votes).filter((memberId) =>
    isOrderConfirmed(group, memberId),
  ).length;
}
export function summary(group: LunchGroup, memberId: string): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    restaurantName:
      group.restaurantName ?? group.dishes[0]?.restaurant ?? "Chưa chọn quán",
    date: group.date,
    createdAt: group.createdAt,
    deadline: group.deadline,
    ownerName:
      group.members.find((m) => m.id === group.ownerId)?.name ?? "Trưởng nhóm",
    memberCount: group.members.length,
    voteCount: Object.keys(group.votes).length,
    dishCount: group.dishes.length,
    joined: group.members.some((m) => m.id === memberId),
    closed: isLocked(group),
    completed: !!group.completedAt,
    winner: group.dishes.find((d) => d.id === group.winnerId)?.name ?? null,
  };
}
export type GroupAction =
  | { action: "join"; name: string }
  | {
      action: "vote";
      dishId: string;
      mixIds?: string[];
      drinkIds?: string[];
      extraIds?: string[];
    }
  | { action: "confirm" }
  | { action: "unconfirm" }
  | { action: "addDish"; dish: Dish }
  | { action: "removeDish"; dishId: string }
  | { action: "draw"; count: 1 | 3 }
  | { action: "close"; dishId: string }
  | { action: "lock" }
  | { action: "reopen" }
  | {
      action: "complete";
      payerId?: string | null;
      payerName: string;
    }
  | { action: "deadline"; deadline: string | null };

export function changeGroup(
  original: LunchGroup,
  memberId: string,
  action: GroupAction,
  now = new Date(),
  random = Math.random,
): LunchGroup {
  const group = structuredClone(original);
  if (action.action === "join") {
    if (group.completedAt)
      throw new Error("Đơn đã hoàn thành. Không thể thay đổi nhóm này.");
    const existing = group.members.find((m) => m.id === memberId);
    if (existing) {
      existing.name = action.name;
      return group;
    }
    if (isLocked(group, now))
      throw new Error("Nhóm đã ngừng nhận thành viên mới.");
    if (group.members.length >= 200)
      throw new Error("Nhóm đã đủ 200 thành viên.");
    group.members.push({ id: memberId, name: action.name });
    return group;
  }
  if (!group.members.some((m) => m.id === memberId))
    throw new Error("Bạn cần tham gia nhóm trước.");
  const owner = group.ownerId === memberId;
  if (
    [
      "addDish",
      "removeDish",
      "close",
      "lock",
      "reopen",
      "complete",
      "deadline",
    ].includes(action.action) &&
    !owner
  )
    throw new Error("Chỉ trưởng nhóm thực hiện được thao tác này.");
  if (group.completedAt)
    throw new Error("Đơn đã hoàn thành. Không thể thay đổi nhóm này.");
  if (action.action === "complete") {
    if (!isLocked(group, now))
      throw new Error("Hãy khóa đơn trước khi hoàn thành.");
    const payerName = action.payerName.trim().replace(/\s+/g, " ");
    if (payerName.length < 2)
      throw new Error("Nhập tên người đã thanh toán toàn bộ đơn.");
    group.completedAt = now.toISOString();
    group.payerId = action.payerId ?? null;
    group.payerName = payerName;
    return group;
  }
  if (group.date !== today(now))
    throw new Error(
      "Lượt đặt món của ngày này đã kết thúc. Hãy tạo nhóm cho hôm nay.",
    );
  if (group.winnerId) throw new Error("Nhóm đã chốt món.");
  if (action.action === "reopen") {
    if (!isLocked(group, now)) throw new Error("Nhóm vẫn đang mở.");
    group.closedAt = null;
    if (group.deadline && new Date(group.deadline) <= now)
      group.deadline = null;
    return group;
  }
  if (group.closedAt) throw new Error("Nhóm đã khóa đơn.");
  if (action.action === "deadline") {
    if (
      action.deadline &&
      (new Date(action.deadline) <= now ||
        today(new Date(action.deadline)) !== group.date)
    )
      throw new Error("Giờ khóa phải ở phía trước và trong hôm nay.");
    group.deadline = action.deadline;
    return group;
  }
  if (action.action === "lock") {
    const pendingConfirmationCount = Object.keys(group.votes).filter(
      (voterId) => !isOrderConfirmed(group, voterId),
    ).length;
    if (pendingConfirmationCount > 0)
      throw new Error(
        `Còn ${pendingConfirmationCount} suất chưa xác nhận. Hãy chờ mọi người xác nhận trước khi khóa đơn.`,
      );
    group.closedAt = now.toISOString();
    return group;
  }
  if (action.action !== "close" && isLocked(group, now))
    throw new Error("Đã hết giờ đặt món. Đợi trưởng nhóm khóa đơn nhé.");
  if (action.action === "confirm" || action.action === "unconfirm") {
    if (!group.votes[memberId])
      throw new Error("Chọn món trước khi xác nhận suất của bạn.");
    const confirmedAt =
      group.confirmedAt ??
      Object.fromEntries(
        Object.keys(group.votes).map((voterId) => [voterId, group.createdAt]),
      );
    if (action.action === "confirm") {
      confirmedAt[memberId] = now.toISOString();
    } else {
      delete confirmedAt[memberId];
    }
    group.confirmedAt = confirmedAt;
    return group;
  }
  if (action.action === "addDish") {
    if (group.dishes.length >= 30)
      throw new Error("Một nhóm có tối đa 30 món.");
    if (group.dishes.some((d) => d.id === action.dish.id))
      throw new Error("Mã món đã tồn tại.");
    if (
      group.dishes.some(
        (d) =>
          d.name.toLocaleLowerCase("vi") ===
          action.dish.name.toLocaleLowerCase("vi"),
      )
    )
      throw new Error("Món này đã có trong danh sách.");
    group.dishes.push(action.dish);
  }
  if (
    action.action === "vote" ||
    action.action === "close" ||
    action.action === "removeDish"
  ) {
    if (!group.dishes.some((d) => d.id === action.dishId))
      throw new Error("Món này không còn trong thực đơn.");
    if (action.action === "vote") {
      const mixIds = action.mixIds ?? [];
      const drinkIds = action.drinkIds ?? [];
      const extraIds = action.extraIds ?? [];
      if (mixIds.length > 2)
        throw new Error("Mỗi suất chỉ được chọn tối đa 2 mix/topping.");
      if (new Set(mixIds).size !== mixIds.length)
        throw new Error("Mỗi mix/topping chỉ được chọn một lần.");
      if (new Set(drinkIds).size !== drinkIds.length)
        throw new Error("Mỗi đồ uống chỉ được chọn một lần.");
      if (new Set(extraIds).size !== extraIds.length)
        throw new Error("Mỗi đồ gọi thêm chỉ được chọn một lần.");
      const allowedMixIds = new Set([
        ...(group.mixFromMenu === false
          ? []
          : group.dishes
              .filter((dish) => dish.id !== action.dishId)
              .map((dish) => dish.id)),
        ...(group.toppings ?? []).map((topping) => topping.id),
      ]);
      if (mixIds.some((mixId) => !allowedMixIds.has(mixId)))
        throw new Error("Mix/topping này không còn trong thực đơn.");
      const allowedDrinkIds = new Set(
        (group.drinks ?? []).map((drink) => drink.id),
      );
      if (drinkIds.some((drinkId) => !allowedDrinkIds.has(drinkId)))
        throw new Error("Đồ uống này không còn trong thực đơn.");
      const allowedExtraIds = new Set(
        (group.extras ?? []).map((extra) => extra.id),
      );
      if (extraIds.some((extraId) => !allowedExtraIds.has(extraId)))
        throw new Error("Đồ gọi thêm này không còn trong thực đơn.");
      group.votes[memberId] = action.dishId;
      group.mixes = { ...(group.mixes ?? {}), [memberId]: mixIds };
      group.drinkSelections = {
        ...(group.drinkSelections ?? {}),
        [memberId]: drinkIds,
      };
      group.extraSelections = {
        ...(group.extraSelections ?? {}),
        [memberId]: extraIds,
      };
      const confirmedAt =
        group.confirmedAt ??
        Object.fromEntries(
          Object.keys(group.votes).map((voterId) => [voterId, group.createdAt]),
        );
      delete confirmedAt[memberId];
      group.confirmedAt = confirmedAt;
    }
    if (action.action === "close") group.winnerId = action.dishId;
    if (action.action === "removeDish") {
      group.dishes = group.dishes.filter((d) => d.id !== action.dishId);
      group.candidates = group.candidates.filter((id) => id !== action.dishId);
      group.votes = Object.fromEntries(
        Object.entries(group.votes).filter(([, id]) => id !== action.dishId),
      );
      group.draws = Object.fromEntries(
        Object.entries(group.draws ?? {}).map(([id, ids]) => [
          id,
          ids.filter((drawnId) => drawnId !== action.dishId),
        ]),
      );
      group.mixes = Object.fromEntries(
        Object.entries(group.mixes ?? {}).map(([id, mixIds]) => [
          id,
          mixIds.filter((mixId) => mixId !== action.dishId),
        ]),
      );
      const activeVoterIds = new Set(Object.keys(group.votes));
      group.drinkSelections = Object.fromEntries(
        Object.entries(group.drinkSelections ?? {}).filter(([id]) =>
          activeVoterIds.has(id),
        ),
      );
      group.extraSelections = Object.fromEntries(
        Object.entries(group.extraSelections ?? {}).filter(([id]) =>
          activeVoterIds.has(id),
        ),
      );
      if (group.confirmedAt) {
        group.confirmedAt = Object.fromEntries(
          Object.entries(group.confirmedAt).filter(([id]) =>
            activeVoterIds.has(id),
          ),
        );
      }
    }
  }
  if (action.action === "draw") {
    if (!group.dishes.length)
      throw new Error("Thêm ít nhất một món trước khi quay nhé.");
    const pool = [...group.dishes];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const drawn = pool
      .slice(0, Math.min(action.count, pool.length))
      .map((d) => d.id);
    group.candidates = drawn;
    group.draws = { ...(group.draws ?? {}), [memberId]: drawn };
  }
  return group;
}
