import { Button, Card, CardBody, CardHeader, Spinner } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import type { ApiEnvelope, ResourcePageSpec } from "../types";
import { adminRequest } from "../lib/api";
import { AutoDataView } from "./AutoDataView";
import { PageFrame } from "./PageFrame";

type ResourceState = Record<
  string,
  {
    loading: boolean;
    envelope?: ApiEnvelope;
    error?: string;
  }
>;

export function ResourceExplorer({ spec }: { spec: ResourcePageSpec }) {
  const [state, setState] = useState<ResourceState>(() =>
    Object.fromEntries(
      spec.sources.map(source => [source.id, { loading: true }])
    )
  );

  async function loadAll() {
    setState(current =>
      Object.fromEntries(
        spec.sources.map(source => [source.id, { ...current[source.id], loading: true }])
      )
    );

    await Promise.all(
      spec.sources.map(async source => {
        try {
          const envelope = await adminRequest(source.endpoint, {
            method: source.method || "GET",
            query: source.query
          });

          setState(current => ({
            ...current,
            [source.id]: { loading: false, envelope }
          }));
        } catch (error) {
          setState(current => ({
            ...current,
            [source.id]: {
              loading: false,
              error: error instanceof Error ? error.message : "Request failed"
            }
          }));
        }
      })
    );
  }

  useEffect(() => {
    void loadAll();
  }, [spec]);

  const loading = useMemo(
    () => Object.values(state).some(entry => entry.loading),
    [state]
  );

  return (
    <PageFrame
      title={spec.title}
      description={spec.description}
      legacyPath={spec.legacyPath}
      onRefresh={() => void loadAll()}
      loading={loading}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        {spec.sources.map(source => {
          const entry = state[source.id];
          if (!entry || entry.loading) {
            return (
              <Card key={source.id} className="min-h-[260px] border border-default-200 shadow-none">
                <CardBody className="flex items-center justify-center">
                  <Spinner color="warning" label={`Loading ${source.label}`} />
                </CardBody>
              </Card>
            );
          }

          if (entry.error) {
            return (
              <Card key={source.id} className="border border-danger-200 bg-danger-50 shadow-none">
                <CardHeader className="font-semibold text-danger">{source.label}</CardHeader>
                <CardBody className="space-y-4">
                  <p className="text-sm text-danger-700">{entry.error}</p>
                  <Button color="danger" variant="flat" onPress={() => void loadAll()}>
                    Retry
                  </Button>
                </CardBody>
              </Card>
            );
          }

          return <AutoDataView key={source.id} title={source.label} payload={entry.envelope?.data ?? entry.envelope} />;
        })}
      </div>
    </PageFrame>
  );
}
