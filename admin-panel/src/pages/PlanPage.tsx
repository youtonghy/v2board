import {
  Button,
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
  TableRow,
  Textarea
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../lib/api";
import { PERIOD_OPTIONS, RESET_TRAFFIC_OPTIONS } from "../lib/admin-constants";
import { PageFrame } from "../components/PageFrame";
import { adminTableClassNames, SectionCard, StatGrid } from "../components/AdminContent";

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

  const selectedGroup = useMemo(
    () => (selected?.group_id ? new Set([String(selected.group_id)]) : new Set<string>()),
    [selected]
  );
  const selectedResetMethod = useMemo(() => {
    const matched = RESET_TRAFFIC_OPTIONS.find(option => option.value === (selected?.reset_traffic_method ?? null));
    return matched ? new Set([matched.key]) : new Set(["null"]);
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
      legacyPath="/plan"
      onRefresh={() => void loadPlans()}
      loading={loading}
    >
      <StatGrid items={stats} />

      <SectionCard
        title="Plan Catalog"
        description="Create and maintain subscription plans without staying in the legacy table."
        action={
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
        }
      >
          {error ? <div className="mb-4 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner color="primary" label="Loading plans" />
            </div>
          ) : (
            <Table aria-label="Plans" classNames={adminTableClassNames}>
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
              <TableBody items={records} emptyContent="No plans found">
                {(item) => {
                  const index = records.findIndex(record => record.id === item.id);
                  const sorting = sortingId === Number(item.id || 0);

                  return (
                  <TableRow key={String(item.id || Math.random())}>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          color="default"
                          variant="light"
                          isDisabled={sorting || index <= 0}
                          onPress={() => void reorderPlans(index, index - 1)}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          color="default"
                          variant="light"
                          isDisabled={sorting || index === -1 || index >= records.length - 1}
                          onPress={() => void reorderPlans(index, index + 1)}
                        >
                          Down
                        </Button>
                      </div>
                    </TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          color="primary"
                          variant="light"
                          onPress={() => {
                            setSelected(normalizePlan(item));
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" color="danger" variant="light" onPress={() => void dropPlan(item)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}}
              </TableBody>
            </Table>
          )}
      </SectionCard>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected?.id ? "Edit plan" : "Create plan"}</ModalHeader>
          <ModalBody className="grid gap-5 md:grid-cols-2">
            <Input label="Plan Name" labelPlacement="outside" value={selected?.name || ""} onValueChange={value => setSelected(current => (current ? { ...current, name: value } : current))} />
            <Input label="Transfer (GB)" labelPlacement="outside" type="number" value={String(selected?.transfer_enable ?? "")} onValueChange={value => setSelected(current => (current ? { ...current, transfer_enable: value } : current))} />
            <Textarea label="Description" labelPlacement="outside" minRows={6} value={selected?.content || ""} onValueChange={value => setSelected(current => (current ? { ...current, content: value } : current))} className="md:col-span-2" />
            <Select
              label="Permission Group"
              labelPlacement="outside"
              selectedKeys={selectedGroup}
              onSelectionChange={keys => {
                const nextGroup = Array.from(keys)[0];
                setSelected(current => (current ? { ...current, group_id: String(nextGroup || "") } : current));
              }}
            >
              {groups.map(group => (
                <SelectItem key={String(group.id)}>{group.name}</SelectItem>
              ))}
            </Select>
            <Select
              label="Traffic Reset"
              labelPlacement="outside"
              selectedKeys={selectedResetMethod}
              onSelectionChange={keys => {
                const nextKey = String(Array.from(keys)[0] || "null");
                const option = RESET_TRAFFIC_OPTIONS.find(item => item.key === nextKey);
                setSelected(current => (current ? { ...current, reset_traffic_method: option?.value ?? null } : current));
              }}
            >
              {RESET_TRAFFIC_OPTIONS.map(option => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
            <Input label="Device Limit" labelPlacement="outside" type="number" value={String(selected?.device_limit ?? "")} onValueChange={value => setSelected(current => (current ? { ...current, device_limit: value } : current))} />
            <Input label="Capacity Limit" labelPlacement="outside" type="number" value={String(selected?.capacity_limit ?? "")} onValueChange={value => setSelected(current => (current ? { ...current, capacity_limit: value } : current))} />
            <Input label="Speed Limit (Mbps)" labelPlacement="outside" type="number" value={String(selected?.speed_limit ?? "")} onValueChange={value => setSelected(current => (current ? { ...current, speed_limit: value } : current))} />
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
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void savePlan()} isLoading={saving}>
              Save plan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
