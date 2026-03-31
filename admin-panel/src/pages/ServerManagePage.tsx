import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { ObjectRecordEditor } from "../components/ObjectRecordEditor";
import { formatDateTime } from "../lib/admin-format";

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
  return {
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
}

export function ServerManagePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<ServerRecord[]>([]);
  const [activeProtocol, setActiveProtocol] = useState<ServerProtocol>("shadowsocks");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<ServerRecord>(defaultServer("shadowsocks"));
  const [error, setError] = useState<string | null>(null);

  async function loadServers() {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminRequest<ServerRecord[]>("server/manage/getNodes");
      setRecords(unwrapEnvelope(envelope));
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
          body: selected
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

  useEffect(() => {
    void loadServers();
  }, []);

  const filtered = useMemo(
    () => records.filter(record => record.type === activeProtocol),
    [records, activeProtocol]
  );

  return (
    <PageFrame
      title="Servers"
      description="Node inventory now runs in a protocol-aware HeroUI workspace with direct visibility toggles, copy and delete actions, and a structured object editor for protocol-specific fields."
      legacyPath="/server/manage"
      onRefresh={() => void loadServers()}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">Node Inventory</p>
              <p className="text-sm text-slate-500">Browse each protocol independently, keep visibility under control, and edit raw settings without falling back to the old UI.</p>
            </div>
            <Button
              color="primary"
              onPress={() => {
                setSelected(defaultServer(activeProtocol));
                setEditorOpen(true);
              }}
            >
              Add {PROTOCOLS.find(item => item.key === activeProtocol)?.label}
            </Button>
          </div>
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
        </CardHeader>
        <CardBody className="gap-5">
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="warning" label="Loading servers" />
            </div>
          ) : (
            <Table removeWrapper aria-label="Servers">
              <TableHeader>
                <TableColumn>Name</TableColumn>
                <TableColumn>Host</TableColumn>
                <TableColumn>Group</TableColumn>
                <TableColumn>Rate</TableColumn>
                <TableColumn>Online</TableColumn>
                <TableColumn>Check</TableColumn>
                <TableColumn>Visible</TableColumn>
                <TableColumn align="end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={filtered} emptyContent="No nodes found">
                {item => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{String(item.name || "Unnamed Node")}</p>
                        <p className="text-xs text-slate-500">{item.type}</p>
                      </div>
                    </TableCell>
                    <TableCell>{String(item.host || "—")}:{String(item.port || "—")}</TableCell>
                    <TableCell>
                      <Chip variant="flat">{Array.isArray(item.group_id) ? item.group_id.join(", ") : String(item.group_id || "—")}</Chip>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            setSelected({ ...item });
                            setEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="flat" onPress={() => void runAction(COPY_ENDPOINTS[item.type], { id: item.id })} isLoading={submitting}>
                          Copy
                        </Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => void runAction(DROP_ENDPOINTS[item.type], { id: item.id })} isLoading={submitting}>
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

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected.id ? "Edit node" : "Create node"}</ModalHeader>
          <ModalBody className="gap-5">
            <div className="rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
              This editor keeps the original backend contract intact. Protocol-specific arrays and nested objects are edited as JSON where needed.
            </div>
            <ObjectRecordEditor
              value={selected}
              onChange={value => setSelected(value as ServerRecord)}
              hiddenKeys={["created_at", "updated_at", "cache_key", "online", "last_check_at", "last_push_at", "is_online", "available"]}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveServer()} isLoading={submitting}>
              Save node
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
