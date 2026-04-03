import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Label,
  Select,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  toast,
} from "@heroui/react";
import { PencilToLine, TrashBin } from "@gravity-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminTextField } from "../components/AdminTextField";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { AdminSelectField } from "../components/AdminSelectField";
import { SortableTableRow, adminTableActionCellClassName, sortableCollisionDetection, useSortableTableSensors } from "../components/SortableTable";
import { adminRequest } from "../lib/api";
import { PERIOD_OPTIONS, RESET_TRAFFIC_OPTIONS } from "../lib/admin-constants";
import { PageFrame } from "../components/PageFrame";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

interface ServerGroup {
  id: number;
  name: string;
}

interface SiteConfig {
  currency_symbol?: string;
}

interface PlanRecord {
  id?: number;
  show?: number | boolean;
  renew?: number | boolean;
  name?: string;
  content?: string | null;
  transfer_enable?: number | string | null;
  group_id?: number | string | null;
  device_limit?: number | string | null;
  reset_traffic_method?: number | null;
  capacity_limit?: number | string | null;
  speed_limit?: number | string | null;
  force_update?: boolean | number;
  month_price?: number | string | null;
  quarter_price?: number | string | null;
  half_year_price?: number | string | null;
  year_price?: number | string | null;
  two_year_price?: number | string | null;
  three_year_price?: number | string | null;
  onetime_price?: number | string | null;
  reset_price?: number | string | null;
}

function ModalField({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      {children}
    </div>
  );
}

function normalizePlan(record?: PlanRecord | null): PlanRecord {
  return {
    show: 1,
    renew: 1,
    force_update: false,
    ...record
  };
}

