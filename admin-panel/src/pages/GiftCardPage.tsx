import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../lib/api";
import { GIFTCARD_TYPE_OPTIONS, fromDatetimeInput, toDatetimeInput } from "../lib/admin-constants";
import { PageFrame } from "../components/PageFrame";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

interface PlanOption {
  id: number;
  name: string;
}

interface GiftCardRecord {
  id?: number;
  name?: string;
  code?: string;
  type?: number;
  value?: number | string | null;
  plan_id?: number | string | null;
  limit_use?: number | string | null;
  started_at?: number | null;
  ended_at?: number | null;
  generate_count?: number | string | null;
}

function normalizeGiftCard(record?: GiftCardRecord | null): GiftCardRecord {
  return {
    type: 1,
    ...record
  };
}

export function GiftCardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<GiftCardRecord[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState<GiftCardRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  async function loadGiftCards(nextPage = page) {
    setLoading(true);
    const [giftcardResponse, planResponse] = await Promise.all([
      adminRequest<GiftCardRecord[]>("giftcard/fetch", {
        query: { current: nextPage, pageSize }
      }),
      adminRequest<PlanOption[]>("plan/fetch")
    ]);

    setRecords(giftcardResponse.data || []);
    setTotal(Number(giftcardResponse.total || (giftcardResponse.data || []).length));
    setPlans(planResponse.data || []);
    setPage(nextPage);
    setLoading(false);
  }

  async function saveGiftCard() {
    if (!selected) return;
    setSaving(true);
    try {
      await adminRequest("giftcard/generate", {
        method: "POST",
        body: selected
      });
      setOpen(false);
      await loadGiftCards(page);
    } finally {
      setSaving(false);
    }
  }

  async function dropGiftCard(record: GiftCardRecord) {
    await adminRequest("giftcard/drop", {
      method: "POST",
      body: { id: record.id }
    });
    await loadGiftCards(page);
  }

  useEffect(() => {
    void loadGiftCards(1);
  }, []);

  const selectedType = useMemo(
    () => new Set(selected?.type ? [String(selected.type)] : ["1"]),
    [selected]
  );
  const selectedPlan = useMemo(
    () => (selected?.plan_id ? new Set([String(selected.plan_id)]) : new Set<string>()),
    [selected]
  );
  const stats = useMemo(() => {
    const exchangeCards = records.filter(record => Number(record.type) === 5).length;
    const resetCards = records.filter(record => Number(record.type) === 4).length;
    const coded = records.filter(record => Boolean(record.code)).length;

    return [
      { label: "Current page", value: String(records.length), hint: `Page ${page} inventory` },
      { label: "Plan exchange", value: String(exchangeCards), hint: "Cards bound to plan conversion" },
      { label: "Reset traffic", value: String(resetCards), hint: "Traffic reset type cards" },
      { label: "Predefined codes", value: String(coded), hint: "Non-auto generated codes" }
    ];
  }, [page, records]);

  return (
    <PageFrame
      title="Gift Cards"
      description="Gift cards move to a dedicated HeroUI table and modal editor while preserving the current backend payload format for create, update, and drop operations."
      onRefresh={() => void loadGiftCards(page)}
      loading={loading}
    >
      <div className={adminStatsGridClassName}>
        {stats.map(item => (
          <Card key={item.label} shadow="none" radius="lg" className={adminCardClassName}>
            <CardBody className={adminStatCardBodyClassName}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">{item.value}</p>
              {item.hint ? <p className="text-sm text-slate-500">{item.hint}</p> : null}
            </CardBody>
          </Card>
        ))}
      </div>

      <Card shadow="none" radius="lg" className={adminCardClassName}>
        <CardHeader className={adminSectionHeaderClassName}>
          <div>
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Gift Card Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create or edit gift card batches without dropping back to the generic data explorer.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
            onPress={() => {
              setSelected(normalizeGiftCard());
              setOpen(true);
            }}
          >
            Add gift card
          </Button>
        </CardHeader>
        <CardBody className={`${adminSectionBodyClassName} gap-4`}>
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner color="primary" label="Loading gift cards" />
            </div>
          ) : (
            <>
              <Table aria-label="Gift cards" classNames={adminTableClassNames}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>Name</TableColumn>
                  <TableColumn>Type</TableColumn>
                  <TableColumn>Value</TableColumn>
                  <TableColumn>Code</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody items={records} emptyContent="No gift cards found">
                  {item => (
                    <TableRow key={String(item.id || Math.random())}>
                      <TableCell>{item.id ?? "—"}</TableCell>
                      <TableCell>{item.name || "Untitled"}</TableCell>
                      <TableCell>{GIFTCARD_TYPE_OPTIONS.find(option => option.value === Number(item.type))?.label || "Unknown"}</TableCell>
                      <TableCell>{item.value ?? "—"}</TableCell>
                      <TableCell>{item.code ? <Chip size="sm" variant="flat" className="bg-sky-50 text-sky-700">{item.code}</Chip> : "Auto"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            color="primary"
                            variant="light"
                            onPress={() => {
                              setSelected(normalizeGiftCard(item));
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" color="danger" variant="light" onPress={() => void dropGiftCard(item)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Pagination
                  page={page}
                  total={Math.max(1, Math.ceil(total / pageSize))}
                  onChange={nextPage => void loadGiftCards(nextPage)}
                  showControls
                />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected?.id ? "Edit gift card" : "Create gift card"}</ModalHeader>
          <ModalBody className="grid gap-5 md:grid-cols-2">
            <Input label="Name" labelPlacement="outside" value={selected?.name || ""} onValueChange={value => setSelected(current => (current ? { ...current, name: value } : current))} />
            <Input label="Code" labelPlacement="outside" value={selected?.code || ""} onValueChange={value => setSelected(current => (current ? { ...current, code: value, generate_count: undefined } : current))} />
            <Select
              label="Type"
              labelPlacement="outside"
              selectedKeys={selectedType}
              onSelectionChange={keys => {
                const nextType = Number(Array.from(keys)[0] || 1);
                setSelected(current => (current ? { ...current, type: nextType, value: nextType === 4 ? 0 : current.value } : current));
              }}
            >
              {GIFTCARD_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="Value"
              labelPlacement="outside"
              type="number"
              isDisabled={selected?.type === 4}
              value={String(selected?.type === 4 ? 0 : selected?.value ?? "")}
              onValueChange={value => setSelected(current => (current ? { ...current, value } : current))}
            />
            {selected?.type === 5 ? (
              <Select
                label="Plan"
                labelPlacement="outside"
                selectedKeys={selectedPlan}
                onSelectionChange={keys => {
                  const nextPlan = Array.from(keys)[0];
                  setSelected(current => (current ? { ...current, plan_id: String(nextPlan || "") } : current));
                }}
              >
                {plans.map(plan => (
                  <SelectItem key={String(plan.id)}>{plan.name}</SelectItem>
                ))}
              </Select>
            ) : null}
            <Input
              label="Start Time"
              labelPlacement="outside"
              type="datetime-local"
              value={toDatetimeInput(selected?.started_at)}
              onValueChange={value => setSelected(current => (current ? { ...current, started_at: fromDatetimeInput(value) } : current))}
            />
            <Input
              label="End Time"
              labelPlacement="outside"
              type="datetime-local"
              value={toDatetimeInput(selected?.ended_at)}
              onValueChange={value => setSelected(current => (current ? { ...current, ended_at: fromDatetimeInput(value) } : current))}
            />
            <Input label="Max Uses" labelPlacement="outside" type="number" value={String(selected?.limit_use ?? "")} onValueChange={value => setSelected(current => (current ? { ...current, limit_use: value } : current))} />
            {!selected?.id && !selected?.code ? (
              <Input
                label="Generate Count"
                labelPlacement="outside"
                type="number"
                value={String(selected?.generate_count ?? "")}
                onValueChange={value => setSelected(current => (current ? { ...current, generate_count: value } : current))}
              />
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveGiftCard()} isLoading={saving}>
              Save gift card
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
