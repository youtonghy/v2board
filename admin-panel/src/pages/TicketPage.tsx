import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { asArray, formatDateTime } from "../lib/admin-format";

interface TicketRecord {
  id: number;
  user_id: number;
  subject?: string;
  level?: number;
  status: number;
  reply_status?: number;
  updated_at?: string;
  created_at?: string;
}

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "0", label: "Open" },
  { key: "1", label: "Closed" }
];

export function TicketPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<TicketRecord[]>([]);
  const [email, setEmail] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  async function loadTickets(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminRequest<TicketRecord[]>("ticket/fetch", {
        query: {
          current: nextPage,
          pageSize: PAGE_SIZE,
          email: email || undefined,
          status: status === "all" ? undefined : status,
          reply_status: replyStatus ? [replyStatus] : undefined
        }
      });
      setRecords(asArray(unwrapEnvelope(envelope)) as TicketRecord[]);
      setTotal(Number(envelope.total || 0));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load tickets");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets(page);
  }, [page, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedReplyStatus = useMemo(
    () => (replyStatus ? new Set([replyStatus]) : new Set<string>()),
    [replyStatus]
  );

  return (
    <PageFrame
      title="Tickets"
      description="The support queue now uses a dedicated HeroUI workbench with status tabs, reply-state filtering, and a direct threaded detail page."
      legacyPath="/ticket"
      onRefresh={() => void loadTickets(page)}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">Support Queue</p>
            <p className="text-sm text-slate-500">Filter open tickets, sort by recency, and jump directly into the threaded detail workflow.</p>
          </div>
          <Tabs
            selectedKey={status}
            onSelectionChange={key => {
              setStatus(String(key));
              setPage(1);
            }}
            color="primary"
            variant="underlined"
          >
            {STATUS_TABS.map(tab => (
              <Tab key={tab.key} title={tab.label} />
            ))}
          </Tabs>
        </CardHeader>
        <CardBody className="gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="User Email" labelPlacement="outside" value={email} onValueChange={setEmail} />
            <Select
              label="Reply Status"
              labelPlacement="outside"
              placeholder="All replies"
              selectedKeys={selectedReplyStatus}
              onSelectionChange={keys => setReplyStatus(String(Array.from(keys)[0] || ""))}
            >
              <SelectItem key="0">Pending Admin Reply</SelectItem>
              <SelectItem key="1">Waiting User Reply</SelectItem>
              <SelectItem key="2">Resolved</SelectItem>
            </Select>
            <div className="flex items-end gap-2">
              <Button color="primary" onPress={() => { setPage(1); void loadTickets(1); }}>
                Apply
              </Button>
              <Button
                variant="flat"
                onPress={() => {
                  setEmail("");
                  setReplyStatus("");
                  setStatus("all");
                  setPage(1);
                  void loadTickets(1);
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="warning" label="Loading tickets" />
            </div>
          ) : (
            <>
              <Table removeWrapper aria-label="Tickets">
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>Subject</TableColumn>
                  <TableColumn>Priority</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn>Updated</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody items={records} emptyContent="No tickets found">
                  {item => (
                    <TableRow key={item.id}>
                      <TableCell>#{item.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{item.subject || "Untitled Ticket"}</p>
                          <p className="text-xs text-slate-500">User #{item.user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="flat">{item.level ?? 0}</Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Chip color={item.status === 1 ? "default" : "success"} variant="flat">
                            {item.status === 1 ? "Closed" : "Open"}
                          </Chip>
                          <Chip variant="flat">Reply {item.reply_status ?? 0}</Chip>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(item.updated_at || item.created_at || null)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="flat" onPress={() => navigate(`/new/ticket/${item.id}`)}>
                          Open thread
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex justify-center">
                <Pagination page={page} total={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </PageFrame>
  );
}
