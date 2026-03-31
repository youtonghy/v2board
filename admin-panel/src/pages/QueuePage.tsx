import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { asArray, asRecord } from "../lib/admin-format";

interface QueueState {
  loading: boolean;
  error?: string;
  stats?: Record<string, unknown>;
  workload?: Record<string, unknown>;
  masters?: unknown[];
  log?: unknown;
}

export function QueuePage() {
  const [state, setState] = useState<QueueState>({ loading: true });

  async function loadQueue() {
    setState(current => ({ ...current, loading: true, error: undefined }));
    try {
      const [statsEnvelope, workloadEnvelope, mastersEnvelope, logEnvelope] = await Promise.all([
        adminRequest<Record<string, unknown>>("system/getQueueStats"),
        adminRequest<Record<string, unknown>>("system/getQueueWorkload"),
        adminRequest<unknown[]>("system/getQueueMasters"),
        adminRequest("system/getSystemLog")
      ]);

      setState({
        loading: false,
        stats: unwrapEnvelope(statsEnvelope),
        workload: unwrapEnvelope(workloadEnvelope),
        masters: asArray(unwrapEnvelope(mastersEnvelope)),
        log: unwrapEnvelope(logEnvelope)
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load queue data"
      });
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const metrics = useMemo(() => {
    const blocks = [asRecord(state.stats), asRecord(state.workload)];
    return blocks.flatMap(block =>
      Object.entries(block).slice(0, 6).map(([key, value]) => ({
        key,
        value: typeof value === "number" ? value.toLocaleString() : JSON.stringify(value)
      }))
    );
  }, [state.stats, state.workload]);

  return (
    <PageFrame
      title="Queue"
      description="The runtime queue page now surfaces backlog, workload snapshots, Horizon masters, and system logs in one operational overview."
      legacyPath="/queue"
      onRefresh={() => void loadQueue()}
      loading={state.loading}
    >
      {state.error ? (
        <Card className="border border-danger-200 bg-danger-50 shadow-none">
          <CardBody className="p-6 text-sm text-danger-700">{state.error}</CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <Card key={metric.key} className="border border-white/60 bg-white/90 shadow-panel">
            <CardBody className="gap-2 p-5">
              <Chip variant="flat" className="w-fit">{metric.key}</Chip>
              <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {state.loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[320px] items-center justify-center">
            <Spinner color="warning" label="Loading queue" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border border-white/60 bg-white/90 shadow-panel">
            <CardHeader>
              <div>
                <p className="text-lg font-semibold text-slate-900">Queue Stats</p>
                <p className="text-sm text-slate-500">Live counters and queue-level backlog information.</p>
              </div>
            </CardHeader>
            <CardBody>
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {JSON.stringify(state.stats, null, 2)}
              </pre>
            </CardBody>
          </Card>

          <Card className="border border-white/60 bg-white/90 shadow-panel">
            <CardHeader>
              <div>
                <p className="text-lg font-semibold text-slate-900">Queue Workload</p>
                <p className="text-sm text-slate-500">Worker and runtime pressure details returned by the backend.</p>
              </div>
            </CardHeader>
            <CardBody>
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {JSON.stringify(state.workload, null, 2)}
              </pre>
            </CardBody>
          </Card>

          <Card className="border border-white/60 bg-white/90 shadow-panel">
            <CardHeader>
              <div>
                <p className="text-lg font-semibold text-slate-900">Master Supervisors</p>
                <p className="text-sm text-slate-500">Horizon master supervisor payload.</p>
              </div>
            </CardHeader>
            <CardBody>
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {JSON.stringify(state.masters, null, 2)}
              </pre>
            </CardBody>
          </Card>

          <Card className="border border-white/60 bg-white/90 shadow-panel">
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">System Log</p>
                <p className="text-sm text-slate-500">Current backend runtime output for quick inspection.</p>
              </div>
              <Button size="sm" variant="flat" onPress={() => void loadQueue()}>
                Reload log
              </Button>
            </CardHeader>
            <CardBody>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                {typeof state.log === "string" ? state.log : JSON.stringify(state.log, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}
