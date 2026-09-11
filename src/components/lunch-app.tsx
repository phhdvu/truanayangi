"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChefHat,
  Clock3,
  Copy,
  ChevronDown,
  Crown,
  Dice5,
  DoorOpen,
  Flame,
  Key,
  KeyRound,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  TriangleAlert,
  Trophy,
  Users,
  UserRound,
  Utensils,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CaseResultDialog } from "@/components/case-result-dialog";
import { ProfilePage } from "@/components/profile-page";
import { TimePicker } from "@/components/time-picker";
import {
  CASE_LANE_DELAY,
  FoodCase,
  prepareCase,
  type CaseOpening,
} from "@/components/food-case";
import {
  changeGroup,
  confirmedOrderCount,
  isLocked,
  isOrderConfirmed,
  restaurants as defaultRestaurants,
  summary,
  today,
  type Dish,
  type GroupAction,
  type GroupSummary,
  type LunchGroup,
  type Restaurant,
} from "@/lib/lunch";
import type { AuthUser } from "@/lib/auth-types";
import {
  spendingEntriesFromGroups,
  type SpendingEntry,
} from "@/lib/spending";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

const STORE = "trua-nay-demo-v1";
const NAME = "trua-nay-name";
type Command =
  | GroupAction
  | { action: "delete" }
  | {
      action: "create";
      name: string;
      groupName: string;
      restaurantName?: string;
      dishes: Dish[];
      toppings?: Dish[];
      drinks?: Dish[];
      extras?: Dish[];
      mixFromMenu?: boolean;
    };
type AuthStage = "loading" | "demo" | "login" | "change-password" | "ready";
type OrderDraft = {
  dishId: string;
  mixIds: string[];
  drinkIds: string[];
  extraIds: string[];
};
function readDemo(): LunchGroup[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
function money(price: number) {
  return price
    ? new Intl.NumberFormat("vi-VN").format(price) + "đ"
    : "Chưa có giá";
}
function timeLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}
function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
function formatDateValue(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}
function datePickerLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDateValue(value));
}

function mixOptionsFor(group: LunchGroup, dishId: string) {
  const seen = new Set<string>();
  const menuMixes =
    group.mixFromMenu === false
      ? []
      : group.dishes.filter((dish) => dish.id !== dishId);
  return [...menuMixes, ...(group.toppings ?? [])].filter(
    (option) => {
      if (seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    },
  );
}

function sameIds(first: string[], second: string[]) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

function mixDisplayName(mix: Dish) {
  return mix.name.replace(/^Cơm\s+/u, "");
}

function mixOptionLabel(mix: Dish) {
  return mix.category === "Topping"
    ? `Thêm mix / topping ${mix.name}`
    : `Mix ${mixDisplayName(mix)}`;
}

function mixOrderLabel(dish: Dish, mixes: Dish[]) {
  return [dish.name, ...mixes.map(mixDisplayName)].join(" mix ");
}

function selectedDishes(options: Dish[], ids: string[]) {
  return ids
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is Dish => !!option);
}

function orderLineLabel(
  dish: Dish,
  mixes: Dish[],
  drinks: Dish[],
  extras: Dish[],
) {
  return [
    mixOrderLabel(dish, mixes),
    ...drinks.map((drink) => drink.name),
    ...extras.map((extra) => extra.name),
  ].join(" · ");
}

const HOLD_TO_CONFIRM_MS = 1200;
const EXTERNAL_PAYER_ID = "__external_payer__";

function HoldToConfirmButton({
  busy,
  disabled,
  onConfirm,
}: {
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHold = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
  }, []);

  const startHold = useCallback(() => {
    if (disabled || timerRef.current !== null) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      void onConfirm();
    }, HOLD_TO_CONFIRM_MS);
  }, [disabled, onConfirm]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <AlertDialogAction
      size="lg"
      disabled={disabled}
      className={`hold-confirm-button ${holding ? "is-holding" : ""}`}
      aria-label={
        busy ? "Đang lưu trạng thái hoàn thành" : "Nhấn giữ để hoàn thành đơn nhóm"
      }
      title="Nhấn giữ trong khoảng 1,2 giây để xác nhận"
      onPointerDown={(event) => {
        if (event.button === 0) startHold();
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      onBlur={cancelHold}
      onKeyDown={(event) => {
        if (
          (event.key === "Enter" || event.key === " ") &&
          !event.repeat
        ) {
          event.preventDefault();
          startHold();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cancelHold();
        }
      }}
      onClick={(event) => {
        // Only the hold timer may confirm; a normal click must never close the dialog.
        event.preventDefault();
      }}
    >
      <span className="hold-confirm-progress" aria-hidden="true" />
      <span className="hold-confirm-label">
        {busy ? <LoaderCircle className="animate-spin" /> : <CheckCheck />}
        {busy ? "Đang lưu…" : holding ? "Giữ thêm…" : "Nhấn giữ để hoàn thành"}
      </span>
    </AlertDialogAction>
  );
}

