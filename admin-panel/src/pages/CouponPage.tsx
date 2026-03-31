import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  ListBox,
  ListBoxItem,
  Modal,
  Pagination,
  Select,
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
import { adminRequest } from "../lib/api";
import { COUPON_TYPE_OPTIONS, PERIOD_OPTIONS, fromDatetimeInput, toDatetimeInput } from "../lib/admin-constants";
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

  useEffect(() => {
    void loadCoupons(1);
  }, []);

  const selectedType = useMemo(() => (selected?.type ? String(selected.type) : "1"), [selected]);
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Coupon Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              List, create, edit, toggle, and delete coupons directly in the new shell.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
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
              <Spinner color="primary" label="Loading coupons" />
            </div>
          ) : (
            <>
              <Table aria-label="Coupons" classNames={adminTableClassNames}>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>Enabled</TableColumn>
                  <TableColumn>Name</TableColumn>
                  <TableColumn>Type</TableColumn>
                  <TableColumn>Code</TableColumn>
                  <TableColumn>Limit</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody items={records} emptyContent="No coupons found">
                  {item => (
                    <TableRow key={String(item.id || Math.random())}>
                      <TableCell>{item.id ?? "—"}</TableCell>
                      <TableCell>
                        <Switch
                          isSelected={Boolean(Number(item.show ?? 0))}
                          onValueChange={() => void toggleCoupon(item)}
                        />
                      </TableCell>
                      <TableCell>{item.name || "Untitled"}</TableCell>
                      <TableCell>{item.type === 2 ? "Percentage" : "Amount"}</TableCell>
                      <TableCell>
                        {item.code ? <Chip size="sm" variant="flat" className="bg-sky-50 text-sky-700">{item.code}</Chip> : "Auto"}
                      </TableCell>
                      <TableCell>{item.limit_use ?? "Unlimited"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            color="primary"
                            variant="light"
                            onPress={() => {
                              setSelected(normalizeCoupon(item));
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" color="danger" variant="light" onPress={() => void dropCoupon(item)}>
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
                  onChange={nextPage => void loadCoupons(nextPage)}
                  showControls
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)}>
        <Modal.Backdrop>
          <Modal.Container size="5xl" scroll="inside">
            <Modal.Dialog>
          <Modal.Header>
              <Modal.Heading>{selected?.id ? "Edit coupon" : "Create coupon"}</Modal.Heading>
            </Modal.Header>
          <Modal.Body className="grid gap-5 md:grid-cols-2">
            <Input label="Name" labelPlacement="outside" value={selected?.name || ""} onValueChange={value => setSelected(current => (current ? { ...current, name: value } : current))} />
            <Input label="Code" labelPlacement="outside" value={selected?.code || ""} onValueChange={value => setSelected(current => (current ? { ...current, code: value, generate_count: undefined } : current))} />
            <Select
              label="Discount Type"
              labelPlacement="outside"
              items={COUPON_TYPE_OPTIONS.map(option => ({ id: option.key, label: option.label }))}
              selectedKey={selectedType}
              onSelectionChange={key => {
                const nextType = Number(key || 1);
                setSelected(current => (current ? { ...current, type: nextType } : current));
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={COUPON_TYPE_OPTIONS}>
                  {item => (
                    <ListBoxItem id={item.id} textValue={item.label}>
                      {item.label}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <Input
              label="Discount Value"
              labelPlacement="outside"
              type="number"
              value={String(selected?.value ?? "")}
              description={selected?.type === 2 ? "%" : "Amount"}
              onValueChange={value => setSelected(current => (current ? { ...current, value } : current))}
            />
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
            <Input label="Uses Per User" labelPlacement="outside" type="number" value={String(selected?.limit_use_with_user ?? "")} onValueChange={value => setSelected(current => (current ? { ...current, limit_use_with_user: value } : current))} />
            <Select
              label="Allowed Plans"
              labelPlacement="outside"
              items={plans.map(plan => ({ id: String(plan.id), label: plan.name }))}
              selectionMode="multiple"
              selectedKeys={selectedPlanIds}
              onSelectionChange={keys => {
                setSelected(current =>
                  current
                    ? {
                        ...current,
                        limit_plan_ids: Array.from(keys).map(item => String(item))
                      }
                    : current
                );
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={planOptions}>
                  {item => (
                    <ListBoxItem id={item.id} textValue={item.label}>
                      {item.label}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              label="Allowed Periods"
              labelPlacement="outside"
              items={PERIOD_OPTIONS.map(option => ({ id: option.key, label: option.label }))}
              selectionMode="multiple"
              selectedKeys={selectedPeriods}
              onSelectionChange={keys =>
                setSelected(current =>
                  current
                    ? {
                        ...current,
                        limit_period: Array.from(keys).map(item => String(item))
                      }
                    : current
                )
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={PERIOD_OPTIONS}>
                  {item => (
                    <ListBoxItem id={item.id} textValue={item.label}>
                      {item.label}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            {!selected?.id && !selected?.code ? (
              <Input
                label="Generate Count"
                labelPlacement="outside"
                type="number"
                value={String(selected?.generate_count ?? "")}
                onValueChange={value => setSelected(current => (current ? { ...current, generate_count: value } : current))}
              />
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveCoupon()} isLoading={saving}>
              Save coupon
            </Button>
          </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
