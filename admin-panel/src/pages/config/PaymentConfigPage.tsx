import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, unwrapEnvelope } from "../../lib/api";
import { PageFrame } from "../../components/PageFrame";

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

  const selectedPaymentMethod = useMemo(() => {
    return selected?.payment ? new Set([String(selected.payment)]) : new Set<string>();
  }, [selected]);

  return (
    <PageFrame
      title="Payment Config"
      description="Payment entries now have a dedicated HeroUI list and editor. Dynamic provider-specific fields still fall back to editable object fields so the backend contract stays untouched."
      legacyPath="/config/payment"
      onRefresh={() => void loadPayments()}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">Payment Providers</p>
            <p className="text-sm text-slate-500">Create, toggle, inspect, and edit provider records in the new shell.</p>
          </div>
          <Button
            color="primary"
            onPress={() => {
              setSelected(normalizePaymentRecord());
              setDynamicForm({});
              setEditorOpen(true);
            }}
          >
            Add payment
          </Button>
        </CardHeader>
        <CardBody>
          {error ? <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner color="warning" label="Loading payments" />
            </div>
          ) : (
            <Table removeWrapper aria-label="Payments">
              <TableHeader>
                <TableColumn>Sort</TableColumn>
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Method</TableColumn>
                <TableColumn>Enabled</TableColumn>
                <TableColumn align="end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={payments}>
                {(item) => {
                  const index = payments.findIndex(payment => payment.id === item.id);
                  const sorting = sortingId === Number(item.id || 0);

                  return (
                  <TableRow key={String(item.id || item.name || Math.random())}>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={sorting || index <= 0}
                          onPress={() => void reorderPayments(index, index - 1)}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={sorting || index === -1 || index >= payments.length - 1}
                          onPress={() => void reorderPayments(index, index + 1)}
                        >
                          Down
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{item.id ?? "—"}</TableCell>
                    <TableCell>{String(item.name || "Unnamed")}</TableCell>
                    <TableCell>{String(item.payment || "Unknown")}</TableCell>
                    <TableCell>
                      <Switch
                        isSelected={Boolean(Number(item.enable ?? 0))}
                        onValueChange={() => void togglePayment(item)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            setSelected(normalizePaymentRecord(item));
                            setDynamicForm({});
                            void loadPaymentForm(String(item.payment || ""), Number(item.id || 0) || undefined);
                            setEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => void dropPayment(item)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={open => !open && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected?.id ? "Edit payment" : "Create payment"}</ModalHeader>
          <ModalBody className="gap-5">
            <Input
              label="Display Name"
              labelPlacement="outside"
              value={String(selected?.name || "")}
              onValueChange={value => setSelected(current => (current ? { ...current, name: value } : current))}
            />
            <Select
              label="Provider"
              labelPlacement="outside"
              selectedKeys={selectedPaymentMethod}
              onSelectionChange={keys => {
                const nextPayment = String(Array.from(keys)[0] || "");
                setSelected(current => (current ? { ...current, payment: nextPayment, config: normalizeConfigValue(current.config) } : current));
                void loadPaymentForm(nextPayment, Number(selected?.id || 0) || undefined);
              }}
            >
              {methods.map(method => (
                <SelectItem key={method}>{method}</SelectItem>
              ))}
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
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void savePayment()} isLoading={saving}>
              Save payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