function OrderOptionsPicker({
  dish,
  mixOptions,
  drinkOptions,
  extraOptions,
  selectedMixIds,
  selectedDrinkIds,
  selectedExtraIds,
  disabled,
  hasChanges,
  onMixChange,
  onDrinkChange,
  onExtraChange,
  onSave,
}: {
  dish: Dish;
  mixOptions: Dish[];
  drinkOptions: Dish[];
  extraOptions: Dish[];
  selectedMixIds: string[];
  selectedDrinkIds: string[];
  selectedExtraIds: string[];
  disabled: boolean;
  hasChanges: boolean;
  onMixChange: (ids: string[]) => void;
  onDrinkChange: (ids: string[]) => void;
  onExtraChange: (ids: string[]) => void;
  onSave: () => void;
}) {
  if (!mixOptions.length && !drinkOptions.length && !extraOptions.length)
    return null;

  const selectedMixes = selectedDishes(mixOptions, selectedMixIds);
  const selectedDrinks = selectedDishes(drinkOptions, selectedDrinkIds);
  const selectedExtras = selectedDishes(extraOptions, selectedExtraIds);

  return (
    <div className="mix-picker order-options-picker">
      <div className="mix-picker-heading">
        <div>
          <strong>
            <Sparkles size={14} /> Tùy chọn cho suất
          </strong>
          <span>Có thể bỏ qua nếu không cần thêm</span>
        </div>
        {mixOptions.length > 0 && (
          <Badge variant="secondary">{selectedMixIds.length}/2 mix</Badge>
        )}
      </div>
      {mixOptions.length > 0 && (
        <section className="order-option-section">
          <div className="order-option-title">
            <span>Thêm mix / topping</span>
            <small>Chọn tối đa 2 loại</small>
          </div>
          <ToggleGroup
            type="multiple"
            value={selectedMixIds}
            onValueChange={(ids) => {
              if (ids.length <= 2) onMixChange(ids);
            }}
            disabled={disabled}
            className="mix-options"
            aria-label="Chọn mix hoặc topping"
          >
            {mixOptions.map((option) => (
              <ToggleGroupItem
                key={option.id}
                value={option.id}
                variant="outline"
                className="mix-option"
                title={option.category === "Topping" ? "Topping" : "Món mix"}
              >
                <span className="mix-option-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="mix-option-copy">
                  <span>{mixOptionLabel(option)}</span>
                  <small>{option.category === "Topping" ? "Topping" : "Món mix"}</small>
                </span>
                <Check className="mix-option-check" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      )}
      {drinkOptions.length > 0 && (
        <section className="order-option-section">
          <div className="order-option-title">
            <span>Đồ uống</span>
            <small>Có thể chọn nhiều</small>
          </div>
          <ToggleGroup
            type="multiple"
            value={selectedDrinkIds}
            onValueChange={onDrinkChange}
            disabled={disabled}
            className="mix-options order-add-on-options"
            aria-label="Chọn đồ uống"
          >
            {drinkOptions.map((option) => (
              <ToggleGroupItem
                key={option.id}
                value={option.id}
                variant="outline"
                className="mix-option"
              >
                <span className="mix-option-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="mix-option-copy">
                  <span>{option.name}</span>
                  <small>{money(option.price)}</small>
                </span>
                <Check className="mix-option-check" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      )}
      {extraOptions.length > 0 && (
        <section className="order-option-section">
          <div className="order-option-title">
            <span>Đồ gọi thêm</span>
            <small>Không tính vào mix</small>
          </div>
          <ToggleGroup
            type="multiple"
            value={selectedExtraIds}
            onValueChange={onExtraChange}
            disabled={disabled}
            className="mix-options order-add-on-options"
            aria-label="Chọn đồ gọi thêm"
          >
            {extraOptions.map((option) => (
              <ToggleGroupItem
                key={option.id}
                value={option.id}
                variant="outline"
                className="mix-option"
              >
                <span className="mix-option-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="mix-option-copy">
                  <span>{option.name}</span>
                  <small>{money(option.price)}</small>
                </span>
                <Check className="mix-option-check" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      )}
      <div className="mix-picker-footer">
        <span>
          Suất: {orderLineLabel(dish, selectedMixes, selectedDrinks, selectedExtras)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !hasChanges}
          onClick={onSave}
        >
          <Check />
          Lưu lựa chọn
        </Button>
      </div>
    </div>
  );
}

function OrderConfirmationButton({
  confirmed,
  disabled,
  busy,
  onConfirm,
  onEdit,
}: {
  confirmed: boolean;
  disabled: boolean;
  busy: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <Button
      type="button"
      size="lg"
      variant={confirmed ? "outline" : "default"}
      className={`order-confirmation-trigger ${confirmed ? "is-confirmed" : ""}`}
      disabled={disabled || busy}
      title={
        confirmed
          ? "Chỉnh sửa món, mix và các món gọi thêm của bạn"
          : "Xác nhận món, mix và các món gọi thêm của bạn"
      }
      onClick={confirmed ? onEdit : onConfirm}
    >
      {busy ? (
        <LoaderCircle className="animate-spin" />
      ) : confirmed ? (
        <Pencil />
      ) : (
        <CheckCheck />
      )}
      {busy ? "Đang lưu…" : confirmed ? "Chỉnh sửa món" : "Xác nhận món"}
    </Button>
  );
}

export function LunchApp() {
  const [mode, setMode] = useState<"loading" | "demo" | "live">("loading");
  const [authStage, setAuthStage] = useState<AuthStage>("loading");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupNameError, setCreateGroupNameError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [group, setGroup] = useState<LunchGroup | null>(null);
  const groupRef = useRef<LunchGroup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [showCaseResult, setShowCaseResult] = useState(false);
  const [caseOpening, setCaseOpening] = useState<CaseOpening | null>(null);
  const drawing = useRef(false);
  const caseAudio = useRef<HTMLAudioElement | null>(null);
  const [dialog, setDialog] = useState<
    | "create"
    | "dish"
    | "name"
    | "deadline"
    | "password"
    | "lock"
    | "complete"
    | "delete"
    | null
  >(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(today());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState("");
  const [payerId, setPayerId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [dishEmoji, setDishEmoji] = useState("🍜");
  const [restaurantCatalog, setRestaurantCatalog] =
    useState<Restaurant[]>(defaultRestaurants);
  const requestVersion = useRef(0);
  const refreshing = useRef(false);
  const [invitedId, setInvitedId] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [spendingEntries, setSpendingEntries] = useState<SpendingEntry[]>([]);
  const [spendingLoading, setSpendingLoading] = useState(false);
  const [spendingError, setSpendingError] = useState("");

  function openCreateDialog() {
    setError("");
    setCreateStep(1);
    setSelectedRestaurantId("");
    setSelectedMenu([]);
    setSelectedDrinks([]);
    setSelectedExtras([]);
    setCreateGroupName("");
    setCreateGroupNameError("");
    setDialog("create");
  }

  function openDeadlineDialog() {
    setError("");
    setDeadlineTime(group?.deadline ? timeLabel(group.deadline) : "");
    setDialog("deadline");
  }

  function openCompleteDialog() {
    if (!group) return;
    setError("");
    setPayerId("");
    setPayerName("");
    setDialog("complete");
  }

  const openGroup = useCallback((value: LunchGroup | null) => {
    if (value?.id !== groupRef.current?.id) {
      setShowCaseResult(false);
      setCaseOpening(null);
      setSpinning(false);
      drawing.current = false;
      setOrderDraft(null);
    }
    groupRef.current = value;
    setGroup(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("group", value.id);
    else url.searchParams.delete("group");
    window.history.replaceState({}, "", url);
  }, []);

  useEffect(() => {
    if (!caseOpening) return;
    const duration = caseOpening.duration
      ? caseOpening.duration +
        (caseOpening.lanes.length - 1) * CASE_LANE_DELAY +
        120
      : 0;
    const timer = setTimeout(() => {
      setSpinning(false);
      drawing.current = false;
      setDialog(null);
      setShowCaseResult(true);
    }, duration);
    return () => clearTimeout(timer);
  }, [caseOpening]);

  useEffect(() => {
    const audio = new Audio("/sounds/case-open.mp3");
    audio.preload = "auto";
    audio.volume = 0.78;
    caseAudio.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      caseAudio.current = null;
    };
  }, []);

  const refresh = useCallback(
    async (silent = false) => {
      if (refreshing.current) return;
      refreshing.current = true;
      const version = requestVersion.current;
      const activeId = groupRef.current?.id;
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const session = await sessionResponse.json();
        if (!sessionResponse.ok)
          throw new Error(
            session.error || "Không kiểm tra được phiên đăng nhập.",
          );

        if (session.mode === "demo") {
          setAuthStage("demo");
          setAuthUser(null);
          setMode("demo");
          setRestaurantCatalog(defaultRestaurants);
        } else if (!session.authenticated) {
          setAuthStage("login");
          setAuthUser(null);
          setMode("live");
          setName("");
          setMemberId("");
          setGroups([]);
          setShowProfile(false);
          setSpendingEntries([]);
          setSpendingError("");
          setRestaurantCatalog(defaultRestaurants);
          openGroup(null);
          return;
        } else {
          const user = session.user as AuthUser;
          setAuthUser(user);
          setName(user.displayName);
          setMemberId(user.id);
          setMode("live");
          if (user.mustChangePassword) {
            setAuthStage("change-password");
            setShowProfile(false);
            setRestaurantCatalog(defaultRestaurants);
            openGroup(null);
            return;
          }
          setAuthStage("ready");
        }

        if (session.mode !== "demo") {
          const catalogResponse = await fetch("/api/restaurants", {
            cache: "no-store",
          });
          const catalogData = await catalogResponse.json();
          if (!catalogResponse.ok) {
            if (catalogData.code === "AUTH_REQUIRED") {
              setAuthStage("login");
              setAuthUser(null);
              setName("");
              setMemberId("");
              setShowProfile(false);
              setSpendingEntries([]);
              setSpendingError("");
              setRestaurantCatalog(defaultRestaurants);
              openGroup(null);
            } else if (catalogData.code === "PASSWORD_CHANGE_REQUIRED") {
              setAuthStage("change-password");
              setShowProfile(false);
            }
            throw new Error(catalogData.error);
          }
          setRestaurantCatalog(
            Array.isArray(catalogData.restaurants)
              ? (catalogData.restaurants as Restaurant[])
              : [],
          );
        }

        const response = await fetch(
          `/api/groups?${activeId ? `id=${activeId}` : `date=${date}`}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) {
          if (data.code === "AUTH_REQUIRED") {
            setAuthStage("login");
            setAuthUser(null);
            setName("");
            setMemberId("");
            setShowProfile(false);
            setSpendingEntries([]);
            setSpendingError("");
            openGroup(null);
          } else if (data.code === "PASSWORD_CHANGE_REQUIRED") {
            setAuthStage("change-password");
            setShowProfile(false);
          }
          throw new Error(data.error);
        }
        if (
          version !== requestVersion.current ||
          activeId !== groupRef.current?.id
        )
          return;
        setMode(data.mode);
        setMemberId(data.memberId);
        if (data.mode === "demo") {
          const all = readDemo();
          setGroups(
            all
              .filter((g) => g.date === date)
              .map((g) => summary(g, data.memberId))
              .reverse(),
          );
          const savedId = new URL(window.location.href).searchParams.get(
            "group",
          );
          const saved = all.find(
            (g) =>
              g.id === savedId && g.members.some((m) => m.id === data.memberId),
          );
          if (saved) openGroup(saved);
        } else if (data.group) {
          groupRef.current = data.group;
          setGroup(data.group);
        } else {
          setGroups(data.groups);
          const savedId = new URL(window.location.href).searchParams.get(
            "group",
          );
          const saved = (data.groups as GroupSummary[]).find(
            (g) => g.id === savedId && g.joined,
          );
          if (saved) {
            const restored = await fetch(`/api/groups?id=${saved.id}`, {
              cache: "no-store",
            });
            const detail = await restored.json();
            if (
              restored.ok &&
              version === requestVersion.current &&
              !groupRef.current
            )
              openGroup(detail.group);
          }
        }
        if (!silent) setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được dữ liệu. Thử lại nhé.",
        );
      } finally {
        refreshing.current = false;
      }
    },
    [date, openGroup],
  );

  const loadSpending = useCallback(async () => {
    if (!memberId || mode === "loading") return;
    setSpendingLoading(true);
    setSpendingError("");
    try {
      if (mode === "demo") {
        setSpendingEntries(spendingEntriesFromGroups(readDemo(), memberId));
        return;
      }

      const response = await fetch("/api/stats", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "AUTH_REQUIRED") {
          setAuthStage("login");
          setAuthUser(null);
          setName("");
          setMemberId("");
          setShowProfile(false);
          openGroup(null);
        } else if (data.code === "PASSWORD_CHANGE_REQUIRED") {
          setAuthStage("change-password");
          setShowProfile(false);
        }
        throw new Error(data.error || "Chưa tải được thống kê.");
      }
      setSpendingEntries(
        Array.isArray(data.entries) ? (data.entries as SpendingEntry[]) : [],
      );
    } catch (err) {
      setSpendingError(
        err instanceof Error ? err.message : "Chưa tải được thống kê.",
      );
    } finally {
      setSpendingLoading(false);
    }
  }, [memberId, mode, openGroup]);

  useEffect(() => {
    // Read browser-owned state only after hydration, keeping the server render deterministic.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(new Date());
    setInvitedId(new URL(window.location.href).searchParams.get("group") || "");
    try {
      const saved = localStorage.getItem(NAME) || "";
      setName(saved);
      setNameInput(saved);
    } catch {
      setError(
        "Trình duyệt đang chặn lưu tên. Bạn vẫn có thể dùng chế độ trực tuyến trong phiên này.",
      );
    }
  }, []);
  // Synchronize with the remote API or the browser demo store when the source changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
      if (!document.hidden) void refresh(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!showProfile || mode === "loading" || !memberId) return;
    // Loading profile data synchronizes this view with the remote API/local store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSpending();
  }, [loadSpending, memberId, mode, showProfile]);
  async function command(
    input: Command,
    targetId = groupRef.current?.id,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError("");
    requestVersion.current++;
    try {
      let next: LunchGroup;
      if (mode === "demo") {
        const all = readDemo();
        if (input.action === "delete") {
          const index = all.findIndex((g) => g.id === targetId);
          if (index < 0) throw new Error("Không tìm thấy nhóm này.");
          if (all[index].ownerId !== memberId)
            throw new Error("Chỉ trưởng nhóm mới có thể xóa nhóm này.");
          if (all[index].completedAt)
            throw new Error("Đơn đã hoàn thành. Không thể xóa nhóm này.");
          if (isLocked(all[index]))
            throw new Error(
              "Nhóm đã khóa đơn. Hãy bấm Chỉnh sửa để mở lại trước khi xóa.",
            );
          all.splice(index, 1);
          localStorage.setItem(STORE, JSON.stringify(all));
          setGroups(
            all
              .filter((g) => g.date === date)
              .map((g) => summary(g, memberId))
              .reverse(),
          );
          openGroup(null);
          return true;
        }
        if (input.action === "create") {
          next = {
            id: crypto.randomUUID(),
            name: input.groupName,
            restaurantName:
              input.restaurantName ?? input.dishes[0]?.restaurant ?? "Chưa chọn quán",
            date: today(),
            createdAt: new Date().toISOString(),
            ownerId: memberId,
            members: [{ id: memberId, name: input.name }],
            dishes: input.dishes,
            toppings: input.toppings ?? [],
            drinks: input.drinks ?? [],
            extras: input.extras ?? [],
            mixFromMenu: input.mixFromMenu ?? (input.toppings?.length ?? 0) > 0,
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
          all.push(next);
        } else {
          const index = all.findIndex((g) => g.id === targetId);
          if (index < 0) throw new Error("Không tìm thấy nhóm này.");
          next = changeGroup(all[index], memberId, input);
          all[index] = next;
        }
        localStorage.setItem(STORE, JSON.stringify(all));
        setGroups(
          all
            .filter((g) => g.date === date)
            .map((g) => summary(g, memberId))
            .reverse(),
        );
      } else {
        const response = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, groupId: targetId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (input.action === "delete") {
          openGroup(null);
          await refresh();
          return true;
        }
        next = data.group;
      }
      requestVersion.current++;
      openGroup(next);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Chưa lưu được. Hãy thử lại.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function enterGroup(item: GroupSummary) {
    if (item.joined && item.closed) {
      setBusy(true);
      requestVersion.current++;
      try {
        if (mode === "demo")
          openGroup(readDemo().find((g) => g.id === item.id)!);
        else {
          const response = await fetch(`/api/groups?id=${item.id}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          openGroup(data.group);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không mở được nhóm.");
      } finally {
        setBusy(false);
      }
      return;
    }
    await command({ action: "join", name }, item.id);
  }

  async function openHistoryGroup(groupId: string) {
    if (busy) return;
    setSpendingError("");
    setBusy(true);
    try {
      let next: LunchGroup | undefined;
      if (mode === "demo") {
        next = readDemo().find((item) => item.id === groupId);
      } else {
        const response = await fetch(
          `/api/groups?id=${encodeURIComponent(groupId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        next = data.group as LunchGroup | undefined;
      }
      if (!next) throw new Error("Không tìm thấy nhóm này.");
      setDate(next.date);
      setShowProfile(false);
      openGroup(next);
    } catch (err) {
      setSpendingError(
        err instanceof Error ? err.message : "Không mở được nhóm.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = nameInput.trim().replace(/\s+/g, " ");
    if (value.length < 2) {
      setNameError("Tên hiển thị cần có ít nhất 2 ký tự.");
      return;
    }
    setNameError("");
    if (group && !(await command({ action: "join", name: value }))) return;
    try {
      localStorage.setItem(NAME, value);
    } catch {
      /* The current live session can still use this name. */
    }
    setName(value);
    setDialog(null);
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAuthUser(data.user);
      setName(data.user.displayName);
      setMemberId(data.user.id);
      setLoginPassword("");
      setAuthStage(data.user.mustChangePassword ? "change-password" : "ready");
      if (!data.user.mustChangePassword) await refresh();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Chưa đăng nhập được. Hãy thử lại.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    if (newPassword !== confirmPassword) {
      setAuthError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    if (newPassword.length < 8) {
      setAuthError("Mật khẩu mới cần có ít nhất 8 ký tự.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAuthUser(data.user);
      setAuthStage("ready");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAuthError("");
      setDialog(null);
      await refresh();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Chưa đổi được mật khẩu. Hãy thử lại.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function logout() {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setAuthBusy(false);
      setAuthStage("login");
      setAuthUser(null);
      setName("");
      setMemberId("");
      setGroups([]);
      setAuthError("");
      setDialog(null);
      setShowProfile(false);
      setSpendingEntries([]);
      setSpendingError("");
      requestVersion.current++;
      openGroup(null);
    }
  }
  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const groupName = createGroupName.trim().replace(/\s+/g, " ");
    if (createStep === 1) {
      if (groupName.length < 2) {
        setCreateGroupNameError("Tên nhóm cần có ít nhất 2 ký tự.");
        return;
      }
      if (!selectedRestaurant) {
        setError("Chọn quán trước khi sang bước chọn món nhé.");
        return;
      }
      setCreateGroupName(groupName);
      setCreateGroupNameError("");
      setError("");
      setCreateStep(2);
      return;
    }
    if (!selectedRestaurant) {
      setError("Chọn một quán để tiếp tục nhé.");
      setCreateStep(1);
      return;
    }
    if (groupName.length < 2) {
      setCreateGroupNameError("Tên nhóm cần có ít nhất 2 ký tự.");
      setCreateStep(1);
      return;
    }
    setCreateGroupName(groupName);
    setCreateGroupNameError("");
    const dishes = selectedRestaurant.dishes.filter((dish) =>
      selectedMenu.includes(dish.id),
    );
    const toppings = selectedRestaurant.toppings ?? [];
    const drinks = (selectedRestaurant.drinks ?? []).filter((drink) =>
      selectedDrinks.includes(drink.id),
    );
    const extras = (selectedRestaurant.extras ?? []).filter((extra) =>
      selectedExtras.includes(extra.id),
    );
    if (!dishes.length) {
      setError("Chọn ít nhất một món để thành viên có thể đặt.");
      return;
    }
    if (
      await command({
        action: "create",
        name,
        groupName,
        restaurantName: selectedRestaurant.name,
        dishes,
        toppings,
        drinks,
        extras,
        mixFromMenu:
          selectedRestaurant.mixFromMenu ?? (selectedRestaurant.toppings?.length ?? 0) > 0,
      })
    ) {
      setDialog(null);
      setCreateStep(1);
      toast.success("Nhóm đã sẵn sàng. Rủ đồng nghiệp vào chọn món nhé!");
    }
  }
  async function addDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dishName = String(form.get("dishName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (dishName.length < 2) {
      setError("Tên món cần có ít nhất 2 ký tự.");
      return;
    }
    const priceValue = String(form.get("price") ?? "").trim();
    const price = priceValue ? Number(priceValue) : 0;
    if (!Number.isInteger(price) || price < 0 || price > 10000000) {
      setError("Giá món cần là số nguyên từ 0 đến 10.000.000đ.");
      return;
    }
    setError("");
    const dish: Dish = {
      id: crypto.randomUUID(),
      name: dishName,
      restaurant: String(form.get("restaurant")).trim() || "Chưa chọn quán",
      price,
      emoji: dishEmoji,
      category: "Đề xuất",
    };
    if (await command({ action: "addDish", dish })) {
      setDialog(null);
      setDishEmoji("🍜");
      toast.success("Đã thêm món vào thực đơn của nhóm.");
    }
  }
  async function chooseDish(dishId: string) {
    const current = groupRef.current;
    const dish = current?.dishes.find((item) => item.id === dishId);
    const sameDish = current?.votes[memberId] === dishId;
    const selection: OrderDraft = {
      dishId,
      mixIds: sameDish ? current?.mixes?.[memberId] ?? [] : [],
      drinkIds: sameDish
        ? current?.drinkSelections?.[memberId] ?? []
        : [],
      extraIds: sameDish
        ? current?.extraSelections?.[memberId] ?? []
        : [],
    };
    if (
      await command({
        action: "vote",
        dishId,
        mixIds: selection.mixIds,
        drinkIds: selection.drinkIds,
        extraIds: selection.extraIds,
      })
    ) {
      setOrderDraft(selection);
      toast.success(dish ? `Đã chọn ${dish.name}.` : "Đã chọn món.");
      return true;
    }
    return false;
  }
  function updateOrderDraft(
    dishId: string,
    patch: Partial<Omit<OrderDraft, "dishId">>,
  ) {
    const current = groupRef.current;
    setOrderDraft((draft) => {
      const base: OrderDraft =
        draft?.dishId === dishId
          ? draft
          : {
              dishId,
              mixIds:
                current?.votes[memberId] === dishId
                  ? current.mixes?.[memberId] ?? []
                  : [],
              drinkIds:
                current?.votes[memberId] === dishId
                  ? current.drinkSelections?.[memberId] ?? []
                  : [],
              extraIds:
                current?.votes[memberId] === dishId
                  ? current.extraSelections?.[memberId] ?? []
                  : [],
            };
      return { ...base, ...patch };
    });
  }
  async function saveOrderOptions(dishId: string) {
    const current = groupRef.current;
    if (!current || current.votes[memberId] !== dishId) return false;
    const saved: OrderDraft = {
      dishId,
      mixIds: current.mixes?.[memberId] ?? [],
      drinkIds: current.drinkSelections?.[memberId] ?? [],
      extraIds: current.extraSelections?.[memberId] ?? [],
    };
    const selection = orderDraft?.dishId === dishId ? orderDraft : saved;
    if (
      await command({
        action: "vote",
        dishId,
        mixIds: selection.mixIds,
        drinkIds: selection.drinkIds,
        extraIds: selection.extraIds,
      })
    ) {
      setOrderDraft(selection);
      toast.success("Đã lưu lựa chọn cho suất của bạn.");
      return true;
    }
    return false;
  }
  async function confirmOrder() {
    const current = groupRef.current;
    if (busy || !current || !myDish) return;
    const hasChanges =
      !sameIds(myMixIds, mySavedMixIds) ||
      !sameIds(myDrinkIds, mySavedDrinkIds) ||
      !sameIds(myExtraIds, mySavedExtraIds);
    if (hasChanges && !(await saveOrderOptions(myDish.id))) return;
    if (await command({ action: "confirm" }))
      toast.success("Đã xác nhận suất của bạn.");
  }
  async function unconfirmOrder() {
    if (await command({ action: "unconfirm" }))
      toast.success("Đã mở lại lựa chọn. Bạn có thể đổi món hoặc xác nhận lại.");
  }
  async function lockGroup() {
    if (await command({ action: "lock" })) {
      setDialog(null);
      toast.success("Đã khóa đơn. Chúc cả hội ngon miệng!");
    }
  }
  async function deleteGroup() {
    if (await command({ action: "delete" })) {
      setDialog(null);
      toast.success("Đã xóa nhóm.");
    }
  }
  async function reopenGroup() {
    if (await command({ action: "reopen" })) {
      toast.success("Đã mở lại nhóm. Mọi người có thể tham gia và đổi món.");
    }
  }
  async function completeGroup() {
    const isExternalPayer = payerId === EXTERNAL_PAYER_ID;
    const memberPayer = group?.members.find((member) => member.id === payerId);
    const selectedPayerName = isExternalPayer
      ? payerName.trim().replace(/\s+/g, " ")
      : memberPayer?.name ?? "";
    if (!selectedPayerName || selectedPayerName.length < 2) {
      setError("Chọn hoặc nhập người đã thanh toán toàn bộ đơn trước nhé.");
      return;
    }
    if (
      await command({
        action: "complete",
        payerId: isExternalPayer ? null : payerId,
        payerName: selectedPayerName,
      })
    ) {
      setDialog(null);
      toast.success("Đã hoàn thành đơn. Thông tin thanh toán đã được lưu.");
    }
  }
  async function draw(count: 1 | 3) {
    if (drawing.current || busy || !groupRef.current) return;
    drawing.current = true;
    setShowCaseResult(false);
    setSpinning(true);
    setCaseOpening(null);
    const audio = caseAudio.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Some browsers require audio permission; the gacha still works silently.
      });
    }
    try {
      const success = await command({ action: "draw", count });
      const latest = groupRef.current;
      if (success && latest) {
        const drawnIds =
          latest.draws?.[memberId] ??
          (latest.ownerId === memberId ? latest.candidates : []);
        const winners = drawnIds
          .map((id) => latest.dishes.find((d) => d.id === id))
          .filter((dish): dish is Dish => !!dish);
        if (winners.length) {
          setCaseOpening(prepareCase(latest.dishes, winners));
          return;
        }
      }
    } catch {
      setError("Không mở được hiệu ứng. Kết quả đã lưu vẫn có ở bên dưới.");
    }
    drawing.current = false;
    setSpinning(false);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(
        "Đã sao chép link. Người nhận nhập tên và tham gia từ danh sách nhóm.",
      );
    } catch {
      setError(
        "Không sao chép được. Bạn có thể copy đường link trên thanh địa chỉ.",
      );
    }
  }

  const owner = group?.ownerId === memberId;
  const locked = group ? isLocked(group, clock ?? new Date()) : false;
  const completed = !!group?.completedAt;
  const payer = group?.members.find((member) => member.id === group.payerId);
  const payerDisplayName = group?.payerName ?? payer?.name;
  const ranked = group
    ? [...group.dishes]
        .map((d) => ({
          ...d,
          count: Object.values(group.votes).filter((id) => id === d.id).length,
        }))
        .sort((a, b) => b.count - a.count)
    : [];
  const voteCount = group ? Object.keys(group.votes).length : 0;
  const confirmedCount = group ? confirmedOrderCount(group) : 0;
  const pendingConfirmationCount = voteCount - confirmedCount;
  const winner = group?.dishes.find((d) => d.id === group.winnerId);
  const myDrawIds = group
    ? group.draws?.[memberId] ??
      (group.ownerId === memberId ? group.candidates : [])
    : [];
  const myDrawDishes = group
    ? myDrawIds
        .map((id) => group.dishes.find((dish) => dish.id === id))
        .filter((dish): dish is Dish => !!dish)
    : [];
  const myDish = group?.dishes.find((dish) => group.votes[memberId] === dish.id);
  const mySavedMixIds = myDish ? group?.mixes?.[memberId] ?? [] : [];
  const mySavedDrinkIds = myDish
    ? group?.drinkSelections?.[memberId] ?? []
    : [];
  const mySavedExtraIds = myDish
    ? group?.extraSelections?.[memberId] ?? []
    : [];
  const myMixIds =
    myDish && orderDraft?.dishId === myDish.id
      ? orderDraft.mixIds
      : mySavedMixIds;
  const myDrinkIds =
    myDish && orderDraft?.dishId === myDish.id
      ? orderDraft.drinkIds
      : mySavedDrinkIds;
  const myExtraIds =
    myDish && orderDraft?.dishId === myDish.id
      ? orderDraft.extraIds
      : mySavedExtraIds;
  const myMixOptions = group && myDish ? mixOptionsFor(group, myDish.id) : [];
  const myMixes = myMixIds
    .map((id) => myMixOptions.find((option) => option.id === id))
    .filter((option): option is Dish => !!option);
  const myDrinks = group ? selectedDishes(group.drinks ?? [], myDrinkIds) : [];
  const myExtras = group ? selectedDishes(group.extras ?? [], myExtraIds) : [];
  const myOrderLabel = myDish
    ? orderLineLabel(myDish, myMixes, myDrinks, myExtras)
    : "";
  const myConfirmed = group && myDish
    ? isOrderConfirmed(group, memberId)
    : false;
  const orderSummary = group
    ? group.dishes
        .map((dish) => ({
          dish,
          orders: group.members
            .filter((member) => group.votes[member.id] === dish.id)
            .map((member) => ({
              member,
              mixes: (group.mixes?.[member.id] ?? [])
                .map((id) => mixOptionsFor(group, dish.id).find((option) => option.id === id))
                .filter((option): option is Dish => !!option),
              drinks: selectedDishes(
                group.drinks ?? [],
                group.drinkSelections?.[member.id] ?? [],
              ),
              extras: selectedDishes(
                group.extras ?? [],
                group.extraSelections?.[member.id] ?? [],
              ),
            })),
        }))
        .filter(({ orders }) => orders.length > 0)
    : [];
  const orderAddOnSummary = group
    ? [
        ...(group.drinks ?? []).map((item) => ({
          item,
          kind: "Đồ uống",
          selections: group.members.filter((member) =>
            (group.drinkSelections?.[member.id] ?? []).includes(item.id),
          ),
        })),
        ...(group.extras ?? []).map((item) => ({
          item,
          kind: "Đồ gọi thêm",
          selections: group.members.filter((member) =>
            (group.extraSelections?.[member.id] ?? []).includes(item.id),
          ),
        })),
      ].filter(({ selections }) => selections.length > 0)
    : [];
  const orderTotal = orderSummary.reduce(
    (total, item) => total + item.orders.length,
    0,
  );
  const visibleGroups = groups.filter(
    (g) =>
      (filter !== "mine" || g.joined) &&
      g.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
  );
  const dateLabel = clock
    ? new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(clock)
    : "Bữa trưa văn phòng";
  const invited = groups.find((g) => g.id === invitedId);
  const selectedRestaurant = restaurantCatalog.find(
    (restaurant) => restaurant.id === selectedRestaurantId,
  );
  const selectedRestaurantMixes =
    selectedRestaurant?.mixFromMenu ??
    (selectedRestaurant?.toppings?.length ?? 0) > 0;
  async function copyOrderSummary() {
    if (!group || !orderSummary.length) return;
    const mainOrderCounts = new Map<string, number>();
    for (const { dish, orders } of orderSummary) {
      for (const { mixes } of orders) {
        const label = mixOrderLabel(dish, mixes);
        mainOrderCounts.set(label, (mainOrderCounts.get(label) ?? 0) + 1);
      }
    }
    const mainOrderLines = [...mainOrderCounts].map(
      ([label, count]) => `X${count} ${label}`,
    );
    const addOnLines = orderAddOnSummary.map(
      ({ item, selections }) => `X${selections.length} ${item.name}`,
    );
    const orderText = [
      ...mainOrderLines,
      ...addOnLines,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(orderText);
      toast.success("Đã sao chép danh sách đặt món.");
    } catch {
      setError(
        "Không sao chép được danh sách. Bạn có thể chọn và copy trực tiếp trên màn hình.",
      );
    }
  }
  const loginForm = (
    <form onSubmit={login} className="form-stack" noValidate>
      <FieldGroup className="form-stack">
        <Field className="field">
          <FieldLabel htmlFor="loginUsername">Tài khoản</FieldLabel>
          <Input
            id="loginUsername"
            value={loginUsername}
            onChange={(event) => setLoginUsername(event.target.value)}
            placeholder="Username"
            minLength={3}
            maxLength={50}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
            aria-invalid={!!authError}
            aria-describedby={authError ? "login-error" : undefined}
            className="h-12"
          />
        </Field>
        <Field className="field">
          <FieldLabel htmlFor="loginPassword">Mật khẩu</FieldLabel>
          <Input
            id="loginPassword"
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            aria-invalid={!!authError}
            aria-describedby={authError ? "login-error" : undefined}
            className="h-12"
          />
        </Field>
        {authError && (
          <Alert id="login-error" variant="destructive" className="dialog-error">
            <TriangleAlert />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={authBusy || !loginUsername.trim() || !loginPassword}
        >
          {authBusy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          Đăng nhập
        </Button>
        <FieldDescription className="form-hint">
          Cùng cả nhóm chọn món cho bữa trưa hôm nay nhé.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
  const passwordForm = (
    <form onSubmit={changePassword} className="form-stack" noValidate>
      <FieldGroup className="form-stack">
        <Field className="field">
          <FieldLabel htmlFor="currentPassword">Mật khẩu hiện tại</FieldLabel>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
            aria-invalid={!!authError}
            aria-describedby={authError ? "password-error" : undefined}
            className="h-12"
            autoFocus
          />
        </Field>
        <Field className="field">
          <FieldLabel htmlFor="newPassword">Mật khẩu mới</FieldLabel>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={!!authError}
            aria-describedby={authError ? "password-error" : undefined}
            className="h-12"
          />
        </Field>
        <Field className="field">
          <FieldLabel htmlFor="confirmPassword">Nhập lại mật khẩu mới</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={!!authError}
            aria-describedby={authError ? "password-error" : undefined}
            className="h-12"
          />
        </Field>
        {authError && (
          <Alert id="password-error" variant="destructive" className="dialog-error">
            <TriangleAlert />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            authBusy ||
            !currentPassword ||
            newPassword.length < 8 ||
            !confirmPassword
          }
        >
          {authBusy ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
          Lưu mật khẩu mới
        </Button>
        <FieldDescription className="form-hint">
          Mật khẩu mới cần ít nhất 8 ký tự và không được trùng mật khẩu hiện tại.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
  const authGate = (
    <section className="welcome-grid auth-grid">
      <div className="welcome-copy">
        <Badge className="soft-badge">
          <ShieldCheck size={14} /> HẸN NHAU GIỜ TRƯA
        </Badge>
        <h1>
          Trưa nay
          <br />
          <span>ăn gì.</span>
        </h1>
        <div className="welcome-food" aria-hidden="true">
          <span>🍜</span>
          <span>🍗</span>
          <span>🍛</span>
          <span>🥗</span>
        </div>
      </div>
      <Card className="welcome-card auth-card">
        <CardContent>
          <span className="round-icon">
            {authStage === "change-password" ? (
              <KeyRound size={27} />
            ) : (
              <DoorOpen size={27} />
            )}
          </span>
          <h2>
            {authStage === "change-password"
              ? `Chào ${authUser?.displayName ?? "bạn"}!`
              : "Đăng nhập để vào bàn"
            }
          </h2>
          <p>
            {authStage === "change-password"
              ? "Đây là lần đầu đăng nhập. Hãy đặt mật khẩu riêng cho tài khoản của bạn."
              : "Nhập tài khoản được cấp để tiếp tục."
            }
          </p>
          {authStage === "change-password" ? passwordForm : loginForm}
        </CardContent>
      </Card>
    </section>
  );

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Button
            type="button"
            variant="ghost"
            className="brand"
            onClick={() => {
              requestVersion.current++;
              setShowProfile(false);
              openGroup(null);
              void refresh();
            }}
            aria-label="Về danh sách nhóm"
          >
            <span className="brand-icon">
              <Utensils size={23} />
            </span>
            <span>
              lunch<span className="brand-dot">.</span>
            </span>
          </Button>
          <div className="header-right">
            <span className="header-date">{dateLabel}</span>
            {authStage === "ready" && authUser ? (
              <div className="account-actions">
                <Button
                  variant="outline"
                  className="profile-button"
                  onClick={() => {
                    setAuthError("");
                    setSpendingError("");
                    setShowProfile(true);
                  }}
                  title="Mở hồ sơ và thống kê chi tiêu"
                >
                  <Avatar className="size-7">
                    <AvatarFallback>{initials(authUser.displayName)}</AvatarFallback>
                  </Avatar>
                  <span>{authUser.displayName}</span>
                  <UserRound size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                  onClick={() => void logout()}
                  disabled={authBusy}
                >
                  <LogOut />
                </Button>
              </div>
            ) : authStage === "demo" && name ? (
              <Button
                variant="outline"
                className="profile-button"
                onClick={() => {
                  setNameInput(name);
                  setNameError("");
                  setSpendingError("");
                  setShowProfile(true);
                }}
                title="Mở hồ sơ và thống kê chi tiêu"
              >
                <Avatar className="size-7">
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <span>{name}</span>
                <Settings2 size={15} />
              </Button>
            ) : (
              <Badge variant="outline" className="internal-badge">
                <Users size={14} /> Bữa trưa văn phòng
              </Badge>
            )}
          </div>
        </div>
      </header>

      {mode === "demo" && (
        <div className="demo-bar">
          Bản dùng thử · Dữ liệu chỉ lưu trên trình duyệt này. Kết nối database
          để các máy cùng tham gia.
        </div>
        )}
        <main className="main-container">
        {error && (
          <Alert variant="destructive" className="error-bar">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button variant="ghost" size="sm" onClick={() => void refresh()}>
                Thử lại
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Đóng thông báo lỗi"
                onClick={() => setError("")}
              >
                <X />
              </Button>
            </AlertAction>
          </Alert>
        )}
        {mode === "loading" && !error ? (
          <div className="loading-state">
            <LoaderCircle className="animate-spin" />
            <p>Đang mở bàn ăn…</p>
          </div>
        ) : mode === "live" && authStage !== "ready" ? (
          authGate
        ) : !name ? (
          <section className="welcome-grid">
            <div className="welcome-copy">
              <Badge className="soft-badge">
                <Sparkles size={14} /> HỘI ĐỒNG NGHIỆP ĐÓI BỤNG
              </Badge>
              <h1>
                Câu hỏi mỗi ngày.
                <br />
                Hôm nay <span>ăn gì?</span>
              </h1>
              <p>
                Vào nhóm, chọn món. Chưa có ý tưởng?
                <br />
                Để gacha gợi ý món riêng cho từng người.
              </p>
              <div className="welcome-food" aria-hidden="true">
                <span>🍜</span>
                <span>🍗</span>
                <span>🍛</span>
                <span>🥗</span>
              </div>
              <div className="welcome-steps">
                <div>
                  <span>01</span> Nhập tên
                </div>
                <ArrowRight />
                <div>
                  <span>02</span> Vào nhóm
                </div>
                <ArrowRight />
                <div>
                  <span>03</span> Khóa đơn
                </div>
              </div>
            </div>
          </section>
        ) : showProfile ? (
          <ProfilePage
            displayName={name || authUser?.displayName || "bạn"}
            entries={spendingEntries}
            loading={spendingLoading}
            error={spendingError}
            demo={mode === "demo"}
            onBack={() => {
              setShowProfile(false);
              setSpendingError("");
            }}
            onRefresh={() => void loadSpending()}
            onManageAccount={() => {
              if (mode === "demo") {
                setNameInput(name);
                setNameError("");
                setDialog("name");
              } else {
                setAuthError("");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setDialog("password");
              }
            }}
            onOpenGroup={(groupId) => void openHistoryGroup(groupId)}
          />
        ) : !group ? (
          <>
            <section className="page-heading">
              <div>
                <h1>
                  Trưa nay ăn gì <span className="heading-emoji">👋</span>
                </h1>
                <p>
                  Tạo nhóm để đặt đồ ăn cho trưa nay
                </p>
              </div>
              <Button
                size="lg"
                onClick={openCreateDialog}
                disabled={mode === "loading"}
              >
                <Plus />
                Tạo nhóm mới
              </Button>
            </section>
            {invited && !invited.joined && !invited.closed && (
              <div className="invite-banner">
                <div>
                  <strong>Bạn được mời vào “{invited.name}”</strong>
                  <p>{invited.ownerName} đang đợi hội mình chọn món.</p>
                </div>
                <Button
                  disabled={busy}
                  onClick={() => void enterGroup(invited)}
                >
                  Tham gia nhóm
                  <ArrowRight />
                </Button>
              </div>
            )}
            <section aria-label="Danh sách nhóm">
              <div className="list-toolbar">
                <ToggleGroup
                  type="single"
                  value={filter}
                  onValueChange={(value) => {
                    if (value) setFilter(value);
                  }}
                  variant="outline"
                  size="sm"
                  className="filter-tabs"
                  aria-label="Lọc danh sách nhóm"
                >
                  <ToggleGroupItem value="all">
                    Tất cả nhóm <span>{groups.length}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="mine">
                    Nhóm của tôi{" "}
                    <span>{groups.filter((g) => g.joined).length}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                <div className="list-search">
                  <Popover
                    open={datePickerOpen}
                    onOpenChange={setDatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="date-picker-trigger"
                        aria-label="Chọn ngày đặt món"
                      >
                        <CalendarDays data-icon="inline-start" />
                        <span>{datePickerLabel(date)}</span>
                        <ChevronDown
                          data-icon="inline-end"
                          className="date-picker-chevron"
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="date-picker-popover"
                    >
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            startMonth={new Date(new Date().getFullYear() - 5, 0, 1)}
                            endMonth={new Date()}
                        selected={parseDateValue(date)}
                        onSelect={(value) => {
                          if (value) {
                            setDate(formatDateValue(value));
                            setDatePickerOpen(false);
                          }
                        }}
                        disabled={{ after: parseDateValue(today()) }}
                        locale={vi}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="search-field">
                    <Search size={17} />
                    <Input
                      aria-label="Tìm nhóm"
                      placeholder="Tìm tên nhóm…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="section-caption">
                <h2>
                  {date === today()
                    ? "Các nhóm hôm nay"
                    : `Các nhóm ngày ${date.split("-").reverse().join("/")}`}
                </h2>
              </div>
              {visibleGroups.length ? (
                <div className="group-grid">
                  {visibleGroups.map((item, index) => (
                    <Card key={item.id} className="group-card">
                      <CardContent>
                        <div className="group-card-top">
                          <span className={`group-icon tone-${index % 3}`}>
                            <Utensils size={23} />
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              item.completed
                                ? "status-completed"
                                : item.closed
                                  ? "status-closed"
                                  : "status-open"
                            }
                          >
                            {item.completed
                              ? "Đã hoàn thành"
                              : item.winner
                                ? "Đã chốt món"
                                : item.closed
                                  ? "Đã khóa đơn"
                                  : "Đang đặt món"}
                          </Badge>
                        </div>
                        <h3>{item.name}</h3>
                        <p className="group-restaurant">
                          <Store size={14} /> {item.restaurantName}
                        </p>
                        <p className="group-owner">
                          <Crown size={14} /> {item.ownerName}
                          {item.joined && <span>· Bạn đã tham gia</span>}
                        </p>
                        <div className="group-numbers">
                          <span>
                            <Users size={16} />
                            {item.memberCount} thành viên
                          </span>
                          <span>
                            <Utensils size={16} />
                            {item.dishCount} món
                          </span>
                        </div>
                        <div className="group-card-bottom">
                          <span>
                            {item.completed ? (
                              <>
                                <CheckCheck size={16} />
                                Đã hoàn thành
                              </>
                            ) : item.winner ? (
                              <>
                                <CheckCheck size={16} />
                                {item.winner}
                              </>
                            ) : item.deadline ? (
                              <>
                                <Clock3 size={15} />
                                Khóa lúc {timeLabel(item.deadline)}
                              </>
                            ) : (
                              "Chưa đặt giờ khóa đơn"
                            )}
                          </span>
                          <Button
                            size="sm"
                            variant={item.joined ? "outline" : "default"}
                            disabled={busy || (item.closed && !item.joined)}
                            onClick={() => void enterGroup(item)}
                          >
                            {item.joined
                              ? "Vào nhóm"
                              : item.closed
                                ? "Đã đóng"
                                : "Tham gia"}
                            <ArrowRight />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty className="empty-state">
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="empty-icon">
                      <Users size={34} />
                    </EmptyMedia>
                    <EmptyTitle>
                      {search
                        ? "Chưa tìm thấy nhóm này"
                        : filter === "mine"
                          ? "Bạn chưa tham gia nhóm nào"
                          : "Chưa có ai mở bàn hôm nay"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {search
                        ? "Thử tìm bằng một tên khác nhé."
                        : ""}
                    </EmptyDescription>
                  </EmptyHeader>
                  {!search && (
                    <EmptyContent>
                      <Button onClick={openCreateDialog}>
                        <Plus />
                        Tạo nhóm của bạn
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="group-breadcrumb">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  requestVersion.current++;
                  openGroup(null);
                  void refresh();
                }}
              >
                <ArrowLeft />
                Danh sách nhóm
              </Button>
              <Button variant="ghost" size="sm" onClick={copyLink}>
                <Copy />
                Copy link nhóm
              </Button>
            </div>
            <section className="page-heading group-heading">
              <div>
                <div className="eyebrow">
                  <Badge
                    variant="outline"
                    className={
                      completed
                        ? "status-completed"
                        : locked
                          ? "status-closed"
                          : "status-open"
                    }
                  >
                    {completed
                      ? "Đã hoàn thành"
                      : winner
                        ? "Đã chốt"
                        : locked
                          ? "Đã khóa đơn"
                          : "Đang đặt món"}
                  </Badge>
                </div>
                <h1>{group.name}</h1>
                <p>
                  <Users size={16} />
                  {group.members.length} thành viên<span>·</span>
                  {group.date.split("-").reverse().join("/")}
                  <span>·</span>
                  {group.deadline
                    ? `Khóa lúc ${timeLabel(group.deadline)}`
                    : "Chưa đặt giờ khóa đơn"}
                  {owner &&
                    !winner &&
                    !completed &&
                    !group.closedAt &&
                    group.date === today() && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-link"
                      onClick={openDeadlineDialog}
                    >
                      Đổi giờ
                    </Button>
                  )}
                </p>
              </div>
              {!completed && (owner || (!locked && !!myDish)) && (
                <div className="group-heading-actions">
                  {!locked && myDish && (
                    <OrderConfirmationButton
                      confirmed={myConfirmed}
                      disabled={spinning}
                      busy={busy}
                      onConfirm={() => void confirmOrder()}
                      onEdit={() => void unconfirmOrder()}
                    />
                  )}
                  {owner && (
                    <>
                      {!winner && !completed && !locked && group.date === today() && (
                        <Button
                          size="lg"
                          disabled={!group.dishes.length || busy || spinning}
                          onClick={() => setDialog("lock")}
                        >
                          <CheckCheck />
                          Khóa đơn
                        </Button>
                      )}
                      {!winner && !completed && locked && group.date === today() && (
                        <Button
                          size="lg"
                          variant="outline"
                          disabled={busy || spinning}
                          onClick={() => void reopenGroup()}
                        >
                          <Pencil />
                          Chỉnh sửa
                        </Button>
                      )}
                      {!completed && locked && (
                        <Button
                          size="lg"
                          disabled={busy || spinning}
                          onClick={openCompleteDialog}
                        >
                          <CheckCheck />
                          Hoàn thành
                        </Button>
                      )}
                      {!winner && !completed && !locked && (
                        <Button
                          size="lg"
                          variant="destructive"
                          disabled={busy || spinning}
                          onClick={() => setDialog("delete")}
                        >
                          <Trash2 />
                          Xóa nhóm
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
            {winner && !completed && (
              <div className="winner-banner">
                <span className="winner-emoji">{winner.emoji}</span>
                <div>
                  <p>CHỐT KÈO! HÔM NAY CẢ HỘI ĂN</p>
                  <h2>{winner.name}</h2>
                  <span>
                    {winner.restaurant} · {money(winner.price)} / người
                  </span>
                </div>
                <Trophy size={40} />
              </div>
            )}
            {locked && (!winner || completed) && (
              <div
                className={`closed-note ${completed ? "completed-note" : ""}`}
              >
                {completed ? <CheckCheck size={18} /> : <Clock3 size={18} />}
                {completed
                  ? `Đơn đã hoàn thành${payer ? ` · ${payer.name} đã thanh toán toàn bộ đơn` : ""}. Thông tin không thể chỉnh sửa.`
                  : group.date !== today()
                    ? "Đây là lượt đặt món của ngày trước. Tạo nhóm mới để tiếp tục hôm nay."
                    : group.closedAt
                      ? "Trưởng nhóm đã khóa đơn. Kiểm tra lựa chọn của từng người nhé."
                      : "Đã hết giờ đặt món. Trưởng nhóm có thể khóa đơn hoặc gia hạn."}
              </div>
            )}
            <div className={`room-grid ${completed ? "completed-room-grid" : ""}`}>
              {!completed && (
              <section>
                <Tabs defaultValue="menu">
                  <TabsList className="room-tabs">
                    <TabsTrigger value="menu" disabled={spinning}>
                      <Utensils />
                      Thực đơn <span>{group.dishes.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="gacha" className="gacha-tab-trigger">
                      <Key />
                      Gacha món
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="menu">
                    <div className="menu-heading">
                      <div>
                        <h2>Hôm nay mình ăn gì?</h2>
                        <p>
                          Mỗi người chọn một suất, kiểm tra lựa chọn rồi bấm
                          xác nhận món.
                        </p>
                      </div>
                      {owner && (
                        <Button
                          variant="outline"
                          disabled={locked || busy}
                          onClick={() => setDialog("dish")}
                        >
                          <Plus />
                          Thêm món vào thực đơn
                        </Button>
                      )}
                    </div>
                    {group.dishes.length ? (
                      <div className="dish-grid">
                        {group.dishes.map((dish, index) => {
                          const selected = group.votes[memberId] === dish.id;
                          const count = Object.values(group.votes).filter(
                            (id) => id === dish.id,
                          ).length;
                          return (
                            <Card
                              key={dish.id}
                              className={`dish-card ${selected ? "selected" : ""}`}
                            >
                              <CardContent>
                                <div
                                  className={`dish-art food-tone-${index % 4}`}
                                >
                                  <span aria-hidden="true">{dish.emoji}</span>
                                  <Badge variant="secondary">
                                    {dish.category}
                                  </Badge>
                                  {owner && !locked && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="remove-dish"
                                      aria-label={`Xóa ${dish.name}`}
                                      disabled={busy || count > 0}
                                      title={
                                        count
                                          ? "Không xóa món đã có suất trên giao diện"
                                          : "Xóa món"
                                      }
                                      onClick={() =>
                                        void command({
                                          action: "removeDish",
                                          dishId: dish.id,
                                        })
                                      }
                                    >
                                      <Trash2 size={15} />
                                    </Button>
                                  )}
                                </div>
                                <div className="dish-info">
                                  <h3>{dish.name}</h3>
                                  <p>{dish.restaurant}</p>
                                  <div className="dish-meta">
                                    <strong>{money(dish.price)}</strong>
                                    <span>{count} suất</span>
                                  </div>
                                  <Button
                                    className="w-full"
                                    variant={selected ? "default" : "outline"}
                                    disabled={locked || busy || selected}
                                    onClick={() => void chooseDish(dish.id)}
                                  >
                                    {selected ? (
                                      <>
                                        <Check />
                                        Bạn đã chọn
                                      </>
                                    ) : (
                                      "Chọn món này"
                                    )}
                                  </Button>
                                  {selected &&
                                    (myMixOptions.length > 0 ||
                                      (group.drinks ?? []).length > 0 ||
                                      (group.extras ?? []).length > 0) && (
                                    <OrderOptionsPicker
                                      dish={dish}
                                      mixOptions={myMixOptions}
                                      drinkOptions={group.drinks ?? []}
                                      extraOptions={group.extras ?? []}
                                      selectedMixIds={myMixIds}
                                      selectedDrinkIds={myDrinkIds}
                                      selectedExtraIds={myExtraIds}
                                      disabled={locked || busy}
                                      hasChanges={
                                        !sameIds(myMixIds, mySavedMixIds) ||
                                        !sameIds(myDrinkIds, mySavedDrinkIds) ||
                                        !sameIds(myExtraIds, mySavedExtraIds)
                                      }
                                      onMixChange={(ids) =>
                                        updateOrderDraft(dish.id, { mixIds: ids })
                                      }
                                      onDrinkChange={(ids) =>
                                        updateOrderDraft(dish.id, { drinkIds: ids })
                                      }
                                      onExtraChange={(ids) =>
                                        updateOrderDraft(dish.id, { extraIds: ids })
                                      }
                                      onSave={() => void saveOrderOptions(dish.id)}
                                    />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Empty className="empty-state compact">
                        <EmptyHeader>
                          <EmptyMedia variant="icon" className="empty-icon">
                            <ChefHat size={38} />
                          </EmptyMedia>
                          <EmptyTitle>Thực đơn đang chờ ý tưởng</EmptyTitle>
                          <EmptyDescription>
                            Trưởng nhóm hãy thêm những món mọi người có thể đặt.
                          </EmptyDescription>
                        </EmptyHeader>
                        {owner && (
                          <EmptyContent>
                            <Button
                              disabled={locked || busy}
                              onClick={() => setDialog("dish")}
                            >
                              <Plus />
                              Thêm món đầu tiên
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    )}
                  </TabsContent>
                  <TabsContent value="gacha">
                    <div className="gacha-panel case-panel">
                      <Badge className="soft-badge">
                        <Sparkles size={14} /> GACHA CHO SUẤT CỦA BẠN
                      </Badge>
                      <h2>Chọn suất của bạn.</h2>
                      <p>
                        Gacha trong {group.dishes.length} món trưởng nhóm đã
                        chọn.
                      </p>
                      <FoodCase
                        dishes={group.dishes}
                        opening={caseOpening}
                        spinning={spinning}
                      />
                      <div className="gacha-actions">
                        <Button
                          size="lg"
                          disabled={
                            locked ||
                            busy ||
                            spinning ||
                            !group.dishes.length
                          }
                          onClick={() => void draw(1)}
                        >
                          <Key />
                          {spinning ? "Đang mở hòm…" : "Mở hòm · 1 món"}
                        </Button>
                        {!!myDrawIds.length && !spinning && (
                          <Button size="lg" variant="outline" onClick={() => setShowCaseResult(true)}>
                            <Sparkles />Xem món vừa mở
                          </Button>
                        )}
                      </div>
                      <p className="gacha-hint">
                        {myDish
                          ? myConfirmed
                            ? `Bạn đã xác nhận ${myOrderLabel}. Có thể đổi trước khi khóa đơn.`
                            : `Bạn đang chọn ${myOrderLabel}. Hãy xác nhận suất trước khi trưởng nhóm khóa đơn.`
                          : "Chọn trực tiếp một món hoặc mở hòm để lấy gợi ý riêng."}
                      </p>
                      {myDish &&
                        (myMixOptions.length > 0 ||
                          (group.drinks ?? []).length > 0 ||
                          (group.extras ?? []).length > 0) && (
                        <OrderOptionsPicker
                          dish={myDish}
                          mixOptions={myMixOptions}
                          drinkOptions={group.drinks ?? []}
                          extraOptions={group.extras ?? []}
                          selectedMixIds={myMixIds}
                          selectedDrinkIds={myDrinkIds}
                          selectedExtraIds={myExtraIds}
                          disabled={locked || busy}
                          hasChanges={
                            !sameIds(myMixIds, mySavedMixIds) ||
                            !sameIds(myDrinkIds, mySavedDrinkIds) ||
                            !sameIds(myExtraIds, mySavedExtraIds)
                          }
                          onMixChange={(ids) =>
                            updateOrderDraft(myDish.id, { mixIds: ids })
                          }
                          onDrinkChange={(ids) =>
                            updateOrderDraft(myDish.id, { drinkIds: ids })
                          }
                          onExtraChange={(ids) =>
                            updateOrderDraft(myDish.id, { extraIds: ids })
                          }
                          onSave={() => void saveOrderOptions(myDish.id)}
                        />
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </section>
              )}
              <aside className="room-sidebar">
                {locked ? (
                  <Card className="order-summary-card">
                    <CardContent>
                      <div className="order-summary-heading">
                        <h2>
                          <CheckCheck size={20} />
                          Danh sách đặt món
                        </h2>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="order-summary-copy"
                          disabled={!orderSummary.length}
                          onClick={() => void copyOrderSummary()}
                          aria-label="Sao chép danh sách đặt món"
                          title="Sao chép danh sách đặt món"
                        >
                          <Copy />
                        </Button>
                      </div>
                      <div className="order-summary-subheading">
                        <p className="muted">
                          Chỉ hiển thị những món đã có người đặt.
                        </p>
                        <Badge variant="secondary">{orderTotal} suất</Badge>
                      </div>
                      {completed && (
                        <div className="order-summary-payer">
                          <CheckCheck size={16} />
                          <span>Người thanh toán</span>
                          <strong>{payerDisplayName ?? "Chưa xác định"}</strong>
                        </div>
                      )}
                      {orderSummary.length ? (
                        <div className="order-summary-list">
                          {orderSummary.map(({ dish, orders }, index) => (
                            <div className="order-summary-item" key={dish.id}>
                              <div className="order-summary-dish">
                                <span
                                  className={`order-summary-emoji food-tone-${index % 4}`}
                                  aria-hidden="true"
                                >
                                  {dish.emoji}
                                </span>
                                <div className="order-summary-dish-copy">
                                  <strong>{dish.name}</strong>
                                  <span>{dish.restaurant}</span>
                                </div>
                                <Badge variant="outline">
                                  {orders.length} suất
                                </Badge>
                              </div>
                              <div
                                className="order-summary-members"
                                aria-label={`Người chọn ${dish.name}`}
                              >
                                  <Users />
                                  <div className="order-summary-name-list">
                                  {orders.map(({ member, mixes, drinks, extras }) => {
                                    const orderLabel = orderLineLabel(
                                      dish,
                                      mixes,
                                      drinks,
                                      extras,
                                    );
                                    const addOnNames = [
                                      ...drinks.map((drink) => drink.name),
                                      ...extras.map((extra) => extra.name),
                                    ];
                                    return (
                                      <span
                                        className="order-summary-name"
                                        key={member.id}
                                        title={orderLabel}
                                      >
                                        <strong>{member.name}</strong>
                                        {mixes.length > 0 && (
                                          <small>
                                            {` · ${mixes
                                              .map(mixDisplayName)
                                              .join(" mix ")}`}
                                          </small>
                                        )}
                                        {addOnNames.length > 0 && (
                                          <small className="order-summary-add-ons">
                                            {` · ${addOnNames.join(" · ")}`}
                                          </small>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              {index < orderSummary.length - 1 && (
                                <Separator className="order-summary-separator" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="order-summary-empty">
                          <Users />
                          <span>Chưa có ai chọn món trước khi khóa đơn.</span>
                        </div>
                      )}
                      {orderAddOnSummary.length > 0 && (
                        <div className="order-add-on-summary">
                          <div className="order-add-on-summary-heading">
                            <h3>Đồ uống &amp; đồ gọi thêm</h3>
                            <span>Đặt riêng theo từng suất</span>
                          </div>
                          <div className="order-add-on-summary-list">
                            {orderAddOnSummary.map(({ item, kind, selections }) => (
                              <div
                                className="order-add-on-summary-item"
                                key={`${kind}-${item.id}`}
                              >
                                <div>
                                  <strong>
                                    {item.emoji} {item.name}
                                  </strong>
                                  <small>
                                    {kind} · {money(item.price)} · {selections
                                      .map((member) => member.name)
                                      .join(" · ")}
                                  </small>
                                </div>
                                <Badge variant="outline">{selections.length} suất</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="result-card">
                    <CardContent>
                      <div className="sidebar-title">
                        <h2>
                          <Flame size={20} />
                          Tiến độ xác nhận
                        </h2>
                        <Badge variant="secondary">
                          {confirmedCount}/{group.members.length}
                        </Badge>
                      </div>
                      <p className="muted">
                        {confirmedCount
                          ? `${confirmedCount} người đã xác nhận suất${pendingConfirmationCount ? ` · ${pendingConfirmationCount} suất chờ xác nhận` : ""}.`
                          : voteCount
                            ? `${voteCount} người đã chọn món nhưng chưa xác nhận.`
                            : "Chưa ai chọn món cho mình."}
                      </p>
                      <div className="ranking">
                        {ranked.map((dish, i) => (
                          <div key={dish.id} className="ranking-item">
                            <div>
                              <span className="rank-number">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <strong>{dish.name}</strong>
                              <span>{dish.count}</span>
                            </div>
                            <Progress
                              value={
                                voteCount ? (dish.count / voteCount) * 100 : 0
                              }
                              className={i === 0 ? "leading" : ""}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {!completed && <Card className="members-card">
                  <CardContent>
                    <div className="sidebar-title">
                      <h2>Thành viên</h2>
                      <Users size={19} />
                    </div>
                    <div className="member-list">
                      {group.members.map((member, i) => {
                        const memberDish = group.dishes.find(
                          (dish) => group.votes[member.id] === dish.id,
                        );
                        const memberMixes = memberDish
                          ? (group.mixes?.[member.id] ?? [])
                              .map((id) =>
                                mixOptionsFor(group, memberDish.id).find(
                                  (option) => option.id === id,
                                ),
                              )
                              .filter((option): option is Dish => !!option)
                          : [];
                        const memberDrinks = selectedDishes(
                          group.drinks ?? [],
                          group.drinkSelections?.[member.id] ?? [],
                        );
                        const memberExtras = selectedDishes(
                          group.extras ?? [],
                          group.extraSelections?.[member.id] ?? [],
                        );
                        const memberOrderLabel = memberDish
                          ? orderLineLabel(
                              memberDish,
                              memberMixes,
                              memberDrinks,
                              memberExtras,
                            )
                          : "";
                        const memberConfirmed = memberDish
                          ? isOrderConfirmed(group, member.id)
                          : false;
                        return (
                          <div className="member-row" key={member.id}>
                          <Avatar className={`tone-${i % 3}`}>
                            <AvatarFallback>
                              {initials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <strong>
                              {member.name}
                              {member.id === memberId && <span> (bạn)</span>}
                            </strong>
                            <p>
                              {member.id === group.ownerId
                                ? "Trưởng nhóm"
                                : "Thành viên"}
                            </p>
                          </div>
                          {memberDish ? (
                            <span
                              className={`member-order ${memberConfirmed ? "is-confirmed" : "is-pending"}`}
                              title={memberOrderLabel}
                            >
                              {memberConfirmed ? (
                                <Check className="member-voted" size={15} />
                              ) : (
                                <Clock3 className="member-unconfirmed" size={15} />
                              )}
                              <span className="member-order-copy">
                                <span>{memberOrderLabel}</span>
                                <small>
                                  {memberConfirmed
                                    ? "Đã xác nhận"
                                    : "Chờ xác nhận"}
                                </small>
                              </span>
                            </span>
                          ) : (
                            <span className="member-pending">Chưa chọn</span>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>}
                {!completed && <div className="side-tip">
                </div>}
              </aside>
            </div>
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>lunch</span>
      </footer>
      <CaseResultDialog
        open={showCaseResult && !completed && !!group && !!myDrawDishes.length}
        dishes={myDrawDishes}
        busy={busy}
        locked={locked}
        canDraw={!locked}
        selectedId={group?.votes[memberId]}
        error={error}
        onOpenChange={setShowCaseResult}
        onChoose={async dishId => {
          if (await chooseDish(dishId)) {
            setShowCaseResult(false);
          }
        }}
        onAgain={() => void draw(1)}
      />
      <Dialog
        open={
          dialog !== null &&
          dialog !== "lock" &&
          dialog !== "complete" &&
          dialog !== "delete"
        }
        onOpenChange={(value) => {
          if (!value && !busy) setDialog(null);
        }}
      >
        <DialogContent
          className={`app-dialog ${
            dialog === "create" && createStep === 2 ? "create-dialog-wide" : ""
          }`}
        >
          <DialogHeader>
            <DialogTitle>
              {dialog === "create"
                ? createStep === 1
                  ? "Chọn quán cho nhóm"
                  : "Chọn món và các lựa chọn thêm"
                : dialog === "dish"
                  ? "Thêm một món ngon"
                  : dialog === "lock"
                    ? "Khóa đơn cho cả nhóm"
                    : dialog === "complete"
                      ? "Hoàn thành đơn nhóm"
                      : dialog === "delete"
                      ? "Xóa nhóm này?"
                      : dialog === "deadline"
                        ? "Hẹn giờ khóa đơn"
                        : dialog === "password"
                          ? "Đổi mật khẩu"
                          : "Mọi người gọi bạn là gì?"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "create"
                ? createStep === 1
                  ? "Đặt tên nhóm và chọn quán trước"
                  : `${selectedRestaurant?.name ?? "Quán đã chọn"} · Chọn món chính, đồ uống và đồ gọi thêm cho cả nhóm.`
                : dialog === "dish"
                  ? "Trưởng nhóm chọn món trong thực đơn để cả nhóm đặt."
                  : dialog === "lock"
                    ? "Sau khi khóa, mỗi người sẽ giữ nguyên suất đã chọn và không thể đổi món."
                    : dialog === "complete"
                      ? "Chọn người đã thanh toán toàn bộ đơn. Sau khi hoàn thành, nhóm sẽ không thể chỉnh sửa hoặc xóa."
                      : dialog === "delete"
                      ? `Nhóm ${group?.name ? `“${group.name}”` : "này"} và toàn bộ lựa chọn sẽ bị xóa khỏi danh sách.`
                      : dialog === "deadline"
                        ? "Giờ Việt Nam (UTC+7). Hết giờ, mọi người sẽ không thể đổi suất."
                        : dialog === "password"
                          ? "Mật khẩu mới sẽ được dùng cho những lần đăng nhập sau."
                          : "Chỉnh lại tên hiển thị của bạn trong nhóm."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive" className="dialog-error">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {dialog === "password" && passwordForm}
          {dialog === "create" && (
            <form className="form-stack" onSubmit={createGroup} noValidate>
              <FieldGroup className="form-stack">
              <div className="create-progress" aria-label="Tiến trình tạo nhóm">
                <span
                  className={`create-progress-step ${createStep === 1 ? "is-current" : "is-complete"}`}
                >
                  <b>01</b>
                  <span>Chọn quán</span>
                </span>
                <span
                  className={`create-progress-step ${createStep === 2 ? "is-current" : ""}`}
                >
                  <b>02</b>
                  <span>Chọn món</span>
                </span>
              </div>
              <Field
                className="field"
                data-invalid={!!createGroupNameError}
              >
                <FieldLabel htmlFor="groupName">Tên nhóm</FieldLabel>
                <Input
                  id="groupName"
                  name="groupName"
                  value={createGroupName}
                  onChange={(event) => {
                    setCreateGroupName(event.target.value);
                    if (event.target.value.trim().length >= 2)
                      setCreateGroupNameError("");
                  }}
                  placeholder="Ví dụ: DST Solution"
                  minLength={2}
                  maxLength={60}
                  required
                  aria-invalid={!!createGroupNameError}
                  aria-describedby={
                    createGroupNameError ? "groupName-error" : undefined
                  }
                />
                <FieldError id="groupName-error">
                  {createGroupNameError}
                </FieldError>
              </Field>
              {createStep === 1 ? (
                <Field className="field">
                  <FieldLabel id="restaurant-label">Quán ăn</FieldLabel>
                  <ToggleGroup
                    type="single"
                    value={selectedRestaurantId}
                    onValueChange={(value) => {
                      if (!value) return;
                      const restaurant = restaurantCatalog.find(
                        (item) => item.id === value,
                      );
                      setSelectedRestaurantId(value);
                      setSelectedMenu(
                        restaurant?.dishes.map((dish) => dish.id) ?? [],
                      );
                      setSelectedDrinks(
                        restaurant?.drinks?.map((drink) => drink.id) ?? [],
                      );
                      setSelectedExtras(
                        restaurant?.extras?.map((extra) => extra.id) ?? [],
                      );
                      setError("");
                    }}
                    variant="outline"
                    className="restaurant-options"
                    aria-label="Chọn quán ăn"
                    aria-labelledby="restaurant-label"
                  >
                    {restaurantCatalog.map((restaurant) => (
                      <ToggleGroupItem
                        key={restaurant.id}
                        value={restaurant.id}
                        className="restaurant-option"
                        aria-label={restaurant.name}
                      >
                        <span className="restaurant-option-icon">
                          <Utensils size={19} />
                        </span>
                        <span className="restaurant-option-meta">
                          <strong>{restaurant.name}</strong>
                          <span>
                            {restaurant.dishes.length} món chính
                            {restaurant.drinks?.length
                              ? ` · ${restaurant.drinks.length} đồ uống`
                              : ""}
                            {restaurant.extras?.length
                              ? ` · ${restaurant.extras.length} món gọi thêm`
                              : ""}
                          </span>
                        </span>
                        <Check className="restaurant-option-check" />
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              ) : (
                <>
                  <div className="selected-restaurant">
                    <span className="restaurant-option-icon">
                      <Utensils size={19} />
                    </span>
                    <span className="restaurant-option-meta">
                      <small>Quán đang chọn</small>
                      <strong>{selectedRestaurant?.name}</strong>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="create-step-back"
                      onClick={() => {
                        setCreateStep(1);
                        setError("");
                      }}
                    >
                      <ArrowLeft />
                      Đổi quán
                    </Button>
                  </div>
                  <Field
                    className="field"
                    data-invalid={!selectedMenu.length}
                  >
                    <FieldLabel id="menu-label">Thực đơn được phép đặt</FieldLabel>
                    <ToggleGroup
                      type="multiple"
                      value={selectedMenu}
                      onValueChange={setSelectedMenu}
                      variant="outline"
                      className="menu-options"
                      aria-label="Chọn món được phép đặt"
                      aria-labelledby="menu-label"
                      aria-invalid={!selectedMenu.length}
                      aria-describedby={!selectedMenu.length ? "menu-error" : undefined}
                    >
                      {selectedRestaurant?.dishes.map((dish) => (
                        <ToggleGroupItem
                          key={dish.id}
                          value={dish.id}
                          variant="outline"
                          className="menu-option"
                        >
                          <span>{dish.emoji}</span>
                          <span className="menu-option-copy">
                            <span>{dish.name}</span>
                            {dish.price > 0 && <small>{money(dish.price)}</small>}
                          </span>
                          <Check className="menu-option-check" />
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <FieldError id="menu-error">
                      {!selectedMenu.length &&
                        "Chọn ít nhất một món để thành viên có thể đặt."}
                    </FieldError>
                  </Field>
                  {(selectedRestaurant?.drinks?.length ?? 0) > 0 && (
                    <Field className="field">
                      <FieldLabel id="drink-menu-label">Đồ uống được phép đặt</FieldLabel>
                      <FieldDescription className="form-hint left">
                        Chọn những đồ uống thành viên có thể thêm vào suất của mình.
                      </FieldDescription>
                      <ToggleGroup
                        type="multiple"
                        value={selectedDrinks}
                        onValueChange={setSelectedDrinks}
                        variant="outline"
                        className="menu-options"
                        aria-label="Chọn đồ uống được phép đặt"
                        aria-labelledby="drink-menu-label"
                      >
                        {selectedRestaurant?.drinks?.map((drink) => (
                          <ToggleGroupItem
                            key={drink.id}
                            value={drink.id}
                            variant="outline"
                            className="menu-option"
                          >
                            <span>{drink.emoji}</span>
                            <span className="menu-option-copy">
                              <span>{drink.name}</span>
                              <small>{money(drink.price)}</small>
                            </span>
                            <Check className="menu-option-check" />
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                  )}
                  {(selectedRestaurant?.extras?.length ?? 0) > 0 && (
                    <Field className="field">
                      <FieldLabel id="extra-menu-label">Đồ gọi thêm được phép đặt</FieldLabel>
                      <FieldDescription className="form-hint left">
                        Đây là món gọi riêng, không tính vào lựa chọn mix.
                      </FieldDescription>
                      <ToggleGroup
                        type="multiple"
                        value={selectedExtras}
                        onValueChange={setSelectedExtras}
                        variant="outline"
                        className="menu-options"
                        aria-label="Chọn đồ gọi thêm được phép đặt"
                        aria-labelledby="extra-menu-label"
                      >
                        {selectedRestaurant?.extras?.map((extra) => (
                          <ToggleGroupItem
                            key={extra.id}
                            value={extra.id}
                            variant="outline"
                            className="menu-option"
                          >
                            <span>{extra.emoji}</span>
                            <span className="menu-option-copy">
                              <span>{extra.name}</span>
                              <small>{money(extra.price)}</small>
                            </span>
                            <Check className="menu-option-check" />
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </Field>
                  )}
                </>
              )}
              {createStep === 1 ? (
                <Button
                  size="lg"
                  type="submit"
                  disabled={busy || !selectedRestaurantId}
                >
                  Tiếp: chọn món
                  <ArrowRight />
                </Button>
              ) : (
                <div className="create-form-actions">
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setCreateStep(1);
                      setError("");
                    }}
                  >
                    <ArrowLeft />
                    Đổi quán
                  </Button>
                  <Button
                    size="lg"
                    type="submit"
                    disabled={busy || !selectedRestaurant || !selectedMenu.length}
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Plus />
                    )}
                    Tạo nhóm và tham gia
                  </Button>
                </div>
              )}
              </FieldGroup>
            </form>
          )}
          {dialog === "dish" && (
            <form className="form-stack" onSubmit={addDish} noValidate>
              <FieldGroup className="form-stack">
              <Field className="field">
                <FieldLabel htmlFor="dishName">Tên món</FieldLabel>
                <Input
                  name="dishName"
                  id="dishName"
                  placeholder="Ví dụ: Bún chả Hà Nội"
                  minLength={2}
                  maxLength={60}
                  required
                  autoFocus
                />
              </Field>
              <Field className="field">
                <FieldLabel htmlFor="restaurant">
                  Tên quán <span className="muted">(không bắt buộc)</span>
                </FieldLabel>
                <Input
                  name="restaurant"
                  id="restaurant"
                  placeholder="Quán quen của bạn"
                  maxLength={100}
                />
              </Field>
              <div className="two-fields">
                <Field className="field">
                  <FieldLabel htmlFor="price">Giá dự kiến (đ)</FieldLabel>
                  <Input
                    name="price"
                    id="price"
                    type="number"
                    min={0}
                    max={10000000}
                    step={1000}
                    placeholder="45000"
                  />
                </Field>
                <Field className="field">
                  <FieldLabel htmlFor="emoji">Biểu tượng</FieldLabel>
                  <Select value={dishEmoji} onValueChange={setDishEmoji}>
                    <SelectTrigger id="emoji" className="emoji-select">
                      <SelectValue placeholder="Chọn biểu tượng" />
                    </SelectTrigger>
                    <SelectContent>
                      {["🍜", "🍗", "🍛", "🥗", "🥖", "🍣", "🍕", "🥟"].map(
                        (emoji) => (
                          <SelectItem key={emoji} value={emoji}>
                            <span className="emoji-option">{emoji}</span>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                <Plus />
                Thêm vào thực đơn
              </Button>
              </FieldGroup>
            </form>
          )}
          {dialog === "deadline" && (
            <form
              className="form-stack"
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                const time = deadlineTime;
                if (
                  await command({
                    action: "deadline",
                    deadline: time
                      ? new Date(
                          `${group!.date}T${time}:00+07:00`,
                        ).toISOString()
                      : null,
                  })
                )
                  setDialog(null);
              }}
            >
              <FieldGroup className="form-stack">
                <Field className="field">
                  <FieldLabel htmlFor="deadline-time">
                    Giờ tự động khóa đơn
                  </FieldLabel>
                  <TimePicker
                    id="deadline-time"
                    value={deadlineTime}
                    onChange={setDeadlineTime}
                    disabled={busy}
                  />
                  <FieldDescription className="form-hint left">
                    Để trống nếu trưởng nhóm muốn tự khóa đơn.
                  </FieldDescription>
                </Field>
                <Button type="submit" size="lg" disabled={busy}>
                  <Clock3 />
                  Lưu giờ khóa đơn
                </Button>
              </FieldGroup>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={dialog === "lock"}
        onOpenChange={(value) => {
          if (!value && !busy) setDialog(null);
        }}
      >
        <AlertDialogContent className="app-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia className="alert-dialog-media-success">
              <CheckCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>Khóa đơn cho cả nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Mỗi người sẽ giữ nguyên suất đã chọn và không thể đổi món sau khi
              đơn được khóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive" className="dialog-error">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="lock-summary">
            <span>{confirmedCount}/{voteCount}</span>
            <p>suất đã xác nhận</p>
            {pendingConfirmationCount > 0 && (
              <small>{pendingConfirmationCount} suất cần xác nhận trước</small>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Để sau</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void lockGroup();
              }}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <CheckCheck />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={dialog === "complete"}
        onOpenChange={(value) => {
          if (!value && !busy) setDialog(null);
        }}
      >
        <AlertDialogContent className="app-alert-dialog complete-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia className="alert-dialog-media-success">
              <CheckCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>Hoàn thành đơn nhóm?</AlertDialogTitle>
            <AlertDialogDescription className="complete-dialog-warning">
              Chọn người đã thanh toán toàn bộ đơn. Sau khi xác nhận, thông tin
              sẽ được lưu để mọi người đối soát và không thể chỉnh sửa nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive" className="dialog-error">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup className="form-stack complete-dialog-fields">
            <Field className="field">
              <FieldLabel htmlFor="payer">Người thanh toán toàn bộ đơn</FieldLabel>
              <Select
                value={payerId || undefined}
                onValueChange={(value) => {
                  setPayerId(value);
                  setError("");
                  if (value === EXTERNAL_PAYER_ID) {
                    setPayerName("");
                  } else {
                    setPayerName(
                      group?.members.find((member) => member.id === value)?.name ??
                        "",
                    );
                  }
                }}
                disabled={busy}
              >
                <SelectTrigger id="payer" aria-label="Chọn người thanh toán">
                  <SelectValue placeholder="Chọn thành viên hoặc người khác" />
                </SelectTrigger>
                <SelectContent
                  className="payer-select-content"
                  position="popper"
                  side="bottom"
                  sideOffset={6}
                  align="start"
                  avoidCollisions={false}
                >
                  {group?.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                      {member.id === group.ownerId ? " · Trưởng nhóm" : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={EXTERNAL_PAYER_ID}>
                    Người khác / ngoài nhóm
                  </SelectItem>
                </SelectContent>
              </Select>
              {payerId === EXTERNAL_PAYER_ID && (
                <Input
                  id="payer-name"
                  value={payerName}
                  onChange={(event) => {
                    setPayerName(event.target.value);
                    setError("");
                  }}
                  placeholder="Nhập họ tên người trả tiền"
                  maxLength={60}
                  autoComplete="name"
                  disabled={busy}
                />
              )}
              <FieldDescription className="form-hint left">
                Có thể chọn thành viên trong nhóm hoặc nhập người trả tiền bên ngoài nhóm.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Để sau</AlertDialogCancel>
            <HoldToConfirmButton
              key={dialog === "complete" ? "complete-open" : "complete-closed"}
              busy={busy}
              disabled={
                busy ||
                !payerId ||
                (payerId === EXTERNAL_PAYER_ID && payerName.trim().length < 2)
              }
              onConfirm={() => void completeGroup()}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={dialog === "delete"}
        onOpenChange={(value) => {
          if (!value && !busy) setDialog(null);
        }}
      >
        <AlertDialogContent className="app-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia className="alert-dialog-media-danger">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Xóa nhóm này?</AlertDialogTitle>
            <AlertDialogDescription>
              Nhóm, thực đơn và lựa chọn của mọi người sẽ bị xóa khỏi danh
              sách. Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive" className="dialog-error">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Giữ lại nhóm</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void deleteGroup();
              }}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              Xóa nhóm vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
