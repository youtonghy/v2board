import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, getEnvelopeError, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { asArray, asRecord } from "../lib/admin-format";
import { SectionCard, StatGrid } from "../components/AdminContent";

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
    const [statsResult, workloadResult, mastersResult, logResult] = await Promise.allSettled([
      adminRequest<Record<string, unknown>>("system/getQueueStats"),
      adminRequest<Record<string, unknown>>("system/getQueueWorkload"),
      adminRequest<unknown[]>("system/getQueueMasters"),
      adminRequest("system/getSystemLog")
    ]);

    const statsEnvelope =
      statsResult.status === "fulfilled"
        ? statsResult.value
        : ({ code: 500, message: statsResult.reason instanceof Error ? statsResult.reason.message : "Queue stats failed" });
    const workloadEnvelope =
      workloadResult.status === "fulfilled"
        ? workloadResult.value
        : ({ code: 500, message: workloadResult.reason instanceof Error ? workloadResult.reason.message : "Queue workload failed" });
    const mastersEnvelope =
      mastersResult.status === "fulfilled"
        ? mastersResult.value
        : ({ code: 500, message: mastersResult.reason instanceof Error ? mastersResult.reason.message : "Queue masters failed" });
    const logEnvelope =
      logResult.status === "fulfilled"
        ? logResult.value
        : ({ code: 500, message: logResult.reason instanceof Error ? logResult.reason.message : "System log failed" });

    const errors = [
      getEnvelopeError(statsEnvelope),
      getEnvelopeError(workloadEnvelope),
      getEnvelopeError(mastersEnvelope),
      getEnvelopeError(logEnvelope)
    ].filter(Boolean);

    setState({
      loading: false,
      error: errors.length ? `Some queue widgets failed: ${errors.slice(0, 2).join("; ")}` : undefined,
      stats: getEnvelopeError(statsEnvelope) ? { error: getEnvelopeError(statsEnvelope) } : unwrapEnvelope(statsEnvelope),
      workload: getEnvelopeError(workloadEnvelope) ? { error: getEnvelopeError(workloadEnvelope) } : unwrapEnvelope(workloadEnvelope),
      masters: getEnvelopeError(mastersEnvelope) ? [{ error: getEnvelopeError(mastersEnvelope) }] : asArray(unwrapEnvelope(mastersEnvelope)),
      log: getEnvelopeError(logEnvelope) ? { error: getEnvelopeError(logEnvelope) } : unwrapEnvelope(logEnvelope)
    });
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
  const statCards = useMemo(
    () =>
      metrics.slice(0, 4).map(metric => ({
        label: metric.key,
        value: metric.value,
        hint: "Live queue metric"
      })),
    [metrics]
  );

  return (
    <PageFrame
      title="Queue"
      description="The runtime queue page now surfaces backlog, workload snapshots, Horizon masters, and system logs in one operational overview."
      onRefresh={() => void loadQueue()}
      loading={state.loading}
    >
      {state.error ? (
        <Card className="border border-danger-200 bg-danger-50 shadow-none">
          <CardBody className="p-6 text-sm text-danger-700">{state.error}</CardBody>
        </Card>
      ) : null}

      <StatGrid items={statCards} />

      {state.loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[320px] items-center justify-center">
            <Spinner color="primary" label="Loading queue" />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Queue Stats" description="Live counters and queue-level backlog information.">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {JSON.stringify(state.stats, null, 2)}
              </pre>
          </SectionCard>

          <SectionCard title="Queue Workload" description="Worker and runtime pressure details returned by the backend.">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {JSON.stringify(state.workload, null, 2)}
              </pre>
          </SectionCard>

          <SectionCard title="Master Supervisors" description="Horizon master supervisor payload.">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
                {JSON.stringify(state.masters, null, 2)}
              </pre>
          </SectionCard>

          <SectionCard
            title="System Log"
            description="Current backend runtime output for quick inspection."
            action={<Button size="sm" color="primary" variant="light" onPress={() => void loadQueue()}>Reload log</Button>}
          >
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                {typeof state.log === "string" ? state.log : JSON.stringify(state.log, null, 2)}
              </pre>
          </SectionCard>
        </div>
      )}
    </PageFrame>
  );
}
