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
  TextArea,
  useOverlayState
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
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
  const modalState = useOverlayState({ isOpen: open, onOpenChange: setOpen });

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
        body: selected
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

  async function updateField(record: PlanRecord, key: string, value: unknown) {
    await adminRequest("plan/update", {
      method: "POST",
      body: { id: record.id, key, value }
    });
    await loadPlans();
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
  const selectedResetMethod = useMemo(() => {
    const matched = RESET_TRAFFIC_OPTIONS.find(option => option.value === (selected?.reset_traffic_method ?? null));
    return matched?.key || "null";
  }, [selected]);
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Plan Catalog</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create and maintain subscription plans without staying in the legacy table.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
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
              <Spinner color="primary" label="Loading plans" />
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
                <Table aria-label="Plans" classNames={adminTableClassNames}>
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
                      <TableColumn align="end">Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No plans found">
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
                            <Switch isSelected={Boolean(Number(item.show ?? 0))} onValueChange={value => void updateField(item, "show", value ? 1 : 0)} />
                          </TableCell>
                          <TableCell>
                            <Switch isSelected={Boolean(Number(item.renew ?? 0))} onValueChange={value => void updateField(item, "renew", value ? 1 : 0)} />
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
                                color="primary"
                                variant="light"
                                onPress={() => {
                                  setSelected(normalizePlan(item));
                                  setOpen(true);
                                }}
                                isDisabled={sorting}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => void dropPlan(item)}
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

      <Modal state={modalState}>
        <Modal.Backdrop>
          <Modal.Container size="5xl" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{selected?.id ? "Edit plan" : "Create plan"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-5 md:grid-cols-2">
                <Input
                  label="Plan Name"
                  labelPlacement="outside"
                  value={selected?.name || ""}
                  onValueChange={value => setSelected(current => (current ? { ...current, name: value } : current))}
                />
                <Input
                  label="Transfer (GB)"
                  labelPlacement="outside"
                  type="number"
                  value={String(selected?.transfer_enable ?? "")}
                  onValueChange={value => setSelected(current => (current ? { ...current, transfer_enable: value } : current))}
                />
                <TextArea
                  label="Description"
                  labelPlacement="outside"
                  minRows={6}
                  value={selected?.content || ""}
                  onValueChange={value => setSelected(current => (current ? { ...current, content: value } : current))}
                  className="md:col-span-2"
                />
                <Select
                  label="Permission Group"
                  labelPlacement="outside"
                  items={groups.map(group => ({ id: String(group.id), label: group.name }))}
                  selectedKey={selectedGroup}
                  onSelectionChange={key => {
                    setSelected(current => (current ? { ...current, group_id: String(key || "") } : current));
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={groupOptions}>
                      {item => (
                        <ListBoxItem id={item.id} textValue={item.label}>
                          {item.label}
                        </ListBoxItem>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Select
                  label="Traffic Reset"
                  labelPlacement="outside"
                  items={RESET_TRAFFIC_OPTIONS.map(option => ({ id: option.key, label: option.label }))}
                  selectedKey={selectedResetMethod}
                  onSelectionChange={key => {
                    const nextKey = String(key || "null");
                    const option = RESET_TRAFFIC_OPTIONS.find(item => item.key === nextKey);
                    setSelected(current => (current ? { ...current, reset_traffic_method: option?.value ?? null } : current));
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={RESET_METHOD_OPTIONS}>
                      {item => (
                        <ListBoxItem id={item.id} textValue={item.label}>
                          {item.label}
                        </ListBoxItem>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Input
                  label="Device Limit"
                  labelPlacement="outside"
                  type="number"
                  value={String(selected?.device_limit ?? "")}
                  onValueChange={value => setSelected(current => (current ? { ...current, device_limit: value } : current))}
                />
                <Input
                  label="Capacity Limit"
                  labelPlacement="outside"
                  type="number"
                  value={String(selected?.capacity_limit ?? "")}
                  onValueChange={value => setSelected(current => (current ? { ...current, capacity_limit: value } : current))}
                />
                <Input
                  label="Speed Limit (Mbps)"
                  labelPlacement="outside"
                  type="number"
                  value={String(selected?.speed_limit ?? "")}
                  onValueChange={value => setSelected(current => (current ? { ...current, speed_limit: value } : current))}
                />
                <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-900">Force Update Users</p>
                  <Switch
                    isSelected={Boolean(selected?.force_update)}
                    onValueChange={value => setSelected(current => (current ? { ...current, force_update: value } : current))}
                  >
                    Apply traffic, speed, and group changes to subscribed users
                  </Switch>
                </div>
                {PERIOD_OPTIONS.map(option => (
                  <Input
                    key={option.key}
                    label={`${option.label} (${currency})`}
                    labelPlacement="outside"
                    type="number"
                    value={String(selected?.[option.key] ?? "")}
                    onValueChange={value =>
                      setSelected(current => (current ? { ...current, [option.key]: value } : current))
                    }
                  />
                ))}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={modalState.close}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => void savePlan()} isLoading={saving}>
                  Save plan
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
