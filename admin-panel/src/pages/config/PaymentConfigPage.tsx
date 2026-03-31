import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  SortableTableRow,
  adminTableActionCellClassName,
  sortableCollisionDetection,
  useSortableTableSensors
} from "../../components/SortableTable";
import { adminRequest, unwrapEnvelope } from "../../lib/api";
import { PageFrame } from "../../components/PageFrame";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../../components/AdminContent";

type PaymentRecord = Record<string, unknown> & {
  id?: number;
  name?: string;
  payment?: string;
  enable?: number | boolean;
  config?: Record<string, unknown> | string;
};

interface PaymentFormField {
  label?: string;
  description?: string;
  type?: string;
  value?: unknown;
}

type PaymentFormSchema = Record<string, PaymentFormField>;

function normalizeConfigValue(config?: PaymentRecord["config"]): Record<string, unknown> {
  if (typeof config === "string") {
    try {
      return JSON.parse(config) as Record<string, unknown>;
    } catch (error) {
      return {};
    }
  }

  if (config && typeof config === "object") {
    return { ...(config as Record<string, unknown>) };
  }

  return {};
}

function normalizePaymentRecord(record?: PaymentRecord | null): PaymentRecord {
  return record
    ? { ...record, config: normalizeConfigValue(record.config) }
    : {
        payment: "",
        name: "",
        icon: "",
        enable: 1,
        notify_domain: "",
        handling_fee_percent: "",
        handling_fee_fixed: "",
        config: {}
      };
}

