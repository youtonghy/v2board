import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  toast,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { AdminDatePickerField } from "../components/AdminDatePickerField";
import { AdminDrawer } from "../components/AdminDrawer";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSelectField } from "../components/AdminSelectField";
import { AdminTextField } from "../components/AdminTextField";
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

  async function copyGiftCardCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Gift card code copied", {
        description: code,
      });
    } catch {
      toast.danger("Failed to copy code", {
        description: "Please copy it manually.",
      });
    }
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
  const giftNameInvalid = !String(selected?.name || "").trim();
  const giftCodeInvalid = selected?.id ? !String(selected?.code || "").trim() : false;
  const giftValueInvalid = Number(selected?.type) !== 4 && String(selected?.value ?? "").trim() === "";
  const giftPlanInvalid = Number(selected?.type) === 5 && !String(selected?.plan_id || "").trim();
  const giftGenerateInvalid = !selected?.id && !String(selected?.code || "").trim() && !String(selected?.generate_count ?? "").trim();
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
              <Table variant="secondary" aria-label="Gift cards" className={adminTableClassNames.wrapper}>
                <Table.ScrollContainer>
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
                      <TableRow key={String(item.id ?? item.code ?? item.name ?? "")}>
                        <TableCell>{item.id ?? "—"}</TableCell>
                        <TableCell>{item.name || "Untitled"}</TableCell>
                        <TableCell>{GIFTCARD_TYPE_OPTIONS.find(option => option.value === Number(item.type))?.label || "Unknown"}</TableCell>
                        <TableCell>{item.value ?? "—"}</TableCell>
                        <TableCell>
                          {item.code ? (
                            <button
                              type="button"
                              className="inline-flex rounded-full outline-none transition-transform duration-150 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                              onClick={() => void copyGiftCardCode(item.code || "")}
                              title="Click to copy code"
                            >
                              <Chip size="sm" variant="soft" className="cursor-pointer bg-sky-50 text-sky-700">
                                {item.code}
                              </Chip>
                            </button>
                          ) : (
                            "Auto"
                          )}
                        </TableCell>
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
                            <DangerConfirmButton
                              size="sm"
                              title={`Delete gift card ${item.name || item.code || item.id || ""}?`}
                              description="This will permanently remove the gift card."
                              confirmLabel="Delete gift card"
                              onConfirm={() => void dropGiftCard(item)}
                            >
                              Delete
                            </DangerConfirmButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table.Content>
                </Table.ScrollContainer>
              </Table>
              <div className="flex justify-end">
                <AdminPagination
                  page={page}
                  total={Math.max(1, Math.ceil(total / pageSize))}
                  totalItems={total}
                  itemsPerPage={pageSize}
                  onChange={nextPage => void loadGiftCards(nextPage)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminDrawer
        isOpen={open}
        onOpenChange={isOpen => !isOpen && setOpen(false)}
        title={selected?.id ? "Edit gift card" : "Create gift card"}
        isBusy={saving}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onPress={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onPress={() => void saveGiftCard()} isDisabled={saving || giftNameInvalid || giftCodeInvalid || giftValueInvalid || giftPlanInvalid || giftGenerateInvalid}>Save gift card</Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (giftNameInvalid || giftCodeInvalid || giftValueInvalid || giftPlanInvalid || giftGenerateInvalid) return;
            void saveGiftCard();
          }}
        >
          <AdminTextField label="Name" value={selected?.name || ""} onChange={event => setSelected(current => (current ? { ...current, name: event.target.value } : current))} isRequired isInvalid={giftNameInvalid} errorMessage="Name is required." />
          <AdminTextField label="Code" value={selected?.code || ""} onChange={event => setSelected(current => (current ? { ...current, code: event.target.value, generate_count: undefined } : current))} isRequired={Boolean(selected?.id)} isInvalid={giftCodeInvalid} errorMessage="Code is required for existing gift cards." />
          <ModalField label="Type" required>
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
          <AdminTextField label="Value" type="number" value={String(selected?.type === 4 ? 0 : selected?.value ?? "")} onChange={event => setSelected(current => (current ? { ...current, value: event.target.value } : current))} isDisabled={selected?.type === 4} isRequired={Number(selected?.type) !== 4} isInvalid={giftValueInvalid} errorMessage="Value is required." />
          {selected?.type === 5 ? (
            <ModalField label="Plan" required>
              <AdminSelectField
                ariaLabel="Plan"
                options={planOptions}
                selectedKey={selectedPlan}
                onSelectionChange={key => { setSelected(current => (current ? { ...current, plan_id: String(key || "") } : current)); }}
              />
            </ModalField>
          ) : null}
          <AdminDatePickerField label="Start Time" value={selected?.started_at} onChange={nextValue => setSelected(current => (current ? { ...current, started_at: nextValue } : current))} />
          <AdminDatePickerField label="End Time" value={selected?.ended_at} onChange={nextValue => setSelected(current => (current ? { ...current, ended_at: nextValue } : current))} />
          <AdminTextField label="Max Uses" type="number" value={String(selected?.limit_use ?? "")} onChange={event => setSelected(current => (current ? { ...current, limit_use: event.target.value } : current))} />
          {!selected?.id && !selected?.code ? (
            <AdminTextField label="Generate Count" type="number" value={String(selected?.generate_count ?? "")} onChange={event => setSelected(current => (current ? { ...current, generate_count: event.target.value } : current))} isRequired={!String(selected?.code || "").trim()} isInvalid={giftGenerateInvalid} errorMessage="Enter a code or generate count." />
          ) : null}
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
