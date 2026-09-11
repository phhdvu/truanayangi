"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  FileText,
  History,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Settings2,
  TriangleAlert,
  Utensils,
  WalletCards,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  aggregateSpending,
  type SpendingBucket,
  type SpendingEntry,
  type SpendingPeriod,
} from "@/lib/spending";

type ProfilePageProps = {
  displayName: string;
  entries: SpendingEntry[];
  loading: boolean;
  error: string;
  demo: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onManageAccount: () => void;
  onOpenGroup: (groupId: string) => void | Promise<void>;
};

const numberFormat = new Intl.NumberFormat("vi-VN");

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function money(value: number) {
  return value > 0 ? `${numberFormat.format(value)}đ` : "Chưa đủ giá";
}

function totalLabel(value: number, orderCount: number) {
  return value > 0 || orderCount === 0
    ? `${numberFormat.format(value)}đ`
    : "Chưa đủ giá";
}

function dateFromKey(key: string, period: SpendingPeriod) {
  const [year, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, period === "year" ? 0 : month - 1, day, 12);
}

function periodLabel(key: string, period: SpendingPeriod) {
  if (period === "year") return `Năm ${key}`;
  if (period === "day") {
    const [year, month, day] = key.split("-");
    return `${day}/${month}/${year}`;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(dateFromKey(key, period));
}

function payerSummary(entries: SpendingEntry[]) {
  const names = [
    ...new Set(
      entries
        .map((entry) => entry.payerName)
        .filter((name): name is string => !!name),
    ),
  ];
  return names.length ? `Người thanh toán: ${names.join(" · ")}` : "";
}

function BucketIcon({ period }: { period: SpendingPeriod }) {
  if (period === "year") return <History />;
  if (period === "month") return <CalendarRange />;
  return <CalendarDays />;
}

function SpendingBucketList({
  buckets,
  period,
  onOpenGroup,
}: {
  buckets: SpendingBucket[];
  period: SpendingPeriod;
  onOpenGroup: (groupId: string) => void | Promise<void>;
}) {
  if (!buckets.length) {
    return (
      <Empty className="profile-empty-list">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>Chưa có dữ liệu trong khoảng này</EmptyTitle>
          <EmptyDescription>
            Những suất bạn chọn sẽ xuất hiện ở đây sau khi dữ liệu được cập nhật.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="spending-list" role="list">
      {buckets.map((bucket) => (
        <div className="spending-row" key={bucket.key} role="listitem">
          <div className="spending-row-main">
            <span className="spending-period-icon">
              <BucketIcon period={period} />
            </span>
            <div className="spending-row-copy">
              <strong>{periodLabel(bucket.key, period)}</strong>
              <div className="spending-group-list" aria-label="Các nhóm đã đặt">
                {[...new Map(
                  bucket.entries.map((entry) => [
                    entry.groupId,
                    {
                      groupId: entry.groupId,
                      groupName: entry.groupName,
                      date: entry.date,
                      restaurant: entry.restaurant,
                    },
                  ]),
                ).values()].map((group) => (
                  <Button
                    key={group.groupId}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="spending-group-link"
                    onClick={() => void onOpenGroup(group.groupId)}
                  >
                    <Utensils />
                    <span className="spending-group-link-copy">
                      <strong>{group.groupName}</strong>
                      <small>
                        {group.restaurant} · {periodLabel(group.date, "day")}
                      </small>
                    </span>
                    <ArrowRight />
                  </Button>
                ))}
              </div>
              {payerSummary(bucket.entries) && (
                <span className="spending-row-payer">
                  <WalletCards />
                  {payerSummary(bucket.entries)}
                </span>
              )}
            </div>
          </div>
          <div className="spending-row-total">
            <strong>{money(bucket.total)}</strong>
            <span>
              {bucket.unknownPriceOrders
                ? `${bucket.unknownPriceOrders} món chưa có giá`
                : "Đã cập nhật đủ giá"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "primary" | "neutral" | "warning";
}) {
  return (
    <Card className={`profile-stat-card ${tone ? `tone-${tone}` : ""}`}>
      <CardContent>
        <span className="profile-stat-icon">{icon}</span>
        <div>
          <p>{label}</p>
          <strong>{value}</strong>
          <span>{detail}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfilePage({
  displayName,
  entries,
  loading,
  error,
  demo,
  onBack,
  onRefresh,
  onManageAccount,
  onOpenGroup,
}: ProfilePageProps) {
  const monthBuckets = aggregateSpending(entries, "month");
  const yearBuckets = aggregateSpending(entries, "year");
  const dayBuckets = aggregateSpending(entries, "day");
  const knownPriceOrders = entries.filter((entry) => entry.price > 0).length;
  const unknownPriceOrders = entries.length - knownPriceOrders;
  const total = entries.reduce((sum, entry) => sum + entry.price, 0);
  const average = knownPriceOrders ? Math.round(total / knownPriceOrders) : 0;

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-page-heading">
        <div className="profile-page-heading-copy">
          <Button variant="ghost" size="sm" className="profile-back" onClick={onBack}>
            <ArrowLeft />
            Quay lại
          </Button>
          <Badge className="soft-badge">
            <WalletCards size={14} /> HỒ SƠ CÁ NHÂN
          </Badge>
          <div className="profile-title-row">
            <Avatar className="profile-avatar">
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 id="profile-title">Chi tiêu bữa trưa</h1>
              <p>
                Xin chào {displayName}. Theo dõi những suất bạn đã chọn theo
                từng ngày, tháng và năm.
              </p>
            </div>
          </div>
        </div>
        <div className="profile-page-actions">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
          <Button variant="outline" onClick={onManageAccount}>
            {demo ? <Settings2 /> : <KeyRound />}
            {demo ? "Đổi tên hiển thị" : "Đổi mật khẩu"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="profile-error">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              Thử lại
            </Button>
          </AlertAction>
        </Alert>
      )}

      {loading ? (
        <div className="profile-loading" role="status" aria-live="polite">
          <LoaderCircle className="animate-spin" />
          <p>Đang tổng hợp các bữa trưa của bạn…</p>
        </div>
      ) : (
        <>
          <div className="profile-stat-grid">
            <StatCard
              tone="primary"
              icon={<CircleDollarSign />}
              label="Tổng chi tiêu"
              value={totalLabel(total, entries.length)}
              detail={
                unknownPriceOrders
                  ? `${unknownPriceOrders} suất chưa có giá`
                  : entries.length
                    ? "Đã cập nhật đủ giá món"
                    : "Chưa có suất đã chọn"
              }
            />
            <StatCard
              icon={<Utensils />}
              label="Bữa đã chọn"
              value={numberFormat.format(entries.length)}
              detail="Tổng số suất của bạn"
            />
            <StatCard
              icon={<WalletCards />}
              label="Trung bình mỗi bữa"
              value={
                knownPriceOrders
                  ? money(average)
                  : entries.length
                    ? "Chưa đủ giá"
                    : "—"
              }
              detail={
                knownPriceOrders
                  ? `Tính trên ${knownPriceOrders} suất có giá`
                  : entries.length
                    ? "Cần cập nhật giá món"
                    : "Chưa có suất đã chọn"
              }
            />
            <StatCard
              tone="warning"
              icon={<FileText />}
              label="Chưa cập nhật giá"
              value={numberFormat.format(unknownPriceOrders)}
              detail="Suất cần bổ sung giá món"
            />
          </div>

          {!entries.length ? (
            <Empty className="profile-empty-state">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="empty-icon">
                  <Utensils />
                </EmptyMedia>
                <EmptyTitle>Bạn chưa có suất nào</EmptyTitle>
                <EmptyDescription>
                  Khi bạn chọn món trong một nhóm, lịch sử chi tiêu sẽ được ghi
                  lại tại đây.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Card className="profile-history-card">
              <CardContent>
                <div className="profile-history-heading">
                  <div>
                    <p className="eyebrow">LỊCH SỬ ĐẶT MÓN</p>
                    <h2>Nhìn lại những bữa đã chọn</h2>
                  </div>
                  <Badge variant="secondary">
                    {entries.length} suất
                  </Badge>
                </div>
                <Tabs defaultValue="day" className="profile-tabs">
                  <TabsList aria-label="Xem thống kê theo thời gian">
                    <TabsTrigger value="day">
                      <CalendarDays /> Theo ngày
                    </TabsTrigger>
                    <TabsTrigger value="month">
                      <CalendarRange /> Theo tháng
                    </TabsTrigger>
                    <TabsTrigger value="year">
                      <History /> Theo năm
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="day">
                    <SpendingBucketList
                      buckets={dayBuckets}
                      period="day"
                      onOpenGroup={onOpenGroup}
                    />
                  </TabsContent>
                  <TabsContent value="month">
                    <SpendingBucketList
                      buckets={monthBuckets}
                      period="month"
                      onOpenGroup={onOpenGroup}
                    />
                  </TabsContent>
                  <TabsContent value="year">
                    <SpendingBucketList
                      buckets={yearBuckets}
                      period="year"
                      onOpenGroup={onOpenGroup}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
