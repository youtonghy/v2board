import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Form,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  SearchField,
  TableRow,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminFilterModal } from "../components/AdminFilterModal";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSelectField } from "../components/AdminSelectField";
import { AdminTextField } from "../components/AdminTextField";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { ModalField } from "../components/ModalField";
import { PageFrame } from "../components/PageFrame";
import { formatDateTime, formatMoney, asArray } from "../lib/admin-format";
import { PERIOD_OPTIONS } from "../lib/admin-constants";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

interface OrderRecord {
  id: number;
  user_id?: number;
  trade_no: string;
  status: number;
  total_amount?: number;
  commission_balance?: number;
  commission_status?: number;
  plan_name?: string;
  period?: string;
  type?: number;
  created_at?: string;
}

interface OrderDetail extends OrderRecord {
  commission_log?: Array<Record<string, unknown>>;
  surplus_orders?: Array<Record<string, unknown>>;
}

interface PlanRecord {
  id: number;
  name: string;
}

const PAGE_SIZE = 10;

const ORDER_STATUS: Record<number, { label: string; color: "default" | "success" | "warning" | "danger" }> = {
  0: { label: "Pending", color: "warning" },
  1: { label: "Paid", color: "success" },
  2: { label: "Cancelled", color: "default" },
  3: { label: "Completed", color: "success" }
};

const COMMISSION_STATUS: Record<number, string> = {
  0: "Pending",
  1: "Settled",
  3: "Rejected"
};

function buildOrderFilter(email: string, tradeNo: string, status: string) {
  const filters: Array<{ key: string; condition: string; value: string | number }> = [];
  if (email.trim()) {
    filters.push({ key: "email", condition: "模糊", value: email.trim() });
  }
  if (tradeNo.trim()) {
    filters.push({ key: "trade_no", condition: "模糊", value: tradeNo.trim() });
  }
  if (status) {
    filters.push({ key: "status", condition: "=", value: status });
  }
  return filters;
}

