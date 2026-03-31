import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, getEnvelopeError } from "../lib/api";
import type { ApiEnvelope } from "../types";
import { PageFrame } from "../components/PageFrame";
import { AutoDataView } from "../components/AutoDataView";
import { formatBytes, formatDateTime, formatMoney } from "../lib/admin-format";

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

function extractMetrics(stats: Record<string, ApiEnvelope>) {
  const metrics: Array<{ label: string; value: string; hint: string }> = [];

  Object.entries(stats).forEach(([key, envelope]) => {
    const payload = envelope.data;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      Object.entries(payload).slice(0, 2).forEach(([metricKey, metricValue]) => {
        metrics.push({
          label: `${key}.${metricKey}`,
          value: typeof metricValue === "number" ? metricValue.toLocaleString() : String(metricValue),
          hint: "Live response"
        });
      });
    }
  });

  return metrics.slice(0, 6);
}

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    stats: {}
  });
  const [detailUser, setDetailUser] = useState<RankingUserRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailRecords, setDetailRecords] = useState<StatUserRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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
      setDetailRecords((envelope.data as StatUserRecord[]) || []);
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

  const metrics = useMemo(() => extractMetrics(state.stats), [state.stats]);
  const overrideMetrics = (state.stats.override?.data as Record<string, number> | undefined) || {};
  const todayUsers = ((state.stats.users?.data as RankingUserRecord[]) || []).slice(0, 5);
  const lastUsers = ((state.stats.usersLast?.data as RankingUserRecord[]) || []).slice(0, 5);
  const todayServers = ((state.stats.servers?.data as Array<Record<string, unknown>>) || []).slice(0, 5);
  const lastServers = ((state.stats.serversLast?.data as Array<Record<string, unknown>>) || []).slice(0, 5);

  return (
    <PageFrame
      title="Dashboard"
      description="A cleaner control room for live operations. The new dashboard now pulls the same ranking and traffic APIs that the legacy panel used."
      legacyPath="/dashboard"
      onRefresh={() => void loadDashboard()}
      loading={state.loading}
    >
      {state.error ? (
        <Card className="border border-danger-200 bg-danger-50 shadow-none">
          <CardBody className="gap-4 p-6">
            <p className="text-sm text-danger-700">{state.error}</p>
            <Button color="danger" variant="flat" onPress={() => void loadDashboard()}>
              Retry dashboard
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map(metric => (
          <Card key={metric.label} className="border border-white/50 bg-white/90 shadow-panel">
            <CardBody className="gap-3 p-6">
              <Chip className="w-fit bg-slate-100 text-slate-600" radius="full" variant="flat">
                {metric.label}
              </Chip>
              <p className="text-3xl font-semibold tracking-tight text-ink">{metric.value}</p>
              <p className="text-sm text-slate-500">{metric.hint}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-white/50 bg-white/90 shadow-panel">
          <CardHeader>
            <div>
              <p className="text-lg font-semibold text-slate-900">Business Signals</p>
              <p className="text-sm text-slate-500">Core override metrics from the legacy control room.</p>
            </div>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2">
            {[
              ["Online Users", String(overrideMetrics.online_user ?? "—")],
              ["Day Income", overrideMetrics.day_income != null ? formatMoney(Number(overrideMetrics.day_income) / 100) : "—"],
              ["Month Income", overrideMetrics.month_income != null ? formatMoney(Number(overrideMetrics.month_income) / 100) : "—"],
              ["Pending Tickets", String(overrideMetrics.ticket_pending_total ?? "—")],
              ["New Users Today", String(overrideMetrics.day_register_total ?? "—")],
              ["Pending Commissions", String(overrideMetrics.commission_pending_total ?? "—")]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-default-200 bg-default-50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="border border-white/50 bg-white/90 shadow-panel">
          <CardHeader>
            <div>
              <p className="text-lg font-semibold text-slate-900">Rankings</p>
              <p className="text-sm text-slate-500">Today and yesterday rankings now match the legacy panel sources.</p>
            </div>
          </CardHeader>
          <CardBody className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Top Users Today</p>
              {todayUsers.map(user => (
                <button
                  key={`today-user-${user.user_id}`}
                  className="flex w-full items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3 text-left"
                  onClick={() => {
                    setDetailUser(user);
                    setDetailPage(1);
                    setDetailOpen(true);
                  }}
                  type="button"
                >
                  <span className="truncate pr-3 text-sm text-slate-700">{user.email || `User #${user.user_id}`}</span>
                  <span className="text-sm font-semibold text-slate-900">{Number(user.total || 0).toFixed(2)} GB</span>
                </button>
              ))}
              <p className="pt-2 text-sm font-semibold text-slate-900">Top Users Yesterday</p>
              {lastUsers.map(user => (
                <button
                  key={`last-user-${user.user_id}`}
                  className="flex w-full items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3 text-left"
                  onClick={() => {
                    setDetailUser(user);
                    setDetailPage(1);
                    setDetailOpen(true);
                  }}
                  type="button"
                >
                  <span className="truncate pr-3 text-sm text-slate-700">{user.email || `User #${user.user_id}`}</span>
                  <span className="text-sm font-semibold text-slate-900">{Number(user.total || 0).toFixed(2)} GB</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Top Servers Today</p>
              {todayServers.map((server, index) => (
                <div key={`today-server-${index}`} className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                  <span className="truncate pr-3 text-sm text-slate-700">{String(server.server_name || server.server_id || "Unknown server")}</span>
                  <span className="text-sm font-semibold text-slate-900">{Number(server.total || 0).toFixed(2)} GB</span>
                </div>
              ))}
              <p className="pt-2 text-sm font-semibold text-slate-900">Top Servers Yesterday</p>
              {lastServers.map((server, index) => (
                <div key={`last-server-${index}`} className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                  <span className="truncate pr-3 text-sm text-slate-700">{String(server.server_name || server.server_id || "Unknown server")}</span>
                  <span className="text-sm font-semibold text-slate-900">{Number(server.total || 0).toFixed(2)} GB</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {state.loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[280px] items-center justify-center">
            <Spinner color="warning" label="Loading dashboard" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {dashboardSources.map(source => (
            <AutoDataView
              key={source.key}
              title={source.label}
              payload={
                getEnvelopeError(state.stats[source.key])
                  ? { error: getEnvelopeError(state.stats[source.key]) }
                  : state.stats[source.key]?.data ?? state.stats[source.key]
              }
            />
          ))}
        </div>
      )}

      <Modal isOpen={detailOpen} onOpenChange={isOpen => !isOpen && setDetailOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Traffic records for {detailUser?.email || `User #${detailUser?.user_id || ""}`}</ModalHeader>
          <ModalBody className="gap-4">
            {detailLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Spinner color="warning" label="Loading traffic records" />
              </div>
            ) : (
              <>
                <Table removeWrapper aria-label="Traffic detail">
                  <TableHeader>
                    <TableColumn>Date</TableColumn>
                    <TableColumn>Upload</TableColumn>
                    <TableColumn>Download</TableColumn>
                    <TableColumn>Rate</TableColumn>
                  </TableHeader>
                  <TableBody items={detailRecords} emptyContent="No traffic records found">
                    {item => (
                      <TableRow key={`${item.record_at}-${item.id || 0}`}>
                        <TableCell>{formatDateTime(item.record_at)}</TableCell>
                        <TableCell>{formatBytes(item.u || 0)}</TableCell>
                        <TableCell>{formatBytes(item.d || 0)}</TableCell>
                        <TableCell>{item.server_rate || 1}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex justify-center">
                  <Pagination page={detailPage} total={Math.max(1, Math.ceil(detailTotal / 10))} onChange={setDetailPage} />
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDetailOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
