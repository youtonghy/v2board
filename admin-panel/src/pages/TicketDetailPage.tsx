import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Spinner,
  TextArea
} from "@heroui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { ModalField } from "../components/ModalField";
import { PageFrame } from "../components/PageFrame";
import { formatDateTime } from "../lib/admin-format";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName
} from "../components/AdminContent";

interface TicketMessageRecord {
  id: number;
  message: string;
  created_at?: string;
  is_me?: boolean;
}

interface TicketDetailRecord {
  id: number;
  user_id: number;
  subject?: string;
  level?: number;
  status: number;
  reply_status?: number;
  updated_at?: string;
  created_at?: string;
  message?: TicketMessageRecord[];
}

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const [state, setState] = useState<{ loading: boolean; detail?: TicketDetailRecord; error?: string }>({
    loading: true
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadDetail() {
    if (!ticketId) return;
    setState({ loading: true });
    try {
      const envelope = await adminRequest<TicketDetailRecord>("ticket/fetch", {
        query: { id: ticketId }
      });
      setState({ loading: false, detail: unwrapEnvelope(envelope) });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Ticket detail request failed"
      });
    }
  }

  async function reply() {
    if (!ticketId || !message.trim()) return;
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("ticket/reply", {
          method: "POST",
          body: { id: Number(ticketId), message: message.trim() }
        })
      );
      setMessage("");
      await loadDetail();
    } finally {
      setSubmitting(false);
    }
  }

  async function closeTicket() {
    if (!ticketId) return;
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("ticket/close", {
          method: "POST",
          body: { id: Number(ticketId) }
        })
      );
      await loadDetail();
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [ticketId]);

  const stats = state.detail
    ? [
        { label: "Status", value: state.detail.status === 1 ? "Closed" : "Open", hint: "Current ticket lifecycle" },
        { label: "Reply state", value: String(state.detail.reply_status ?? 0), hint: "Backend reply state value" },
        { label: "Priority", value: String(state.detail.level ?? 0), hint: "Ticket level" },
        { label: "Messages", value: String((state.detail.message || []).length), hint: "Thread entries loaded" }
      ]
    : [];

  return (
    <PageFrame
      title={`Ticket #${ticketId || "Unknown"}`}
      description="Thread detail is readable in the new shell while reply and closure actions remain safely in the proven legacy interface during the coexistence window."
      onRefresh={() => void loadDetail()}
      loading={state.loading}
    >
      {state.detail ? (
        <div className={adminStatsGridClassName}>
          {stats.map(item => (
            <Card key={item.label} shadow="none" radius="lg" className={adminCardClassName}>
              <CardContent className={adminStatCardBodyClassName}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{item.value}</p>
                {item.hint ? <p className="text-sm text-slate-500">{item.hint}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {state.loading ? (
        <Card className="border border-default-200 shadow-none">
          <CardContent className="flex min-h-[280px] items-center justify-center">
            <Spinner color="primary" label="Loading ticket detail" />
          </CardContent>
        </Card>
      ) : state.error ? (
        <Card className="border border-danger-200 bg-danger-50 shadow-none">
          <CardContent className="p-6 text-sm text-danger-700">{state.error}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <Card shadow="none" radius="lg" className={adminCardClassName}>
            <CardHeader className={adminSectionHeaderClassName}>
              <div>
                <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">
                  {state.detail?.subject || `Ticket #${ticketId}`}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Reply directly from the new admin thread view.</p>
              </div>
              <Button color="warning" variant="light" onPress={() => void closeTicket()} isLoading={submitting} isDisabled={state.detail?.status === 1}>
                Close ticket
              </Button>
            </CardHeader>
            <CardContent className={`${adminSectionBodyClassName} gap-4`}>
              <div className="space-y-4">
                {(state.detail?.message || []).map(item => (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-4 ${
                      item.is_me
                        ? "ml-8 bg-sky-50 text-slate-800"
                        : "mr-8 bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="text-sm leading-7">{item.message}</p>
                    <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.created_at || null)}</p>
                  </div>
                ))}
              </div>
              <ModalField label="Reply">
                <TextArea
                  aria-label="Reply"
                  minRows={5}
                  value={message}
                  onValueChange={setMessage}
                  placeholder="Write a reply to the user"
                />
              </ModalField>
              <div className="flex justify-end">
                <Button color="primary" onPress={() => void reply()} isLoading={submitting} isDisabled={!message.trim() || state.detail?.status === 1}>
                  Send reply
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card shadow="none" radius="lg" className={adminCardClassName}>
            <CardHeader className={adminSectionHeaderClassName}>
              <div>
                <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Ticket Meta</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Operational reference for the active support thread.</p>
              </div>
            </CardHeader>
            <CardContent className={`${adminSectionBodyClassName} gap-4 text-sm text-slate-600`}>
              <div>
                <div className="flex gap-2">
                  <Chip color={state.detail?.status === 1 ? "default" : "success"} variant="flat">
                    {state.detail?.status === 1 ? "Closed" : "Open"}
                  </Chip>
                  <Chip variant="flat">Reply {state.detail?.reply_status ?? 0}</Chip>
                </div>
              </div>
              <p>ID: #{state.detail?.id}</p>
              <p>User ID: {state.detail?.user_id}</p>
              <p>Status: {state.detail?.status === 1 ? "Closed" : "Open"}</p>
              <p>Reply Status: {state.detail?.reply_status ?? 0}</p>
              <p>Priority: {state.detail?.level ?? 0}</p>
              <p>Created: {formatDateTime(state.detail?.created_at || null)}</p>
              <p>Updated: {formatDateTime(state.detail?.updated_at || null)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </PageFrame>
  );
}