export function OrderPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [email, setEmail] = useState("");
  const [tradeNo, setTradeNo] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignPeriod, setAssignPeriod] = useState("month_price");
  const [assignAmount, setAssignAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function loadOrders(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const [orderEnvelope, planEnvelope] = await Promise.all([
        adminRequest<OrderRecord[]>("order/fetch", {
          query: {
            current: nextPage,
            pageSize: PAGE_SIZE,
            ...(buildOrderFilter(email, tradeNo, status).length
              ? { filter: buildOrderFilter(email, tradeNo, status) }
              : {})
          }
        }),
        adminRequest<PlanRecord[]>("plan/fetch")
      ]);

      setRecords(unwrapEnvelope(orderEnvelope));
      setTotal(Number(orderEnvelope.total || 0));
      setPlans(unwrapEnvelope(planEnvelope));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load orders");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(order: OrderRecord) {
    setSubmitting(true);
    try {
      const envelope = await adminRequest<OrderDetail>("order/detail", {
        method: "POST",
        body: { id: order.id }
      });
      setSelected(unwrapEnvelope(envelope));
      setDetailOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(endpoint: string, body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(await adminRequest(endpoint, { method: "POST", body }));
      setDetailOpen(false);
      await loadOrders(page);
    } finally {
      setSubmitting(false);
    }
  }

  async function assignOrder() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("order/assign", {
          method: "POST",
          body: {
            email: assignEmail,
            plan_id: Number(assignPlanId),
            period: assignPeriod,
            total_amount: Number(assignAmount || 0)
          }
        })
      );
      setAssignOpen(false);
      await loadOrders(1);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadOrders(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedPlan = useMemo(() => assignPlanId || null, [assignPlanId]);
  const selectedPeriod = useMemo(() => assignPeriod || "month_price", [assignPeriod]);
  const assignEmailInvalid = !assignEmail.trim();
  const assignAmountInvalid = !assignAmount.trim();
  const assignPlanInvalid = !assignPlanId;
  const assignPeriodInvalid = !assignPeriod;
  const stats = useMemo(() => {
    const paid = records.filter(record => record.status === 1).length;
    const pending = records.filter(record => record.status === 0).length;
    const volume = records.reduce((sum, record) => sum + Number(record.total_amount || 0), 0) / 100;

    return [
      { label: "Current page", value: String(records.length), hint: `Page ${page} inventory` },
      { label: "Pending", value: String(pending), hint: "Waiting payment or action" },
      { label: "Paid", value: String(paid), hint: "Completed payment state" },
      { label: "Volume", value: formatMoney(volume), hint: "Current page turnover" }
    ];
  }, [page, records]);

  return (
    <PageFrame
      title="Orders"
      description="The order queue now supports search, detail inspection, manual settlement, commission-state updates, and manual assignment inside the new shell."
      onRefresh={() => void loadOrders(page)}
      loading={loading}
    >
      <div className={adminStatsGridClassName}>
        {stats.map(item => (
          <Card key={item.label} className={adminCardClassName}>
            <CardContent className={adminStatCardBodyClassName}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{item.value}</p>
              {item.hint ? <p className="text-sm text-slate-500">{item.hint}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={adminCardClassName}>
        <CardHeader className={adminSectionHeaderClassName}>
          <div>
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Order Operations</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Review payment state, inspect order details, and manually assign or settle orders without switching back to the old page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminFilterModal
              title="Order filters"
              description="Filter orders by user email, trade number, and payment status before refreshing the list."
              onSearch={() => {
                setPage(1);
                void loadOrders(1);
              }}
              onReset={() => {
                setEmail("");
                setTradeNo("");
                setStatus("");
                setPage(1);
                void loadOrders(1);
              }}
              isBusy={loading}
            >
              <div className="flex flex-col gap-4">
                <SearchField className="space-y-2" value={email} onChange={setEmail}>
                  <Label>User Email</Label>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input className="w-full" placeholder="Enter user email" />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>

                <SearchField className="space-y-2" value={tradeNo} onChange={setTradeNo}>
                  <Label>Trade No</Label>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input className="w-full" placeholder="Enter trade no" />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    className="w-full"
                    placeholder="Select one"
                    selectedKey={status || null}
                    onSelectionChange={key => setStatus(String(key || ""))}
                  >
                    <Select.Trigger className="h-9 w-full">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {Object.entries(ORDER_STATUS).map(([key, value]) => (
                          <ListBoxItem key={key} id={key} textValue={value.label}>
                            {value.label}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
            </AdminFilterModal>
            <Button variant="primary" onPress={() => setAssignOpen(true)}>
              Assign order
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-5`}>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <Table variant="secondary" aria-label="Orders" className={adminTableClassNames.wrapper}>
                <Table.ScrollContainer>
                  <Table.Content>
                  <TableHeader>
                    <TableColumn>Trade</TableColumn>
                    <TableColumn>Plan</TableColumn>
                    <TableColumn>Total</TableColumn>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Commission</TableColumn>
                    <TableColumn>Created</TableColumn>
                    <TableColumn>Actions</TableColumn>
                  </TableHeader>
                  <TableBody items={records}>
                    {item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{item.trade_no}</p>
                            <p className="text-xs text-slate-500">User #{item.user_id || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p>{item.plan_name || "Unknown Plan"}</p>
                          <p className="text-xs text-slate-500">{item.period || "—"}</p>
                        </TableCell>
                        <TableCell>{formatMoney((item.total_amount || 0) / 100)}</TableCell>
                        <TableCell>
                          <Chip color={ORDER_STATUS[item.status]?.color || "default"} variant="soft">
                            {ORDER_STATUS[item.status]?.label || item.status}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <p>{COMMISSION_STATUS[item.commission_status || 0] || "Pending"}</p>
                          <p className="text-xs text-slate-500">{formatMoney((item.commission_balance || 0) / 100)}</p>
                        </TableCell>
                        <TableCell>{formatDateTime(item.created_at || null)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onPress={() => void openDetail(item)} isDisabled={submitting}>
                              Details
                            </Button>
                            {item.status === 0 ? (
                              <>
                                <Button size="sm" variant="ghost" onPress={() => void runAction("order/paid", { trade_no: item.trade_no })} isDisabled={submitting}>
                                  Mark paid
                                </Button>
                                <Button size="sm" variant="ghost" onPress={() => void runAction("order/cancel", { trade_no: item.trade_no })} isDisabled={submitting}>
                                  Cancel
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table.Content>
                </Table.ScrollContainer>
              </Table>

              <div className="flex justify-center">
                <AdminPagination page={page} total={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminDrawer
        isOpen={detailOpen}
        onOpenChange={isOpen => !isOpen && setDetailOpen(false)}
        title="Order detail"
        isBusy={submitting}
        size="lg"
        footer={
          <Button variant="ghost" onPress={() => setDetailOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-default-200 bg-default-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Overview</p>
            <p>Trade No: {selected?.trade_no || "—"}</p>
            <p>Plan: {selected?.plan_name || "—"}</p>
            <p>Total: {formatMoney(((selected?.total_amount || 0) as number) / 100)}</p>
            <p>Created: {formatDateTime(selected?.created_at || null)}</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-default-200 bg-default-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Commission</p>
            <p>Status: {COMMISSION_STATUS[selected?.commission_status || 0] || "Pending"}</p>
            <p>Balance: {formatMoney(((selected?.commission_balance || 0) as number) / 100)}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onPress={() => void runAction("order/update", { trade_no: selected?.trade_no, commission_status: 1 })} isDisabled={submitting}>
                Settle
              </Button>
              <Button size="sm" variant="ghost" onPress={() => void runAction("order/update", { trade_no: selected?.trade_no, commission_status: 3 })} isDisabled={submitting}>
                Reject
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Commission Logs</p>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
              {JSON.stringify(asArray(selected?.commission_log), null, 2)}
            </pre>
          </div>
          <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Surplus Orders</p>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">
              {JSON.stringify(asArray(selected?.surplus_orders), null, 2)}
            </pre>
          </div>
        </div>
      </AdminDrawer>

      <AdminDrawer
        isOpen={assignOpen}
        onOpenChange={isOpen => !isOpen && setAssignOpen(false)}
        title="Assign order"
        isBusy={submitting}
        footer={
          <>
            <Button variant="ghost" onPress={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => void assignOrder()}
              isDisabled={submitting || assignEmailInvalid || assignAmountInvalid || assignPlanInvalid || assignPeriodInvalid}
            >
              Create order
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (assignEmailInvalid || assignAmountInvalid || assignPlanInvalid || assignPeriodInvalid) return;
            void assignOrder();
          }}
        >
          <AdminTextField
            label="User Email"
            value={assignEmail}
            onChange={event => setAssignEmail(event.target.value)}
            isRequired
            isInvalid={assignEmailInvalid}
            errorMessage="User email is required."
          />
          <AdminTextField
            label="Total Amount (cents)"
            type="number"
            value={assignAmount}
            onChange={event => setAssignAmount(event.target.value)}
            isRequired
            isInvalid={assignAmountInvalid}
            errorMessage="Total amount is required."
          />
          <ModalField label="Plan" required>
            <AdminSelectField
              ariaLabel="Plan"
              options={plans.map(plan => ({ id: String(plan.id), label: plan.name }))}
              selectedKey={selectedPlan}
              onSelectionChange={key => setAssignPlanId(String(key || ""))}
            />
          </ModalField>
          <ModalField label="Period" required>
            <AdminSelectField
              ariaLabel="Period"
              options={PERIOD_OPTIONS.map(option => ({ id: option.key, label: option.label }))}
              selectedKey={selectedPeriod}
              onSelectionChange={key => setAssignPeriod(String(key || "month_price"))}
            />
          </ModalField>
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
