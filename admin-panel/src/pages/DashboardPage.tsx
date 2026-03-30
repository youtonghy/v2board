import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../lib/api";
import type { ApiEnvelope } from "../types";
import { PageFrame } from "../components/PageFrame";
import { AutoDataView } from "../components/AutoDataView";

interface DashboardState {
  loading: boolean;
  error?: string;
  stats: Record<string, ApiEnvelope>;
}

const dashboardSources = [
  { key: "override", label: "Core Statistics", endpoint: "stat/getOverride" },
  { key: "orders", label: "Order Snapshot", endpoint: "stat/getOrder" },
  { key: "servers", label: "Today Server Ranking", endpoint: "stat/getServerTodayRank" },
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

  async function loadDashboard() {
    setState(current => ({ ...current, loading: true, error: undefined }));
    try {
      const results = await Promise.all(
        dashboardSources.map(source => adminRequest(source.endpoint))
      );

      const stats = Object.fromEntries(
        dashboardSources.map((source, index) => [source.key, results[index]])
      );

      setState({ loading: false, stats });
    } catch (error) {
      setState({
        loading: false,
        stats: {},
        error: error instanceof Error ? error.message : "Dashboard request failed"
      });
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const metrics = useMemo(() => extractMetrics(state.stats), [state.stats]);

  return (
    <PageFrame
      title="Dashboard"
      description="A cleaner control room for live operations. The new dashboard focuses on immediate signal, then hands off to the legacy panel only when a mature action flow is still required."
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
              payload={state.stats[source.key]?.data ?? state.stats[source.key]}
            />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
