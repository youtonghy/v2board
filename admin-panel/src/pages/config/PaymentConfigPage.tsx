import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { ObjectRecordEditor } from "../../components/ObjectRecordEditor";

type PaymentRecord = Record<string, unknown> & {
  id?: number;
  name?: string;
  payment?: string;
  enable?: number | boolean;
  config?: Record<string, unknown> | string;
};

function normalizePaymentRecord(record?: PaymentRecord | null): PaymentRecord {
  return record ? { ...record } : { payment: "", name: "", enable: 1, config: {} };
}

export function PaymentConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
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
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Method</TableColumn>
                <TableColumn>Enabled</TableColumn>
                <TableColumn align="end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={payments}>
                {item => (
                  <TableRow key={String(item.id || item.name || Math.random())}>
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
                )}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={open => !open && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected?.id ? "Edit payment" : "Create payment"}</ModalHeader>
          <ModalBody className="gap-5">
            <Select
              label="Provider"
              labelPlacement="outside"
              selectedKeys={selectedPaymentMethod}
              onSelectionChange={keys => {
                const nextPayment = Array.from(keys)[0];
                setSelected(current => (current ? { ...current, payment: String(nextPayment || ""), config: current.config || {} } : current));
              }}
            >
              {methods.map(method => (
                <SelectItem key={method}>{method}</SelectItem>
              ))}
            </Select>
            {selected ? (
              <ObjectRecordEditor
                value={selected}
                onChange={setSelected}
                hiddenKeys={["created_at", "updated_at"]}
              />
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
