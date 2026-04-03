import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Spinner,
  Switch,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
} from "@heroui/react";
import { Copy, PencilToLine, TrashBin } from "@gravity-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminSelectField } from "../components/AdminSelectField";
import { AdminTextField } from "../components/AdminTextField";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import {
  SortableTableRow,
  adminTableActionCellClassName,
  sortableCollisionDetection,
  useSortableTableSensors
} from "../components/SortableTable";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
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

const CIPHER_OPTIONS = [
  { id: "aes-128-gcm", label: "AES-128-GCM" },
  { id: "aes-192-gcm", label: "AES-192-GCM" },
  { id: "aes-256-gcm", label: "AES-256-GCM" },
  { id: "chacha20-ietf-poly1305", label: "ChaCha20-Poly1305" },
  { id: "2022-blake3-aes-128-gcm", label: "2022 BLAKE3 AES-128-GCM" },
  { id: "2022-blake3-aes-256-gcm", label: "2022 BLAKE3 AES-256-GCM" }
];

const NETWORK_OPTIONS = [
  { id: "tcp", label: "TCP" },
  { id: "ws", label: "WebSocket" },
  { id: "grpc", label: "gRPC" },
  { id: "http", label: "HTTP" },
  { id: "httpupgrade", label: "HTTP Upgrade" },
  { id: "xhttp", label: "XHTTP" }
];

const PROTOCOL_OPTIONS = [
  { id: "shadowsocks", label: "Shadowsocks" },
  { id: "vmess", label: "VMess" },
  { id: "vless", label: "VLESS" },
  { id: "trojan", label: "Trojan" },
  { id: "tuic", label: "TUIC" },
  { id: "hysteria2", label: "Hysteria 2" },
  { id: "anytls", label: "AnyTLS" }
];

function stringifyField(value: unknown): string {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item)).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function parseListField(value: unknown): Array<string | number> {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item).trim())
      .filter(Boolean)
      .map(item => (Number.isFinite(Number(item)) && item !== "" ? Number(item) : item));
  }

  if (value === null || typeof value === "undefined") {
    return [];
  }

  const raw = String(value).trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => String(item).trim())
          .filter(Boolean)
          .map(item => (Number.isFinite(Number(item)) && item !== "" ? Number(item) : item));
      }
    } catch {
      // Fall back to comma parsing below.
    }
  }

  return raw
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => (Number.isFinite(Number(item)) && item !== "" ? Number(item) : item));
}

function parseJsonField(value: unknown): unknown {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const raw = value.trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Please enter valid JSON for advanced settings.");
  }
}

