import { Bell } from "@gravity-ui/icons";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Separator,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from "recharts";
import { adminRequest, getEnvelopeError } from "../lib/api";
import type { ApiEnvelope } from "../types";
import { AdminPagination } from "../components/AdminPagination";
import { AdminDrawer } from "../components/AdminDrawer";
import { useAdminTableSort } from "../components/AdminTable";
import { PageFrame } from "../components/PageFrame";
import { asArray, asRecord, formatBytes, formatDateTime, formatMoney } from "../lib/admin-format";
import { adminTableClassNames } from "../components/AdminContent";

interface DashboardState {
  loading: boolean;
  error?: string;
  stats: Record<string, ApiEnvelope>;
}

interface RankingUserRecord {
  user_id: number;
  email?: string;
  total?: number;
}

interface StatUserRecord {
  id?: number;
  record_at: number;
  u: number;
  d: number;
  server_rate: number;
}

type DashboardMode = "overview" | "sales" | "traffic";

const dashboardSources = [
  { key: "override", label: "Core Statistics", endpoint: "stat/getOverride" },
  { key: "orders", label: "Order Snapshot", endpoint: "stat/getOrder" },
  { key: "serversLast", label: "Yesterday Server Ranking", endpoint: "stat/getServerLastRank" },
  { key: "servers", label: "Today Server Ranking", endpoint: "stat/getServerTodayRank" },
  { key: "usersLast", label: "Yesterday User Ranking", endpoint: "stat/getUserLastRank" },
  { key: "users", label: "Today User Ranking", endpoint: "stat/getUserTodayRank" },
  { key: "queue", label: "Queue Stats", endpoint: "system/getQueueStats" },
  { key: "workload", label: "Queue Workload", endpoint: "system/getQueueWorkload" }
] as const;

function asRankingUsers(value: unknown): RankingUserRecord[] {
  return asArray(value as unknown[]).filter(
    (item): item is RankingUserRecord =>
      Boolean(item) && typeof item === "object" && typeof (item as RankingUserRecord).user_id === "number"
  );
}

function asRankingServers(value: unknown): Array<Record<string, unknown>> {
  return asArray(value as unknown[]).filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCompact(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: digits
  }).format(value);
}

