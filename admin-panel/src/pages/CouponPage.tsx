import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Modal,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  toast,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { AdminMultiSelectField } from "../components/AdminMultiSelectField";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSelectField } from "../components/AdminSelectField";
import { adminRequest } from "../lib/api";
import { COUPON_TYPE_OPTIONS, PERIOD_OPTIONS, fromDatetimeInput, toDatetimeInput } from "../lib/admin-constants";
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

interface CouponRecord {
  id?: number;
  name?: string;
  code?: string;
  type?: number;
  value?: number | string | null;
  show?: number | boolean;
  limit_use?: number | string | null;
  limit_use_with_user?: number | string | null;
  started_at?: number | null;
  ended_at?: number | null;
  limit_plan_ids?: Array<string | number> | null;
  limit_period?: string[] | null;
  generate_count?: number | string | null;
}

function normalizeCoupon(record?: CouponRecord | null): CouponRecord {
  return {
    type: 1,
    limit_plan_ids: [],
    limit_period: [],
    ...record
  };
}

export function CouponPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<CouponRecord[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState<CouponRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  async function loadCoupons(nextPage = page) {
    setLoading(true);
    const [couponResponse, planResponse] = await Promise.all([
      adminRequest<CouponRecord[]>("coupon/fetch", {
        query: { current: nextPage, pageSize }
      }),
      adminRequest<PlanOption[]>("plan/fetch")
    ]);

    setRecords(couponResponse.data || []);
    setTotal(Number(couponResponse.total || (couponResponse.data || []).length));
    setPlans(planResponse.data || []);
    setPage(nextPage);
    setLoading(false);
  }

  async function saveCoupon() {
    if (!selected) return;
    setSaving(true);
    try {
      await adminRequest("coupon/generate", {
        method: "POST",
        body: {
          ...selected,
          limit_plan_ids: selected.limit_plan_ids?.length ? selected.limit_plan_ids : null,
          limit_period: selected.limit_period?.length ? selected.limit_period : null
        }
      });
      setOpen(false);
      await loadCoupons(page);
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(record: CouponRecord) {
    await adminRequest("coupon/show", {
      method: "POST",
      body: { id: record.id }
    });
    await loadCoupons(page);
  }

  async function dropCoupon(record: CouponRecord) {
    await adminRequest("coupon/drop", {
      method: "POST",
      body: { id: record.id }
    });
    await loadCoupons(page);
  }

  async function copyCouponCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Coupon code copied", {
        description: code,
      });
    } catch {
      toast.danger("Failed to copy code", {
        description: "Please copy it manually.",
      });
    }
  }

  useEffect(() => {
    void loadCoupons(1);
  }, []);

  const selectedType = useMemo(() => (selected?.type ? String(selected.type) : "1"), [selected]);
  const typeOptions = useMemo(
    () => COUPON_TYPE_OPTIONS.map(option => ({ id: option.key, label: option.label })),
    []
  );
  const planOptions = useMemo(
    () => plans.map(plan => ({ id: String(plan.id), label: plan.name })),
    [plans]
  );
  const periodOptions = useMemo(
    () => PERIOD_OPTIONS.map(option => ({ id: option.key, label: option.label })),
    []
  );
  const selectedPlanIds = useMemo(
    () => new Set((selected?.limit_plan_ids || []).map(item => String(item))),
    [selected]
  );
  const selectedPeriods = useMemo(
    () => new Set(selected?.limit_period || []),
    [selected]
  );
  const stats = useMemo(() => {
    const enabled = records.filter(record => Boolean(Number(record.show ?? 0))).length;
    const amountCoupons = records.filter(record => Number(record.type) === 1).length;
    const percentageCoupons = records.filter(record => Number(record.type) === 2).length;

    return [
      { label: "Current page", value: String(records.length), hint: `Page ${page} inventory` },
      { label: "Enabled", value: String(enabled), hint: "Available for redemption" },
      { label: "Amount based", value: String(amountCoupons), hint: "Fixed discount coupons" },
      { label: "Percentage", value: String(percentageCoupons), hint: "Rate based coupons" }
    ];
  }, [page, records]);

  return (
    <PageFrame
      title="Coupons"
      description="Coupons now have a dedicated HeroUI list, pagination, toggle, and modal editor. The backend still receives the exact same payload shape as the legacy page."
      onRefresh={() => void loadCoupons(page)}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Coupon Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              List, create, edit, toggle, and delete coupons directly in the new shell.
            </p>
          </div>
          <Button
            variant="primary"
           
            onPress={() => {
              setSelected(normalizeCoupon());
              setOpen(true);
            }}
          >
            Add coupon
          </Button>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-4`}>
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <Table aria-label="Coupons" className={adminTableClassNames.wrapper}>
                <Table.Content>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>Enabled</TableColumn>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Type</TableColumn>
                    <TableColumn>Code</TableColumn>
                    <TableColumn>Limit</TableColumn>
                    <TableColumn>Actions</TableColumn>
                  </TableHeader>
                  <TableBody items={records}>
                    {item => (
                      <TableRow key={String(item.id || Math.random())}>
                        <TableCell>{item.id ?? "—"}</TableCell>
                        <TableCell>
                          <Switch
                            isSelected={Boolean(Number(item.show ?? 0))}
                            onChange={() => void toggleCoupon(item)}
                          />
                        </TableCell>
                        <TableCell>{item.name || "Untitled"}</TableCell>
                        <TableCell>{item.type === 2 ? "Percentage" : "Amount"}</TableCell>
                        <TableCell>
                          {item.code ? (
                            <button
                              type="button"
                              aria-label={`Copy coupon code ${item.code}`}
                              title="Click to copy code"
                              className="inline-flex rounded-full outline-none transition-transform duration-150 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                              onClick={() => void copyCouponCode(item.code || "")}
                            >
                              <Chip size="sm" variant="soft" className="cursor-pointer bg-sky-50 text-sky-700">
                                {item.code}
                              </Chip>
                            </button>
                          ) : (
                            "Auto"
                          )}
                        </TableCell>
                        <TableCell>{item.limit_use ?? "Unlimited"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => {
                                setSelected(normalizeCoupon(item));
                                setOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <DangerConfirmButton
                              size="sm"
                              title={`Delete coupon ${item.name || item.code || item.id || ""}?`}
                              description="This will permanently remove the coupon."
                              confirmLabel="Delete coupon"
                              onConfirm={() => void dropCoupon(item)}
                            >
                              Delete
                            </DangerConfirmButton>
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
                  totalItems={total}
                  itemsPerPage={pageSize}
                  onChange={nextPage => void loadCoupons(nextPage)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{selected?.id ? "Edit coupon" : "Create coupon"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-5 md:grid-cols-2">
                <ModalField label="Name">
                  <Input aria-label="Name" value={selected?.name || ""} onChange={event => setSelected(current => (current ? { ...current, name: event.target.value } : current))} />
                </ModalField>
                <ModalField label="Code">
                  <Input aria-label="Code" value={selected?.code || ""} onChange={event => setSelected(current => (current ? { ...current, code: event.target.value, generate_count: undefined } : current))} />
                </ModalField>
                <ModalField label="Discount Type">
                  <AdminSelectField
                    ariaLabel="Discount Type"
                    options={typeOptions}
                    selectedKey={selectedType}
                    onSelectionChange={key => {
                      const nextType = Number(key || 1);
                      setSelected(current => (current ? { ...current, type: nextType } : current));
                    }}
                  />
                </ModalField>
                <ModalField label="Discount Value" description={selected?.type === 2 ? "%" : "Amount"}>
                  <Input aria-label="Discount Value" type="number" value={String(selected?.value ?? "")} onChange={event => setSelected(current => (current ? { ...current, value: event.target.value } : current))} />
                </ModalField>
                <ModalField label="Start Time">
                  <Input aria-label="Start Time" type="datetime-local" value={toDatetimeInput(selected?.started_at)} onChange={event => setSelected(current => (current ? { ...current, started_at: fromDatetimeInput(event.target.value) } : current))} />
                </ModalField>
                <ModalField label="End Time">
                  <Input aria-label="End Time" type="datetime-local" value={toDatetimeInput(selected?.ended_at)} onChange={event => setSelected(current => (current ? { ...current, ended_at: fromDatetimeInput(event.target.value) } : current))} />
                </ModalField>
                <ModalField label="Max Uses">
                  <Input aria-label="Max Uses" type="number" value={String(selected?.limit_use ?? "")} onChange={event => setSelected(current => (current ? { ...current, limit_use: event.target.value } : current))} />
                </ModalField>
                <ModalField label="Uses Per User">
                  <Input aria-label="Uses Per User" type="number" value={String(selected?.limit_use_with_user ?? "")} onChange={event => setSelected(current => (current ? { ...current, limit_use_with_user: event.target.value } : current))} />
                </ModalField>
                <ModalField label="Allowed Plans">
                  <AdminMultiSelectField
                    ariaLabel="Allowed Plans"
                    options={planOptions}
                    selectedKeys={selectedPlanIds}
                    onSelectionChange={keys => {
                      setSelected(current => current ? {
                        ...current,
                        limit_plan_ids: keys === "all" ? planOptions.map(item => item.id) : Array.from(keys).map(item => String(item))
                      } : current);
                    }}
                  />
                </ModalField>
                <ModalField label="Allowed Periods">
                  <AdminMultiSelectField
                    ariaLabel="Allowed Periods"
                    options={periodOptions}
                    selectedKeys={selectedPeriods}
                    onSelectionChange={keys => setSelected(current => current ? {
                      ...current,
                      limit_period: keys === "all" ? periodOptions.map(item => item.id) : Array.from(keys).map(item => String(item))
                    } : current)}
                  />
                </ModalField>
                {!selected?.id && !selected?.code ? (
                  <ModalField label="Generate Count">
                    <Input aria-label="Generate Count" type="number" value={String(selected?.generate_count ?? "")} onChange={event => setSelected(current => (current ? { ...current, generate_count: event.target.value } : current))} />
                  </ModalField>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" onPress={() => void saveCoupon()} isDisabled={saving}>Save coupon</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
