import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Modal,
  Spinner,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  useOverlayState
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  SortableTableRow,
  adminTableActionCellClassName,
  sortableCollisionDetection,
  useSortableTableSensors
} from "../components/SortableTable";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { ObjectRecordEditor } from "../components/ObjectRecordEditor";
import { asArray, formatDateTime } from "../lib/admin-format";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

type ServerProtocol = "shadowsocks" | "vmess" | "vless" | "trojan" | "tuic" | "hysteria" | "anytls" | "v2node";

interface ServerRecord extends Record<string, unknown> {
  id: number;
  type: ServerProtocol;
  name?: string;
  host?: string;
  group_id?: number[] | string[];
  route_id?: number[] | string[] | null;
  show?: number;
  online?: number;
  rate?: number | string;
  last_check_at?: number;
  last_push_at?: number;
}

const PROTOCOLS: Array<{ key: ServerProtocol; label: string }> = [
  { key: "shadowsocks", label: "Shadowsocks" },
  { key: "vmess", label: "VMess" },
  { key: "vless", label: "VLESS" },
  { key: "trojan", label: "Trojan" },
  { key: "tuic", label: "TUIC" },
  { key: "hysteria", label: "Hysteria" },
  { key: "anytls", label: "AnyTLS" },
  { key: "v2node", label: "V2Node" }
];

const SAVE_ENDPOINTS: Record<ServerProtocol, string> = {
  shadowsocks: "server/shadowsocks/save",
  vmess: "server/vmess/save",
  vless: "server/vless/save",
  trojan: "server/trojan/save",
  tuic: "server/tuic/save",
  hysteria: "server/hysteria/save",
  anytls: "server/anytls/save",
  v2node: "server/v2node/save"
};

const UPDATE_ENDPOINTS: Record<ServerProtocol, string> = {
  shadowsocks: "server/shadowsocks/update",
  vmess: "server/vmess/update",
  vless: "server/vless/update",
  trojan: "server/trojan/update",
  tuic: "server/tuic/update",
  hysteria: "server/hysteria/update",
  anytls: "server/anytls/update",
  v2node: "server/v2node/update"
};

const DROP_ENDPOINTS: Record<ServerProtocol, string> = {
  shadowsocks: "server/shadowsocks/drop",
  vmess: "server/vmess/drop",
  vless: "server/vless/drop",
  trojan: "server/trojan/drop",
  tuic: "server/tuic/drop",
  hysteria: "server/hysteria/drop",
  anytls: "server/anytls/drop",
  v2node: "server/v2node/drop"
};

const COPY_ENDPOINTS: Record<ServerProtocol, string> = {
  shadowsocks: "server/shadowsocks/copy",
  vmess: "server/vmess/copy",
  vless: "server/vless/copy",
  trojan: "server/trojan/copy",
  tuic: "server/tuic/copy",
  hysteria: "server/hysteria/copy",
  anytls: "server/anytls/copy",
  v2node: "server/v2node/copy"
};

function defaultServer(protocol: ServerProtocol): ServerRecord {
  const base: ServerRecord = {
    id: 0,
    type: protocol,
    name: "",
    show: 1,
    group_id: [],
    route_id: [],
    host: "",
    port: "",
    server_port: "",
    rate: 1
  };

  switch (protocol) {
    case "shadowsocks":
      return { ...base, cipher: "aes-128-gcm" };
    case "vmess":
      return {
        ...base,
        tls: 0,
        network: "tcp",
        networkSettings: {},
        ruleSettings: {},
        tlsSettings: {},
        dnsSettings: {}
      };
    case "vless":
      return {
        ...base,
        tls: 0,
        network: "tcp",
        tls_settings: {},
        network_settings: {},
        encryption_settings: {}
      };
    case "trojan":
      return {
        ...base,
        network: "tcp",
        allow_insecure: 0
      };
    case "tuic":
      return {
        ...base,
        insecure: 0,
        disable_sni: 0,
        zero_rtt_handshake: 0
      };
    case "hysteria":
      return {
        ...base,
        version: 2,
        insecure: 0,
        up_mbps: 0,
        down_mbps: 0
      };
    case "anytls":
      return {
        ...base,
        insecure: 0
      };
    case "v2node":
      return {
        ...base,
        protocol: "vmess",
        tls: 0,
        network: "tcp",
        listen_ip: "0.0.0.0",
        disable_sni: 0,
        zero_rtt_handshake: 0,
        tls_settings: {},
        network_settings: {},
        encryption_settings: {}
      };
    default:
      return base;
  }
}