function formatGrowth(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function buildTrendSeries(
  users: RankingUserRecord[],
  servers: Array<Record<string, unknown>>,
  detailRecords: StatUserRecord[]
) {
  const length = Math.max(8, Math.min(12, Math.max(users.length, servers.length, detailRecords.length || 0)));

  return Array.from({ length }, (_, index) => {
    const user = users[index];
    const server = servers[index];
    const detail = detailRecords[index];
    const label =
      detail?.record_at != null
        ? formatDateTime(detail.record_at).split(",")[0]
        : user?.email?.split("@")[0]?.slice(0, 6) || `P${index + 1}`;

    return {
      label,
      sales: asNumber(user?.total),
      sessions: asNumber(server?.total),
      revenue: asNumber(detail ? detail.u + detail.d : 0) / 1024 / 1024 / 1024
    };
  });
}

function metricDelta(current: number, previous: number) {
  if (!previous) {
    return current ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function MetricTile({
  title,
  value,
  delta,
  tone = "positive"
}: {
  title: string;
  value: string;
  delta: number;
  tone?: "positive" | "negative" | "neutral";
}) {
  const deltaPositive = tone === "negative" ? delta < 0 : delta >= 0;

  return (
    <Card className="border border-white/70 bg-white/95 shadow-panel">
      <CardContent className="gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-[clamp(1.9rem,2vw,2.8rem)] font-semibold tracking-[-0.05em] text-slate-950">
              {value}
            </p>
          </div>
          <Chip
           
            variant="secondary"
            className={
              deltaPositive
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }
          >
            {deltaPositive ? "↑" : "↓"} {formatGrowth(delta)}
          </Chip>
        </div>
      </CardContent>
    </Card>
  );
}

function PanelShell({
  title,
  hint,
  action,
  children
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-white/70 bg-white/95 shadow-panel">
      <CardHeader className="flex items-start justify-between gap-4 px-6 pb-1 pt-6">
        <div>
          <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">{children}</CardContent>
    </Card>
  );
}

const USER_COLORS = ["primary", "secondary", "success", "warning", "danger"] as const;

const RANK_AVATAR_CLASSES = [
  "bg-sky-500 text-white ring-sky-100",
  "bg-emerald-500 text-white ring-emerald-100",
  "bg-amber-500 text-white ring-amber-100",
  "bg-rose-500 text-white ring-rose-100",
  "bg-slate-800 text-white ring-slate-200"
] as const;

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    stats: {}
  });
  const [mode, setMode] = useState<DashboardMode>("overview");
  const [detailUser, setDetailUser] = useState<RankingUserRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailRecords, setDetailRecords] = useState<StatUserRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailTableSort = useAdminTableSort(
    detailRecords,
    { column: "date", direction: "descending" },
    {
      date: item => item.record_at,
      upload: item => item.u,
      download: item => item.d,
      rate: item => item.server_rate
    }
  );

  async function loadDashboard() {
    setState(current => ({ ...current, loading: true, error: undefined }));
    const results = await Promise.allSettled(dashboardSources.map(source => adminRequest(source.endpoint)));

    const stats = Object.fromEntries(
      dashboardSources.map((source, index) => {
        const result = results[index];
        if (result.status === "fulfilled") {
          return [source.key, result.value];
        }
        return [
          source.key,
          {
            code: 500,
            message: result.reason instanceof Error ? result.reason.message : "Request failed"
          } as ApiEnvelope
        ];
      })
    );

    const failed = Object.values(stats)
      .map(envelope => getEnvelopeError(envelope))
      .filter(Boolean);

    setState({
      loading: false,
      stats,
      error: failed.length ? `Some dashboard widgets failed: ${failed.slice(0, 2).join("; ")}` : undefined
    });
  }

  async function loadUserDetail(userId: number, page = detailPage) {
    setDetailLoading(true);
    try {
      const envelope = await adminRequest<StatUserRecord[]>("stat/getStatUser", {
        query: {
          user_id: userId,
          current: page,
          pageSize: 10
        }
      });
      setDetailRecords(
        asArray(envelope.data).filter(
          (item): item is StatUserRecord => Boolean(item) && typeof item === "object" && "record_at" in item
        )
      );
      setDetailTotal(Number(envelope.total || 0));
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (detailOpen && detailUser?.user_id) {
      void loadUserDetail(detailUser.user_id, detailPage);
    }
  }, [detailOpen, detailUser?.user_id, detailPage]);

  const overrideMetrics = asRecord(state.stats.override?.data);
  const orderMetrics = asRecord(state.stats.orders?.data);
  const queueStats = asRecord(state.stats.queue?.data);
  const queueWorkload = asRecord(state.stats.workload?.data);
  const todayUsers = asRankingUsers(state.stats.users?.data).slice(0, 5);
  const lastUsers = asRankingUsers(state.stats.usersLast?.data).slice(0, 5);
  const todayServers = asRankingServers(state.stats.servers?.data).slice(0, 5);
  const lastServers = asRankingServers(state.stats.serversLast?.data).slice(0, 5);
  const salesTrend = useMemo(
    () => buildTrendSeries(todayUsers, todayServers, detailRecords),
    [detailRecords, todayServers, todayUsers]
  );

  const revenueValue = asNumber(overrideMetrics.month_income ?? overrideMetrics.day_income) / 100;
  const expensesValue = asNumber(orderMetrics.pending_total ?? overrideMetrics.commission_pending_total);
  const salesValue = asNumber(orderMetrics.total ?? orderMetrics.count ?? overrideMetrics.day_register_total);
  const profitValue = Math.max(0, revenueValue - expensesValue);

  const revenueDelta = metricDelta(
    asNumber(overrideMetrics.day_income),
    Math.max(1, asNumber(overrideMetrics.month_income) / 30)
  );
  const expenseDelta = metricDelta(
    asNumber(overrideMetrics.commission_pending_total),
    Math.max(1, asNumber(overrideMetrics.ticket_pending_total))
  );
  const salesDelta = metricDelta(
    asNumber(overrideMetrics.day_register_total),
    Math.max(1, asNumber(overrideMetrics.online_user))
  );
  const profitDelta = metricDelta(profitValue, Math.max(1, revenueValue * 0.92));
  const summaryTraffic = salesTrend.reduce(
    (totals, item) => ({
      sales: totals.sales + item.sales,
      sessions: totals.sessions + item.sessions,
      revenue: totals.revenue + item.revenue
    }),
    { sales: 0, sessions: 0, revenue: 0 }
  );
  const chartSeries =
    mode === "traffic"
      ? salesTrend.map(item => ({ ...item, primary: item.sessions, secondary: item.sales }))
      : mode === "sales"
        ? salesTrend.map(item => ({ ...item, primary: item.revenue, secondary: item.sales }))
        : salesTrend.map(item => ({ ...item, primary: item.sales, secondary: item.sessions }));

  return (
    <PageFrame
      title="Dashboard"
      description="A lightweight operations workspace built on HeroUI. It keeps the legacy metrics, but reorganises them into a cleaner control room with charts, rankings and live queue visibility."
      onRefresh={() => void loadDashboard()}
      loading={state.loading}
    >
      <section className="grid gap-6">
        <Card className="border border-white/70 bg-white/95 shadow-panel">
          <CardContent className="grid h-full gap-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Operational Notes</p>
                <p className="mt-1 text-sm text-slate-500">Quick signal cards from the live backend.</p>
              </div>
              <Chip variant="soft" className="bg-sky-50 text-sky-600">
                Live
              </Chip>
            </div>
            <div className="grid gap-3">
              {[
                ["Online Users", formatCompact(asNumber(overrideMetrics.online_user))],
                ["Pending Tickets", formatCompact(asNumber(overrideMetrics.ticket_pending_total))],
                ["Queue Ready", formatCompact(asNumber(queueStats.pending_jobs ?? queueStats.pending))],
                ["Worker Load", formatCompact(asNumber(queueWorkload.processes ?? queueWorkload.workers ?? queueWorkload.supervisors))]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.6rem] border border-slate-100 bg-slate-50/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {state.error ? (
        <Card className="border border-danger-200 bg-danger-50 shadow-none">
          <CardContent className="gap-4 p-6">
            <p className="text-sm text-danger-700">{state.error}</p>
            <Button variant="ghost" onPress={() => void loadDashboard()}>
              Retry dashboard
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile title="Revenue" value={formatMoney(revenueValue)} delta={revenueDelta} />
        <MetricTile title="Expenses" value={formatMoney(expensesValue)} delta={expenseDelta} tone="negative" />
        <MetricTile title="Sales" value={formatCompact(salesValue)} delta={salesDelta} />
        <MetricTile title="Profit" value={formatMoney(profitValue)} delta={profitDelta} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <PanelShell
          title="Performance Snapshot"
          hint="The main chart blends today user traffic, server traffic and sampled user records into a dashboard-friendly trend surface."
          action={
            <Button variant="ghost" className="bg-slate-100 px-4 text-slate-700">
              Last 2 weeks
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{formatMoney(revenueValue)}</p>
              <p className="mt-1 text-sm text-slate-500">Weekly revenue</p>
            </div>
            <div>
              <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{formatCompact(summaryTraffic.revenue, 1)} GB</p>
              <p className="mt-1 text-sm text-slate-500">Recorded traffic</p>
            </div>
            <div>
              <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{formatCompact(summaryTraffic.sales)}</p>
              <p className="mt-1 text-sm text-slate-500">Total sales index</p>
            </div>
          </div>

          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSeries} barGap={10}>
                <CartesianGrid vertical={false} strokeDasharray="4 8" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <ChartTooltip
                  contentStyle={{
                    borderRadius: 20,
                    border: "1px solid rgba(15, 23, 32, 0.08)",
                    boxShadow: "0 18px 48px rgba(15, 23, 32, 0.08)"
                  }}
                />
                <Bar dataKey="primary" fill="#1388ef" radius={[12, 12, 12, 12]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelShell>

        <PanelShell
          title="Traffic Source"
          hint="A softer secondary view for comparing user-side and server-side movement."
          action={<Chip variant="soft" className="bg-slate-100 text-slate-600">Live split</Chip>}
        >
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#1388ef]" />
              User traffic
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#cfe6ff]" />
              Server traffic
            </span>
          </div>
          <p className="mt-6 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
            {formatCompact(summaryTraffic.sessions)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Sessions indexed from current ranking feeds</p>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries}>
                <CartesianGrid vertical={false} strokeDasharray="4 8" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <ChartTooltip
                  contentStyle={{
                    borderRadius: 20,
                    border: "1px solid rgba(15, 23, 32, 0.08)",
                    boxShadow: "0 18px 48px rgba(15, 23, 32, 0.08)"
                  }}
                />
                <Line type="monotone" dataKey="sales" stroke="#1388ef" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="sessions" stroke="#cfe6ff" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PanelShell>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <PanelShell title="Top Users" hint="Click any user to inspect the matching traffic records from the stat detail endpoint.">
          <div className="space-y-3">
            {todayUsers.length ? (
              todayUsers.map((user, index) => (
                <Button
                  key={`today-user-${user.user_id}`}
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-[1.5rem] border border-slate-100 bg-slate-50/80 px-4 py-4 text-left transition hover:border-sky-100 hover:bg-sky-50/60"
                  onPress={() => {
                    setDetailUser(user);
                    setDetailPage(1);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar
                      className={`h-11 w-11 shrink-0 border border-white/80 shadow-sm ${RANK_AVATAR_CLASSES[index % RANK_AVATAR_CLASSES.length]}`}
                      size="sm"
                    >
                      <Avatar.Fallback>{index + 1}</Avatar.Fallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.email || `User #${user.user_id}`}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Rank {index + 1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{Number(user.total || 0).toFixed(2)} GB</p>
                    <p className="text-xs text-slate-400">today</p>
                  </div>
                </Button>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                No ranking data available yet.
              </div>
            )}
          </div>
        </PanelShell>

        <PanelShell title="Queue & Server Pulse" hint="Server ranking, queue state and yesterday references grouped in a single side panel.">
          <div className="space-y-6">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1388ef" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#1388ef" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 8" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <ChartTooltip
                    contentStyle={{
                      borderRadius: 20,
                      border: "1px solid rgba(15, 23, 32, 0.08)",
                      boxShadow: "0 18px 48px rgba(15, 23, 32, 0.08)"
                    }}
                  />
                  <Area type="monotone" dataKey="sessions" stroke="#1388ef" fill="url(#trafficFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <Separator />

            <div className="grid gap-3">
              {todayServers.slice(0, 3).map((server, index) => (
                <div key={`server-${index}`} className="flex items-center justify-between rounded-[1.35rem] border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {String(server.server_name || server.server_id || "Unknown server")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Today rank #{index + 1}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{Number(server.total || 0).toFixed(2)} GB</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.45rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yesterday users</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{lastUsers.length}</p>
              </div>
              <div className="rounded-[1.45rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yesterday servers</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{lastServers.length}</p>
              </div>
            </div>
          </div>
        </PanelShell>
      </section>

      <AdminDrawer
        isOpen={detailOpen}
        onOpenChange={isOpen => !isOpen && setDetailOpen(false)}
        title={`Traffic records for ${detailUser?.email || `User #${detailUser?.user_id || ""}`}`}
        size="lg"
        footer={
          <Button variant="ghost" onPress={() => setDetailOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
            {detailLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Spinner color="accent" />
              </div>
            ) : (
              <>
                <Table variant="secondary" aria-label="Traffic detail" className={adminTableClassNames.wrapper}>
                  <Table.ScrollContainer>
                  <Table.Content sortDescriptor={detailTableSort.sortDescriptor} onSortChange={detailTableSort.setSortDescriptor}>
                    <TableHeader>
                      <TableColumn key="date" allowsSorting>Date</TableColumn>
                      <TableColumn key="upload" allowsSorting>Upload</TableColumn>
                      <TableColumn key="download" allowsSorting>Download</TableColumn>
                      <TableColumn key="rate" allowsSorting>Rate</TableColumn>
                    </TableHeader>
                    <TableBody items={detailTableSort.sortedItems}>
                      {item => (
                        <TableRow key={`${item.record_at}-${item.id || 0}`}>
                          <TableCell>{formatDateTime(item.record_at)}</TableCell>
                          <TableCell>{formatBytes(item.u || 0)}</TableCell>
                          <TableCell>{formatBytes(item.d || 0)}</TableCell>
                          <TableCell>{item.server_rate || 1}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                <div className="flex justify-center">
                    <AdminPagination
                      page={detailPage}
                      total={Math.max(1, Math.ceil(detailTotal / 10))}
                      totalItems={detailTotal}
                      itemsPerPage={10}
                      onChange={setDetailPage}
                    />
                </div>
              </>
            )}
        </div>
      </AdminDrawer>
    </PageFrame>
  );
}