function prepareServerPayload(record: ServerRecord): Record<string, unknown> {
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

  ["group_id", "route_id", "tags"].forEach(key => {
    if (key in payload) {
      payload[key] = parseListField(payload[key]);
    }
  });

  [
    "networkSettings",
    "ruleSettings",
    "tlsSettings",
    "dnsSettings",
    "tls_settings",
    "network_settings",
    "encryption_settings",
    "padding_scheme"
  ].forEach(key => {
    if (key in payload) {
      payload[key] = parseJsonField(payload[key]);
    }
  });

  Object.keys(payload).forEach(key => {
    if (payload[key] === "") {
      payload[key] = null;
    }
  });

  return payload;
}

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
  return prepareServerPayload(record);
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
      const payload = sanitizeServerPayload(selected);
      await unwrapEnvelope(
        await adminRequest(SAVE_ENDPOINTS[selected.type], {
          method: "POST",
          body: payload
        })
      );
      setEditorOpen(false);
      await loadServers();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save server");
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

  const selectedProtocolLabel = PROTOCOLS.find(item => item.key === selected.type)?.label || selected.type;
  const groupIdsValue = stringifyField(selected.group_id);
  const routeIdsValue = stringifyField(selected.route_id);
  const tagsValue = stringifyField(selected.tags);
  const groupIdsInvalid = parseListField(groupIdsValue).length === 0;

  function updateSelectedField(key: string, value: unknown) {
    setSelected(current => ({ ...current, [key]: value }));
  }

  function renderProtocolFields() {
    switch (selected.type) {
      case "shadowsocks":
        return (
          <div className="space-y-4">
            <AdminSelectField
              ariaLabel="Cipher"
              options={CIPHER_OPTIONS}
              selectedKey={String(selected.cipher || "aes-128-gcm")}
              onSelectionChange={key => updateSelectedField("cipher", String(key || "aes-128-gcm"))}
            />
          </div>
        );
      case "vmess":
        return (
          <div className="space-y-4">
            <AdminTextField
              label="TLS"
              type="number"
              value={stringifyField(selected.tls ?? 0)}
              onChange={event => updateSelectedField("tls", event.target.value)}
              description="Use 0, 1, or 2 depending on the deployment mode."
            />
            <AdminSelectField
              ariaLabel="Network"
              options={NETWORK_OPTIONS}
              selectedKey={String(selected.network || "tcp")}
              onSelectionChange={key => updateSelectedField("network", String(key || "tcp"))}
            />
            <AdminTextField
              label="Network Settings"
              multiline
              rows={5}
              value={stringifyField(selected.networkSettings)}
              onChange={event => updateSelectedField("networkSettings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="Rule Settings"
              multiline
              rows={5}
              value={stringifyField(selected.ruleSettings)}
              onChange={event => updateSelectedField("ruleSettings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="TLS Settings"
              multiline
              rows={5}
              value={stringifyField(selected.tlsSettings)}
              onChange={event => updateSelectedField("tlsSettings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="DNS Settings"
              multiline
              rows={5}
              value={stringifyField(selected.dnsSettings)}
              onChange={event => updateSelectedField("dnsSettings", event.target.value)}
              description="JSON object."
            />
          </div>
        );
      case "vless":
        return (
          <div className="space-y-4">
            <AdminTextField
              label="TLS"
              type="number"
              value={stringifyField(selected.tls ?? 0)}
              onChange={event => updateSelectedField("tls", event.target.value)}
              description="Use 0, 1, or 2 depending on the deployment mode."
            />
            <AdminSelectField
              ariaLabel="Network"
              options={NETWORK_OPTIONS}
              selectedKey={String(selected.network || "tcp")}
              onSelectionChange={key => updateSelectedField("network", String(key || "tcp"))}
            />
            <AdminTextField
              label="TLS Settings"
              multiline
              rows={5}
              value={stringifyField(selected.tls_settings)}
              onChange={event => updateSelectedField("tls_settings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="Network Settings"
              multiline
              rows={5}
              value={stringifyField(selected.network_settings)}
              onChange={event => updateSelectedField("network_settings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="Encryption Settings"
              multiline
              rows={5}
              value={stringifyField(selected.encryption_settings)}
              onChange={event => updateSelectedField("encryption_settings", event.target.value)}
              description="JSON object."
            />
          </div>
        );
      case "trojan":
        return (
          <div className="space-y-4">
            <AdminSelectField
              ariaLabel="Network"
              options={NETWORK_OPTIONS}
              selectedKey={String(selected.network || "tcp")}
              onSelectionChange={key => updateSelectedField("network", String(key || "tcp"))}
            />
            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Allow Insecure</p>
                <p className="text-xs text-slate-500">Enable insecure certificate handling.</p>
              </div>
              <Switch
                aria-label="Allow Insecure"
                size="sm"
                isSelected={Boolean(Number(selected.allow_insecure || 0))}
                onChange={value => updateSelectedField("allow_insecure", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
          </div>
        );
      case "tuic":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Insecure</p>
                <p className="text-xs text-slate-500">Allow insecure certificate handling.</p>
              </div>
              <Switch
                aria-label="Insecure"
                size="sm"
                isSelected={Boolean(Number(selected.insecure || 0))}
                onChange={value => updateSelectedField("insecure", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Disable SNI</p>
                <p className="text-xs text-slate-500">Turn off SNI during connection setup.</p>
              </div>
              <Switch
                aria-label="Disable SNI"
                size="sm"
                isSelected={Boolean(Number(selected.disable_sni || 0))}
                onChange={value => updateSelectedField("disable_sni", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Zero RTT Handshake</p>
                <p className="text-xs text-slate-500">Enable 0-RTT handshake support.</p>
              </div>
              <Switch
                aria-label="Zero RTT Handshake"
                size="sm"
                isSelected={Boolean(Number(selected.zero_rtt_handshake || 0))}
                onChange={value => updateSelectedField("zero_rtt_handshake", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
          </div>
        );
      case "hysteria":
        return (
          <div className="space-y-4">
            <AdminTextField
              label="Version"
              type="number"
              value={stringifyField(selected.version ?? 2)}
              onChange={event => updateSelectedField("version", event.target.value)}
              description="Use 1 or 2 according to the server implementation."
            />
            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Insecure</p>
                <p className="text-xs text-slate-500">Allow insecure certificate handling.</p>
              </div>
              <Switch
                aria-label="Insecure"
                size="sm"
                isSelected={Boolean(Number(selected.insecure || 0))}
                onChange={value => updateSelectedField("insecure", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
            <AdminTextField
              label="Upload Mbps"
              type="number"
              value={stringifyField(selected.up_mbps ?? 0)}
              onChange={event => updateSelectedField("up_mbps", event.target.value)}
            />
            <AdminTextField
              label="Download Mbps"
              type="number"
              value={stringifyField(selected.down_mbps ?? 0)}
              onChange={event => updateSelectedField("down_mbps", event.target.value)}
            />
          </div>
        );
      case "anytls":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Insecure</p>
                <p className="text-xs text-slate-500">Allow insecure certificate handling.</p>
              </div>
              <Switch
                aria-label="Insecure"
                size="sm"
                isSelected={Boolean(Number(selected.insecure || 0))}
                onChange={value => updateSelectedField("insecure", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
            <AdminTextField
              label="Padding Scheme"
              multiline
              rows={5}
              value={stringifyField(selected.padding_scheme)}
              onChange={event => updateSelectedField("padding_scheme", event.target.value)}
              description="JSON object or array."
            />
          </div>
        );
      case "v2node":
        return (
          <div className="space-y-4">
            <AdminSelectField
              ariaLabel="Protocol"
              options={PROTOCOL_OPTIONS}
              selectedKey={String(selected.protocol || "vmess")}
              onSelectionChange={key => updateSelectedField("protocol", String(key || "vmess"))}
            />
            <AdminTextField
              label="Listen IP"
              value={stringifyField(selected.listen_ip)}
              onChange={event => updateSelectedField("listen_ip", event.target.value)}
              description="Defaults to 0.0.0.0."
            />
            <AdminTextField
              label="TLS"
              type="number"
              value={stringifyField(selected.tls ?? 0)}
              onChange={event => updateSelectedField("tls", event.target.value)}
            />
            <AdminSelectField
              ariaLabel="Network"
              options={NETWORK_OPTIONS}
              selectedKey={String(selected.network || "tcp")}
              onSelectionChange={key => updateSelectedField("network", String(key || "tcp"))}
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Disable SNI</p>
                  <p className="text-xs text-slate-500">Turn off SNI during connection setup.</p>
                </div>
                <Switch
                  aria-label="Disable SNI"
                  size="sm"
                  isSelected={Boolean(Number(selected.disable_sni || 0))}
                  onChange={value => updateSelectedField("disable_sni", value ? 1 : 0)}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Zero RTT Handshake</p>
                  <p className="text-xs text-slate-500">Enable 0-RTT handshake support.</p>
                </div>
                <Switch
                  aria-label="Zero RTT Handshake"
                  size="sm"
                  isSelected={Boolean(Number(selected.zero_rtt_handshake || 0))}
                  onChange={value => updateSelectedField("zero_rtt_handshake", value ? 1 : 0)}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
            </div>
            <AdminTextField
              label="TLS Settings"
              multiline
              rows={5}
              value={stringifyField(selected.tls_settings)}
              onChange={event => updateSelectedField("tls_settings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="Network Settings"
              multiline
              rows={5}
              value={stringifyField(selected.network_settings)}
              onChange={event => updateSelectedField("network_settings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="Encryption Settings"
              multiline
              rows={5}
              value={stringifyField(selected.encryption_settings)}
              onChange={event => updateSelectedField("encryption_settings", event.target.value)}
              description="JSON object."
            />
            <AdminTextField
              label="Padding Scheme"
              multiline
              rows={5}
              value={stringifyField(selected.padding_scheme)}
              onChange={event => updateSelectedField("padding_scheme", event.target.value)}
              description="JSON object or array."
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <PageFrame
      title="Servers"
      description="Node inventory now runs in a protocol-aware HeroUI workspace with direct visibility toggles, copy and delete actions, and a dedicated form for protocol-specific fields."
      onRefresh={() => void loadServers()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Node Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Browse each protocol independently, keep visibility under control, and edit raw settings without falling back to the old UI.
            </p>
          </div>
          <Button
            variant="primary"
           
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
            variant="secondary"
          >
            <Tabs.List>
              {PROTOCOLS.map(protocol => (
                <Tabs.Tab id={protocol.key} key={protocol.key}>
                  {protocol.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner />
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
                <Table aria-label="Servers" className={adminTableClassNames.wrapper}>
                  <Table.Content>
                    <TableHeader>
                      <TableColumn>Sort</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Host</TableColumn>
                      <TableColumn>Group</TableColumn>
                      <TableColumn>Rate</TableColumn>
                      <TableColumn>Online</TableColumn>
                      <TableColumn>Check</TableColumn>
                      <TableColumn>Visible</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
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
                            <Chip variant="soft" className="bg-sky-50 text-sky-700">{Array.isArray(item.group_id) ? item.group_id.join(", ") : String(item.group_id || "—")}</Chip>
                          </TableCell>
                          <TableCell>{String(item.rate || "1")}</TableCell>
                          <TableCell>{Number(item.online || 0)}</TableCell>
                          <TableCell>{formatDateTime((item.last_check_at as number) || null)}</TableCell>
                          <TableCell>
                              <Switch
                                isSelected={Boolean(Number(item.show || 0))}
                              onChange={value => void runAction(UPDATE_ENDPOINTS[item.type], { id: item.id, show: value ? 1 : 0 })}
                              />
                          </TableCell>
                          <TableCell className={adminTableActionCellClassName}>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                isIconOnly
                                aria-label={`Edit node ${String(item.name || item.id || "")}`}
                                onPress={() => {
                                  setSelected({ ...item });
                                  setEditorOpen(true);
                                }}
                                isDisabled={sorting}
                              >
                                <PencilToLine width={16} height={16} aria-hidden="true" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                isIconOnly
                                aria-label={`Copy node ${String(item.name || item.id || "")}`}
                                onPress={() => void runAction(COPY_ENDPOINTS[item.type], { id: item.id })}
                                isDisabled={sorting}
                              >
                                <Copy width={16} height={16} aria-hidden="true" />
                              </Button>
                              <DangerConfirmButton
                                size="sm"
                                isDisabled={sorting}
                                isIconOnly
                                aria-label={`Delete node ${String(item.name || item.id || "")}`}
                                title={`Delete ${item.name || item.id || "server"}?`}
                                description="This will permanently remove the server entry."
                                confirmLabel="Delete server"
                                onConfirm={() => void runAction(DROP_ENDPOINTS[item.type], { id: item.id })}
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
        isOpen={editorOpen}
        onOpenChange={setEditorOpen}
        title={selected.id ? "Edit node" : "Create node"}
        isBusy={submitting}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                if (groupIdsInvalid) {
                  setError("Group IDs are required.");
                  return;
                }

                void saveServer();
              }}
              isDisabled={submitting || groupIdsInvalid}
            >
              Save node
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (groupIdsInvalid) {
              setError("Group IDs are required.");
              return;
            }

            void saveServer();
          }}
        >
          <div className="rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
            This drawer uses plain HeroUI form controls instead of a generic record table.
          </div>

          <div className="space-y-4 rounded-2xl border border-default-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">Core details</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Required fields that apply to every server.</p>
            </div>
            <div className="space-y-4">
              <AdminTextField
                label="Node Name"
                value={stringifyField(selected.name)}
                onChange={event => updateSelectedField("name", event.target.value)}
                isRequired
              />
              <div className="rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Protocol</p>
                <p className="mt-1 text-sm text-slate-500">{selectedProtocolLabel}</p>
              </div>
              <AdminTextField
                label="Host"
                value={stringifyField(selected.host)}
                onChange={event => updateSelectedField("host", event.target.value)}
                isRequired
              />
              <AdminTextField
                label="Port"
                type="number"
                value={stringifyField(selected.port)}
                onChange={event => updateSelectedField("port", event.target.value)}
                isRequired
              />
              <AdminTextField
                label="Server Port"
                type="number"
                value={stringifyField(selected.server_port)}
                onChange={event => updateSelectedField("server_port", event.target.value)}
                isRequired
              />
              <AdminTextField
                label="Rate"
                type="number"
                value={stringifyField(selected.rate ?? 1)}
                onChange={event => updateSelectedField("rate", event.target.value)}
                isRequired
              />
              <AdminTextField
                label="Group IDs"
                value={groupIdsValue}
                onChange={event => updateSelectedField("group_id", event.target.value)}
                description="Comma-separated IDs. This field is required."
                isRequired
                isInvalid={groupIdsInvalid}
                errorMessage="At least one group ID is required."
              />
              <AdminTextField
                label="Route IDs"
                value={routeIdsValue}
                onChange={event => updateSelectedField("route_id", event.target.value)}
                description="Comma-separated IDs. Leave empty to disable routing."
              />
              <AdminTextField
                label="Tags"
                value={tagsValue}
                onChange={event => updateSelectedField("tags", event.target.value)}
                description="Comma-separated tags used by the backend."
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-default-200 bg-default-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Visible</p>
                <p className="text-xs text-slate-500">Show this server to subscribers.</p>
              </div>
              <Switch
                aria-label="Visible"
                size="sm"
                isSelected={Boolean(Number(selected.show || 0))}
                onChange={value => updateSelectedField("show", value ? 1 : 0)}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-default-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">Common options</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Optional settings shared by multiple protocols.</p>
            </div>
            <div className="space-y-4">
              <AdminTextField
                label="Server Name"
                value={stringifyField(selected.server_name)}
                onChange={event => updateSelectedField("server_name", event.target.value)}
                description="Optional name shown in protocol-specific clients."
              />
              <AdminTextField
                label="Parent ID"
                type="number"
                value={stringifyField(selected.parent_id)}
                onChange={event => updateSelectedField("parent_id", event.target.value)}
                description="Optional parent node ID."
              />
              <AdminTextField
                label="UDP Relay Mode"
                value={stringifyField(selected.udp_relay_mode)}
                onChange={event => updateSelectedField("udp_relay_mode", event.target.value)}
              />
              <AdminTextField
                label="Congestion Control"
                value={stringifyField(selected.congestion_control)}
                onChange={event => updateSelectedField("congestion_control", event.target.value)}
              />
              <AdminTextField
                label="Obfuscation"
                value={stringifyField(selected.obfs)}
                onChange={event => updateSelectedField("obfs", event.target.value)}
              />
              <AdminTextField
                label="Obfuscation Password"
                value={stringifyField(selected.obfs_password)}
                onChange={event => updateSelectedField("obfs_password", event.target.value)}
              />
              <AdminTextField
                label="Flow"
                value={stringifyField(selected.flow)}
                onChange={event => updateSelectedField("flow", event.target.value)}
                description="Optional flow value such as xtls-rprx-vision."
              />
              <AdminTextField
                label="Encryption"
                value={stringifyField(selected.encryption)}
                onChange={event => updateSelectedField("encryption", event.target.value)}
                description="Optional encryption mode."
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-default-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">Protocol settings</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Fields below are shown for the selected protocol only.</p>
            </div>
            {renderProtocolFields()}
          </div>
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