export function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortingId, setSortingId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [records, setRecords] = useState<PlanRecord[]>([]);
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [currency, setCurrency] = useState("¥");
  const [selected, setSelected] = useState<PlanRecord | null>(null);
  const [open, setOpen] = useState(false);
  const sortableSensors = useSortableTableSensors();

  async function loadPlans() {
    setLoading(true);
    setError(undefined);
    try {
      const [planResponse, groupsResponse, configResponse] = await Promise.all([
        adminRequest<PlanRecord[]>("plan/fetch"),
        adminRequest<ServerGroup[]>("server/group/fetch"),
        adminRequest<Record<string, SiteConfig>>("config/fetch", {
          query: { key: "site" }
        })
      ]);

      setRecords(planResponse.data || []);
      setGroups(groupsResponse.data || []);
      setCurrency(configResponse.data?.site?.currency_symbol || "¥");
    } catch (nextError) {
      setRecords([]);
      setGroups([]);
      setError(nextError instanceof Error ? nextError.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!selected) return;
    setSaving(true);
    try {
      await adminRequest("plan/save", {
        method: "POST",
        body: selected as Record<string, unknown>
      });
      setOpen(false);
      await loadPlans();
    } finally {
      setSaving(false);
    }
  }

  async function dropPlan(record: PlanRecord) {
    await adminRequest("plan/drop", {
      method: "POST",
      body: { id: record.id }
    });
    await loadPlans();
  }

  async function updateField(record: PlanRecord, key: "show" | "renew", value: unknown) {
    const previousValue = record[key];

    setRecords(current =>
      current.map(item =>
        item.id === record.id ? { ...item, [key]: value } : item
      )
    );

    try {
      await adminRequest("plan/update", {
        method: "POST",
        body: { id: record.id, [key]: value }
      });

      const fieldLabel = key === "show" ? "Enabled" : "Renew";
      toast.success(`Plan ${fieldLabel}: ${value ? "enabled" : "disabled"}`, {
        description: record.name || `Plan #${record.id || "unknown"}`
      });
    } catch (nextError) {
      setRecords(current =>
        current.map(item =>
          item.id === record.id ? { ...item, [key]: previousValue } : item
        )
      );
      toast.danger("Failed to update plan status", {
        description: nextError instanceof Error ? nextError.message : "Please try again."
      });
    }
  }

  async function reorderPlans(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= records.length) return;

    const nextRecords = [...records];
    const [current] = nextRecords.splice(fromIndex, 1);
    nextRecords.splice(toIndex, 0, current);

    setRecords(nextRecords);
    setSortingId(Number(current.id || 0));
    setError(undefined);

    try {
      await adminRequest("plan/sort", {
        method: "POST",
        body: {
          plan_ids: nextRecords.map(item => item.id).filter(Boolean)
        }
      });
      await loadPlans();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to sort plans");
      await loadPlans();
    } finally {
      setSortingId(null);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || sortingId !== null) return;

    const fromIndex = records.findIndex(record => String(record.id) === String(active.id));
    const toIndex = records.findIndex(record => String(record.id) === String(over.id));
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    void reorderPlans(fromIndex, toIndex);
  }

  const selectedGroup = useMemo(() => (selected?.group_id ? String(selected.group_id) : null), [selected]);
  const groupOptions = useMemo(
    () => groups.map(group => ({ id: String(group.id), label: group.name })),
    [groups]
  );
  const resetMethodOptions = useMemo(
    () => RESET_TRAFFIC_OPTIONS.map(option => ({ id: option.key, label: option.label })),
    []
  );
  const selectedResetMethod = useMemo(() => {
    const matched = RESET_TRAFFIC_OPTIONS.find(option => option.value === (selected?.reset_traffic_method ?? null));
    return matched?.key || "null";
  }, [selected]);
  const planNameInvalid = !String(selected?.name || "").trim();
  const stats = useMemo(() => {
    const enabled = records.filter(record => Boolean(Number(record.show ?? 0))).length;
    const renewable = records.filter(record => Boolean(Number(record.renew ?? 0))).length;
    const monthlyAverage =
      records.length > 0
        ? records.reduce((sum, record) => sum + Number(record.month_price || 0), 0) / records.length
        : 0;

    return [
      { label: "Total plans", value: String(records.length), hint: "Subscription packages configured" },
      { label: "Visible", value: String(enabled), hint: "Shown to customers" },
      { label: "Renewable", value: String(renewable), hint: "Supports renewal actions" },
      { label: "Avg monthly", value: `${currency}${monthlyAverage.toFixed(2)}`, hint: "Average monthly list price" }
    ];
  }, [currency, records]);

  return (
    <PageFrame
      title="Plans"
      description="The plan page now uses a dedicated HeroUI table and modal editor. The current backend actions for save, toggle, renew, and drop remain unchanged."
      onRefresh={() => void loadPlans()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Plan Catalog</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create and maintain subscription plans without staying in the legacy table.
            </p>
          </div>
          <Button
            variant="primary"
           
            onPress={() => {
              setSelected(normalizePlan());
              setOpen(true);
            }}
          >
            Add plan
          </Button>
        </CardHeader>
        <CardContent className={adminSectionBodyClassName}>
          {error ? <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <DndContext
              sensors={sortableSensors}
              collisionDetection={sortableCollisionDetection}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={records.map(record => String(record.id))}
                strategy={verticalListSortingStrategy}
              >
                <Table aria-label="Plans" className={adminTableClassNames.wrapper}>
                  <Table.Content>
                    <TableHeader>
                      <TableColumn>Sort</TableColumn>
                      <TableColumn>Enabled</TableColumn>
                      <TableColumn>Renew</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Transfer</TableColumn>
                      <TableColumn>Group</TableColumn>
                      <TableColumn>Monthly</TableColumn>
                      <TableColumn>One Time</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                    {records.map(item => {
                      const sorting = sortingId === Number(item.id || 0);

                      return (
                        <SortableTableRow
                          key={String(item.id)}
                          id={String(item.id)}
                          dragLabel={`Reorder plan ${item.name || item.id || ""}`}
                          isDisabled={sortingId !== null}
                        >
                          <TableCell>
                            <Checkbox
                              aria-label={`Enable plan ${item.name || item.id || ""}`}
                              isSelected={Boolean(Number(item.show ?? 0))}
                              onChange={value => void updateField(item, "show", value ? 1 : 0)}
                            >
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              aria-label={`Renew plan ${item.name || item.id || ""}`}
                              isSelected={Boolean(Number(item.renew ?? 0))}
                              onChange={value => void updateField(item, "renew", value ? 1 : 0)}
                            >
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox>
                          </TableCell>
                          <TableCell>{item.name || "Untitled"}</TableCell>
                          <TableCell>{item.transfer_enable ? `${item.transfer_enable} GB` : "—"}</TableCell>
                          <TableCell>{groups.find(group => String(group.id) === String(item.group_id))?.name || "System"}</TableCell>
                          <TableCell>{item.month_price ?? "—"}</TableCell>
                          <TableCell>{item.onetime_price ?? "—"}</TableCell>
                          <TableCell className={adminTableActionCellClassName}>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                isIconOnly
                                aria-label={`Edit plan ${item.name || item.id || ""}`}
                                onPress={() => {
                                  setSelected(normalizePlan(item));
                                  setOpen(true);
                                }}
                                isDisabled={sorting}
                              >
                                <PencilToLine width={16} height={16} aria-hidden="true" />
                              </Button>
                              <DangerConfirmButton
                                size="sm"
                                isDisabled={sorting}
                                isIconOnly
                                aria-label={`Delete plan ${item.name || item.id || ""}`}
                                title={`Delete plan ${item.name || item.id || ""}?`}
                                description="This will permanently delete the plan."
                                confirmLabel="Delete plan"
                                onConfirm={() => void dropPlan(item)}
                              >
                                <TrashBin width={16} height={16} aria-hidden="true" />
                              </DangerConfirmButton>
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

      <AdminDrawer
        isOpen={open}
        onOpenChange={setOpen}
        title={selected?.id ? "Edit plan" : "Create plan"}
        isBusy={saving}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => void savePlan()} isDisabled={saving || planNameInvalid}>
              Save plan
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (planNameInvalid) return;
            void savePlan();
          }}
        >
          <div className="space-y-4">
            <AdminTextField
              label="Plan Name"
              value={selected?.name || ""}
              onChange={event => setSelected(current => (current ? { ...current, name: event.target.value } : current))}
              isRequired
              isInvalid={planNameInvalid}
              errorMessage="Plan name is required."
            />
            <AdminTextField
              label="Transfer (GB)"
              type="number"
              value={String(selected?.transfer_enable ?? "")}
              onChange={event => setSelected(current => (current ? { ...current, transfer_enable: event.target.value } : current))}
            />
            <AdminTextField
              label="Description"
              multiline
              rows={6}
              value={selected?.content || ""}
              onChange={event => setSelected(current => (current ? { ...current, content: event.target.value } : current))}
            />
          </div>
          <ModalField label="Permission Group">
            <AdminSelectField
              ariaLabel="Permission Group"
              options={groupOptions}
              selectedKey={selectedGroup}
              onSelectionChange={key => {
                setSelected(current => (current ? { ...current, group_id: String(key || "") } : current));
              }}
            />
          </ModalField>
          <ModalField label="Traffic Reset">
            <AdminSelectField
              ariaLabel="Traffic Reset"
              options={resetMethodOptions}
              selectedKey={selectedResetMethod}
              onSelectionChange={key => {
                const nextKey = String(key || "null");
                const option = RESET_TRAFFIC_OPTIONS.find(item => item.key === nextKey);
                setSelected(current => (current ? { ...current, reset_traffic_method: option?.value ?? null } : current));
              }}
            />
          </ModalField>
          <div className="space-y-4">
            <AdminTextField
              label="Device Limit"
              type="number"
              value={String(selected?.device_limit ?? "")}
              onChange={event => setSelected(current => (current ? { ...current, device_limit: event.target.value } : current))}
            />
            <AdminTextField
              label="Capacity Limit"
              type="number"
              value={String(selected?.capacity_limit ?? "")}
              onChange={event => setSelected(current => (current ? { ...current, capacity_limit: event.target.value } : current))}
            />
            <AdminTextField
              label="Speed Limit (Mbps)"
              type="number"
              value={String(selected?.speed_limit ?? "")}
              onChange={event => setSelected(current => (current ? { ...current, speed_limit: event.target.value } : current))}
            />
          </div>
          <div className="space-y-2 rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm font-medium text-slate-900">Force Update Users</Label>
              <Switch
                aria-label="Force Update Users"
                size="sm"
                isSelected={Boolean(selected?.force_update)}
                onChange={(value: boolean) => setSelected(current => (current ? { ...current, force_update: value } : current))}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
            <p className="text-sm text-slate-500">Apply traffic, speed, and group changes to subscribed users</p>
          </div>
          {PERIOD_OPTIONS.map(option => (
            <AdminTextField
              key={option.key}
              label={`${option.label} (${currency})`}
              type="number"
              value={String(selected?.[option.key] ?? "")}
              onChange={event => setSelected(current => (current ? { ...current, [option.key]: event.target.value } : current))}
            />
          ))}
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