function sanitizeServerPayload(record: ServerRecord): Record<string, unknown> {
  const payload = { ...record } as Record<string, unknown>;
  [
    "type",
    "online",
    "last_check_at",
    "last_push_at",
    "cache_key",
    "available",
    "is_online",
    "created_at",
    "updated_at"
  ].forEach(key => {
    delete payload[key];
  });

  Object.keys(payload).forEach(key => {
    if (payload[key] === "") {
      payload[key] = null;
    }
  });

  return payload;
}

export function ServerManagePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortingId, setSortingId] = useState<number | null>(null);
  const [records, setRecords] = useState<ServerRecord[]>([]);
  const [activeProtocol, setActiveProtocol] = useState<ServerProtocol>("shadowsocks");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<ServerRecord>(defaultServer("shadowsocks"));
  const [error, setError] = useState<string | null>(null);
  const sortableSensors = useSortableTableSensors();
  const editorState = useOverlayState({ isOpen: editorOpen, onOpenChange: setEditorOpen });

  async function loadServers() {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminRequest<ServerRecord[]>("server/manage/getNodes");
      setRecords(asArray(unwrapEnvelope(envelope)) as ServerRecord[]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load servers");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveServer() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest(SAVE_ENDPOINTS[selected.type], {
          method: "POST",
          body: sanitizeServerPayload(selected)
        })
      );
      setEditorOpen(false);
      await loadServers();
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(endpoint: string, body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(await adminRequest(endpoint, { method: "POST", body }));
      await loadServers();
    } finally {
      setSubmitting(false);
    }
  }

  async function reorderServer(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= filtered.length) return;

    const currentProtocolRecords = [...filtered];
    const [current] = currentProtocolRecords.splice(fromIndex, 1);
    currentProtocolRecords.splice(toIndex, 0, current);

    const nextRecords = [...records];
    let pointer = 0;
    for (let index = 0; index < nextRecords.length; index += 1) {
      if (nextRecords[index].type === activeProtocol) {
        nextRecords[index] = currentProtocolRecords[pointer];
        pointer += 1;
      }
    }

    setRecords(nextRecords);
    setSortingId(current.id);
    try {
      const payload = nextRecords.reduce<Record<string, Record<number, number>>>((accumulator, record, index) => {
        if (!accumulator[record.type]) {
          accumulator[record.type] = {};
        }
        accumulator[record.type][record.id] = index;
        return accumulator;
      }, {});

      await unwrapEnvelope(
        await adminRequest("server/manage/sort", {
          method: "POST",
          body: payload
        })
      );
      await loadServers();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to sort servers");
      await loadServers();
    } finally {
      setSortingId(null);
    }
  }

  useEffect(() => {
    void loadServers();
  }, []);

  const filtered = useMemo(
    () => records.filter(record => record.type === activeProtocol),
    [records, activeProtocol]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || sortingId !== null) return;

    const fromIndex = filtered.findIndex(record => String(record.id) === String(active.id));
    const toIndex = filtered.findIndex(record => String(record.id) === String(over.id));
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    void reorderServer(fromIndex, toIndex);
  }

  const stats = useMemo(() => {
    const visible = filtered.filter(record => Boolean(Number(record.show || 0))).length;
    const online = filtered.reduce((sum, record) => sum + Number(record.online || 0), 0);
    const avgRate = filtered.length ? filtered.reduce((sum, record) => sum + Number(record.rate || 1), 0) / filtered.length : 0;

    return [
      { label: "Protocol set", value: String(filtered.length), hint: PROTOCOLS.find(item => item.key === activeProtocol)?.label || activeProtocol },
      { label: "Visible", value: String(visible), hint: "Shown to subscribers" },
      { label: "Online", value: String(online), hint: "Current online count" },
      { label: "Average rate", value: avgRate.toFixed(2), hint: "Billing multiplier" }
    ];
  }, [activeProtocol, filtered]);

  return (
    <PageFrame
      title="Servers"
      description="Node inventory now runs in a protocol-aware HeroUI workspace with direct visibility toggles, copy and delete actions, and a structured object editor for protocol-specific fields."
      onRefresh={() => void loadServers()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Node Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Browse each protocol independently, keep visibility under control, and edit raw settings without falling back to the old UI.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
            onPress={() => {
              setSelected(defaultServer(activeProtocol));
              setEditorOpen(true);
            }}
          >
            Add {PROTOCOLS.find(item => item.key === activeProtocol)?.label}
          </Button>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-5`}>
          <Tabs
            selectedKey={activeProtocol}
            onSelectionChange={key => setActiveProtocol(String(key) as ServerProtocol)}
            color="primary"
            variant="underlined"
          >
            {PROTOCOLS.map(protocol => (
              <Tab key={protocol.key} title={protocol.label} />
            ))}
          </Tabs>

          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="primary" label="Loading servers" />
            </div>
          ) : (
            <DndContext
              sensors={sortableSensors}
              collisionDetection={sortableCollisionDetection}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filtered.map(record => String(record.id))}
                strategy={verticalListSortingStrategy}
              >
                <Table aria-label="Servers" classNames={adminTableClassNames}>
                  <TableHeader>
                    <TableColumn>Sort</TableColumn>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Host</TableColumn>
                    <TableColumn>Group</TableColumn>
                    <TableColumn>Rate</TableColumn>
                    <TableColumn>Online</TableColumn>
                    <TableColumn>Check</TableColumn>
                    <TableColumn>Visible</TableColumn>
                    <TableColumn align="end">Actions</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No nodes found">
                    {filtered.map(item => {
                      const sorting = sortingId === item.id;

                      return (
                        <SortableTableRow
                          key={`${item.type}-${item.id}`}
                          id={String(item.id)}
                          dragLabel={`Reorder node ${String(item.name || item.id)}`}
                          isDisabled={sortingId !== null}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{String(item.name || "Unnamed Node")}</p>
                              <p className="text-xs text-slate-500">{item.type}</p>
                            </div>
                          </TableCell>
                          <TableCell>{String(item.host || "—")}:{String(item.port || "—")}</TableCell>
                          <TableCell>
                            <Chip variant="flat" className="bg-sky-50 text-sky-700">{Array.isArray(item.group_id) ? item.group_id.join(", ") : String(item.group_id || "—")}</Chip>
                          </TableCell>
                          <TableCell>{String(item.rate || "1")}</TableCell>
                          <TableCell>{Number(item.online || 0)}</TableCell>
                          <TableCell>{formatDateTime((item.last_check_at as number) || null)}</TableCell>
                          <TableCell>
                            <Switch
                              isSelected={Boolean(Number(item.show || 0))}
                              onValueChange={value => void runAction(UPDATE_ENDPOINTS[item.type], { id: item.id, show: value ? 1 : 0 })}
                            />
                          </TableCell>
                          <TableCell className={adminTableActionCellClassName}>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                color="primary"
                                variant="light"
                                onPress={() => {
                                  setSelected({ ...item });
                                  setEditorOpen(true);
                                }}
                                isDisabled={sorting}
                              >
                                Edit
                              </Button>
                              <Button size="sm" color="secondary" variant="light" onPress={() => void runAction(COPY_ENDPOINTS[item.type], { id: item.id })} isDisabled={sorting}>
                                Copy
                              </Button>
                              <Button size="sm" color="danger" variant="light" onPress={() => void runAction(DROP_ENDPOINTS[item.type], { id: item.id })} isDisabled={sorting}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </SortableTableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Modal state={editorState}>
        <Modal.Backdrop>
          <Modal.Container size="5xl" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{selected.id ? "Edit node" : "Create node"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="gap-5">
                <div className="rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
                  This editor keeps the original backend contract intact. Protocol-specific arrays and nested objects are edited as JSON where needed.
                </div>
                <ObjectRecordEditor
                  value={selected}
                  onChange={value => setSelected(value as ServerRecord)}
                  hiddenKeys={["created_at", "updated_at", "cache_key", "online", "last_check_at", "last_push_at", "is_online", "available"]}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={editorState.close}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => void saveServer()} isLoading={submitting}>
                  Save node
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