export function PaymentConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [sortingId, setSortingId] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const [dynamicForm, setDynamicForm] = useState<PaymentFormSchema>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState<string>();
  const sortableSensors = useSortableTableSensors();

  async function loadPayments() {
    setLoading(true);
    setError(undefined);
    try {
      const [paymentsResponse, methodsResponse] = await Promise.all([
        adminRequest<PaymentRecord[]>("payment/fetch"),
        adminRequest<string[]>("payment/getPaymentMethods")
      ]);
      setPayments(unwrapEnvelope(paymentsResponse) || []);
      setMethods((unwrapEnvelope(methodsResponse) || []).map(item => String(item)));
    } catch (nextError) {
      setPayments([]);
      setMethods([]);
      setError(nextError instanceof Error ? nextError.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  async function togglePayment(record: PaymentRecord) {
    await adminRequest("payment/show", {
      method: "POST",
      body: { id: record.id }
    });
    await loadPayments();
  }

  async function dropPayment(record: PaymentRecord) {
    await adminRequest("payment/drop", {
      method: "POST",
      body: { id: record.id }
    });
    await loadPayments();
  }

  async function loadPaymentForm(payment: string, id?: number) {
    if (!payment) {
      setDynamicForm({});
      return;
    }

    setFormLoading(true);
    try {
      const response = await adminRequest<PaymentFormSchema>("payment/getPaymentForm", {
        method: "POST",
        body: { payment, id }
      });
      const schema = unwrapEnvelope(response) || {};
      setDynamicForm(schema);
      setSelected(current => {
        if (!current) return current;
        const nextConfig = normalizeConfigValue(current.config);
        Object.entries(schema).forEach(([key, field]) => {
          if (nextConfig[key] === undefined && field.value !== undefined) {
            nextConfig[key] = field.value;
          }
        });
        return { ...current, config: nextConfig };
      });
    } catch (nextError) {
      setDynamicForm({});
      setError(nextError instanceof Error ? nextError.message : "Failed to load payment form");
    } finally {
      setFormLoading(false);
    }
  }

  async function savePayment() {
    if (!selected) return;
    setSaving(true);
    try {
      await unwrapEnvelope(
        await adminRequest("payment/save", {
          method: "POST",
          body: selected
        })
      );
      setEditorOpen(false);
      setSelected(null);
      await loadPayments();
    } finally {
      setSaving(false);
    }
  }

  async function reorderPayments(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= payments.length) return;

    const nextPayments = [...payments];
    const [current] = nextPayments.splice(fromIndex, 1);
    nextPayments.splice(toIndex, 0, current);

    setPayments(nextPayments);
    setSortingId(Number(current.id || 0));
    setError(undefined);

    try {
      await unwrapEnvelope(
        await adminRequest("payment/sort", {
          method: "POST",
          body: {
            ids: nextPayments.map(item => item.id).filter(Boolean)
          }
        })
      );
      await loadPayments();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to sort payments");
      await loadPayments();
    } finally {
      setSortingId(null);
    }
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || sortingId !== null) return;

    const fromIndex = payments.findIndex(payment => String(payment.id) === String(active.id));
    const toIndex = payments.findIndex(payment => String(payment.id) === String(over.id));
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    void reorderPayments(fromIndex, toIndex);
  }

  const selectedPaymentMethod = useMemo(
    () => (selected?.payment ? String(selected.payment) : null),
    [selected]
  );
  const stats = useMemo(() => {
    const enabled = payments.filter(payment => Boolean(Number(payment.enable ?? 0))).length;
    const configured = payments.filter(payment => Object.keys(normalizeConfigValue(payment.config)).length > 0).length;

    return [
      { label: "Providers", value: String(payments.length), hint: "Registered payment entries" },
      { label: "Enabled", value: String(enabled), hint: "Available at checkout" },
      { label: "Configured", value: String(configured), hint: "Has provider config payload" },
      { label: "Methods", value: String(methods.length), hint: "Selectable provider types" }
    ];
  }, [methods.length, payments]);

  return (
    <PageFrame
      title="Payment Config"
      description="Payment entries now have a dedicated HeroUI list and editor. Dynamic provider-specific fields still fall back to editable object fields so the backend contract stays untouched."
      onRefresh={() => void loadPayments()}
      loading={loading}
    >
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

      <Card shadow="none" radius="lg" className={adminCardClassName}>
        <CardHeader className={adminSectionHeaderClassName}>
          <div>
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Payment Providers</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create, toggle, inspect, and edit provider records in the new shell.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
            onPress={() => {
              setSelected(normalizePaymentRecord());
              setDynamicForm({});
              setEditorOpen(true);
            }}
          >
            Add payment
          </Button>
        </CardHeader>
        <CardContent className={adminSectionBodyClassName}>
          {error ? <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner color="primary" label="Loading payments" />
            </div>
          ) : (
            <DndContext
              sensors={sortableSensors}
              collisionDetection={sortableCollisionDetection}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={payments.map(payment => String(payment.id))}
                strategy={verticalListSortingStrategy}
              >
                <Table aria-label="Payments" classNames={adminTableClassNames}>
                  <Table.Content>
                    <TableHeader>
                      <TableColumn>Sort</TableColumn>
                      <TableColumn>ID</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Method</TableColumn>
                      <TableColumn>Enabled</TableColumn>
                      <TableColumn align="end">Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No payments found">
                    {payments.map(item => {
                      const sorting = sortingId === Number(item.id || 0);

                      return (
                        <SortableTableRow
                          key={String(item.id)}
                          id={String(item.id)}
                          dragLabel={`Reorder payment ${String(item.name || item.id || "")}`}
                          isDisabled={sortingId !== null}
                        >
                          <TableCell>{item.id ?? "—"}</TableCell>
                          <TableCell>{String(item.name || "Unnamed")}</TableCell>
                          <TableCell>{String(item.payment || "Unknown")}</TableCell>
                          <TableCell>
                            <Switch
                              isSelected={Boolean(Number(item.enable ?? 0))}
                              onValueChange={() => void togglePayment(item)}
                            />
                          </TableCell>
                          <TableCell className={adminTableActionCellClassName}>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                color="primary"
                                variant="light"
                                onPress={() => {
                                  setSelected(normalizePaymentRecord(item));
                                  setDynamicForm({});
                                  void loadPaymentForm(String(item.payment || ""), Number(item.id || 0) || undefined);
                                  setEditorOpen(true);
                                }}
                                isDisabled={sorting}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => void dropPayment(item)}
                                isDisabled={sorting}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </SortableTableRow>
                      );
                    })}
                    </TableBody>
                  </Table.Content>
                </Table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={open => !open && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
          <Modal.Header>
              <Modal.Heading>{selected?.id ? "Edit payment" : "Create payment"}</Modal.Heading>
            </Modal.Header>
          <Modal.Body className="gap-5">
            <Input
              label="Display Name"
              labelPlacement="outside"
              value={String(selected?.name || "")}
              onValueChange={value => setSelected(current => (current ? { ...current, name: value } : current))}
            />
            <Select
              label="Provider"
              labelPlacement="outside"
              items={methods.map(method => ({ id: method, label: method }))}
              selectedKey={selectedPaymentMethod}
              onSelectionChange={keys => {
                const nextPayment = String(keys || "");
                setSelected(current => (current ? { ...current, payment: nextPayment, config: normalizeConfigValue(current.config) } : current));
                void loadPaymentForm(nextPayment, Number(selected?.id || 0) || undefined);
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={methods.map(method => ({ id: method, label: method }))}>
                  {item => (
                    <ListBoxItem id={item.id} textValue={item.label}>
                      {item.label}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Icon URL"
                labelPlacement="outside"
                value={String(selected?.icon || "")}
                onValueChange={value => setSelected(current => (current ? { ...current, icon: value } : current))}
              />
              <Input
                label="Notify Domain"
                labelPlacement="outside"
                value={String(selected?.notify_domain || "")}
                onValueChange={value => setSelected(current => (current ? { ...current, notify_domain: value } : current))}
              />
              <Input
                label="Handling Fee (%)"
                labelPlacement="outside"
                type="number"
                value={String(selected?.handling_fee_percent ?? "")}
                onValueChange={value =>
                  setSelected(current => (current ? { ...current, handling_fee_percent: value } : current))
                }
              />
              <Input
                label="Fixed Handling Fee"
                labelPlacement="outside"
                type="number"
                value={String(
                  selected?.handling_fee_fixed === undefined || selected?.handling_fee_fixed === null || selected?.handling_fee_fixed === ""
                    ? ""
                    : Number(selected.handling_fee_fixed) / 100
                )}
                onValueChange={value =>
                  setSelected(current => (current ? { ...current, handling_fee_fixed: value === "" ? "" : String(Math.round(Number(value) * 100)) } : current))
                }
              />
            </div>
            {formLoading ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-default-200 bg-default-50">
                <Spinner color="warning" label="Loading provider form" />
              </div>
            ) : null}
            {Object.keys(dynamicForm).length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(dynamicForm).map(([key, field]) => (
                  <Input
                    key={key}
                    label={field.label || key}
                    labelPlacement="outside"
                    description={field.description || ""}
                    value={String(normalizeConfigValue(selected?.config)[key] ?? field.value ?? "")}
                    onValueChange={value =>
                      setSelected(current => {
                        if (!current) return current;
                        return {
                          ...current,
                          config: {
                            ...normalizeConfigValue(current.config),
                            [key]: value
                          }
                        };
                      })
                    }
                  />
                ))}
              </div>
            ) : null}
            {selected ? (
              <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Gateway Status</p>
                <div className="mt-3">
                  <Switch
                    isSelected={Boolean(Number(selected.enable ?? 0))}
                    onValueChange={value => setSelected(current => (current ? { ...current, enable: value ? 1 : 0 } : current))}
                  >
                    Enable provider after save
                  </Switch>
                </div>
              </div>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void savePayment()} isLoading={saving}>
              Save payment
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
