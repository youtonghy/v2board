import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Modal,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSelectField } from "../components/AdminSelectField";
import { adminRequest } from "../lib/api";
import { GIFTCARD_TYPE_OPTIONS, fromDatetimeInput, toDatetimeInput } from "../lib/admin-constants";
import { ModalField } from "../components/ModalField";
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
        body: selected as Record<string, unknown>
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

  const selectedType = useMemo(() => (selected?.type ? String(selected.type) : "1"), [selected]);
  const selectedPlan = useMemo(() => (selected?.plan_id ? String(selected.plan_id) : null), [selected]);
  const typeOptions = useMemo(
    () => GIFTCARD_TYPE_OPTIONS.map(option => ({ id: option.key, label: option.label })),
    []
  );
  const planOptions = useMemo(
    () => plans.map(plan => ({ id: String(plan.id), label: plan.name })),
    [plans]
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Gift Card Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create or edit gift card batches without dropping back to the generic data explorer.
            </p>
          </div>
          <Button
            variant="primary"
           
            onPress={() => {
              setSelected(normalizeGiftCard());
              setOpen(true);
            }}
          >
            Add gift card
          </Button>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-4`}>
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <Table aria-label="Gift cards" className={adminTableClassNames.wrapper}>
                <Table.Content>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Type</TableColumn>
                    <TableColumn>Value</TableColumn>
                    <TableColumn>Code</TableColumn>
                    <TableColumn>Actions</TableColumn>
                  </TableHeader>
                  <TableBody items={records}>
                    {item => (
                      <TableRow key={String(item.id || Math.random())}>
                        <TableCell>{item.id ?? "—"}</TableCell>
                        <TableCell>{item.name || "Untitled"}</TableCell>
                        <TableCell>{GIFTCARD_TYPE_OPTIONS.find(option => option.value === Number(item.type))?.label || "Unknown"}</TableCell>
                        <TableCell>{item.value ?? "—"}</TableCell>
                        <TableCell>{item.code ? <Chip size="sm" variant="soft" className="bg-sky-50 text-sky-700">{item.code}</Chip> : "Auto"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => {
                                setSelected(normalizeGiftCard(item));
                                setOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onPress={() => void dropGiftCard(item)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table.Content>
              </Table>
              <div className="flex justify-end">
                <AdminPagination
                  page={page}
                  total={Math.max(1, Math.ceil(total / pageSize))}
                  onChange={nextPage => void loadGiftCards(nextPage)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{selected?.id ? "Edit gift card" : "Create gift card"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-5 md:grid-cols-2">
                <ModalField label="Name"><Input aria-label="Name" value={selected?.name || ""} onChange={event => setSelected(current => (current ? { ...current, name: event.target.value } : current))} /></ModalField>
                <ModalField label="Code"><Input aria-label="Code" value={selected?.code || ""} onChange={event => setSelected(current => (current ? { ...current, code: event.target.value, generate_count: undefined } : current))} /></ModalField>
                <ModalField label="Type">
                  <AdminSelectField
                    ariaLabel="Type"
                    options={typeOptions}
                    selectedKey={selectedType}
                    onSelectionChange={key => {
                      const nextType = Number(key || 1);
                      setSelected(current => (current ? { ...current, type: nextType, value: nextType === 4 ? 0 : current.value } : current));
                    }}
                  />
                </ModalField>
                <ModalField label="Value"><Input aria-label="Value" type="number" disabled={selected?.type === 4} value={String(selected?.type === 4 ? 0 : selected?.value ?? "")} onChange={event => setSelected(current => (current ? { ...current, value: event.target.value } : current))} /></ModalField>
                {selected?.type === 5 ? (
                  <ModalField label="Plan">
                    <AdminSelectField
                      ariaLabel="Plan"
                      options={planOptions}
                      selectedKey={selectedPlan}
                      onSelectionChange={key => { setSelected(current => (current ? { ...current, plan_id: String(key || "") } : current)); }}
                    />
                  </ModalField>
                ) : null}
                <ModalField label="Start Time"><Input aria-label="Start Time" type="datetime-local" value={toDatetimeInput(selected?.started_at)} onChange={event => setSelected(current => (current ? { ...current, started_at: fromDatetimeInput(event.target.value) } : current))} /></ModalField>
                <ModalField label="End Time"><Input aria-label="End Time" type="datetime-local" value={toDatetimeInput(selected?.ended_at)} onChange={event => setSelected(current => (current ? { ...current, ended_at: fromDatetimeInput(event.target.value) } : current))} /></ModalField>
                <ModalField label="Max Uses"><Input aria-label="Max Uses" type="number" value={String(selected?.limit_use ?? "")} onChange={event => setSelected(current => (current ? { ...current, limit_use: event.target.value } : current))} /></ModalField>
                {!selected?.id && !selected?.code ? (
                  <ModalField label="Generate Count"><Input aria-label="Generate Count" type="number" value={String(selected?.generate_count ?? "")} onChange={event => setSelected(current => (current ? { ...current, generate_count: event.target.value } : current))} /></ModalField>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" onPress={() => void saveGiftCard()} isDisabled={saving}>Save gift card</Button>
              </Modal.Footer>
        </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
