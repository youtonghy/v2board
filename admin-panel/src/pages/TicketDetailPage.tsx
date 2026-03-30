import { Card, CardBody, Spinner } from "@heroui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminRequest } from "../lib/api";
import { AutoDataView } from "../components/AutoDataView";
import { PageFrame } from "../components/PageFrame";
import type { ApiEnvelope } from "../types";

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const [state, setState] = useState<{ loading: boolean; envelope?: ApiEnvelope; error?: string }>({
    loading: true
  });

  async function loadDetail() {
    if (!ticketId) return;
    setState({ loading: true });
    try {
      const envelope = await adminRequest("ticket/fetch", {
        query: { id: ticketId }
      });
      setState({ loading: false, envelope });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Ticket detail request failed"
      });
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [ticketId]);

  return (
    <PageFrame
      title={`Ticket #${ticketId || "Unknown"}`}
      description="Thread detail is readable in the new shell while reply and closure actions remain safely in the proven legacy interface during the coexistence window."
      legacyPath={`/ticket/${ticketId || ""}`}
      onRefresh={() => void loadDetail()}
      loading={state.loading}
    >
      {state.loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardBody className="flex min-h-[280px] items-center justify-center">
            <Spinner color="warning" label="Loading ticket detail" />
          </CardBody>
        </Card>
      ) : (
        <AutoDataView title="Ticket Detail" payload={state.envelope?.data ?? state.envelope ?? state.error} />
      )}
    </PageFrame>
  );
}
