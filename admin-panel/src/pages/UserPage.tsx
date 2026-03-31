import {
  Ban,
  Globe,
  Key,
  LockOpen,
  PencilToLine,
  SquareChartBar,
  TrashBin
} from "@gravity-ui/icons";
import {
  Accordion,
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
  TableRow,
  TextArea,
  Tooltip
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { ModalField } from "../components/ModalField";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { formatBytes, formatDateTime, formatMoney } from "../lib/admin-format";
import {
  adminCardClassName,
  adminFilterAccordionClassName,
  adminFilterAccordionItemClasses,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

interface PlanRecord {
  id: number;
  name: string;
}

interface UserRecord {
  id: number;
  email: string;
  balance?: number;
  commission_balance?: number;
  commission_rate?: number | null;
  discount?: number | null;
  plan_id?: number | null;
  plan_name?: string;
  transfer_enable?: number;
  total_used?: number;
  device_limit?: number | null;
  expired_at?: number | null;
  banned?: number;
  is_admin?: number;
  is_staff?: number;
  speed_limit?: number | null;
  subscribe_url?: string;
  remarks?: string | null;
  recent_ips?: string[];
  recent_login_ips?: string[];
  recent_ip_records?: Array<{ ip: string; last_seen_at: number }>;
  recent_login_ip_records?: Array<{ ip: string; last_seen_at: number }>;
  alive_ip?: number;
  invite_user?: {
    email?: string;
  } | null;
}

interface IpGeoProvider {
  key: string;
  name: string;
}

interface IpGeoResponse {
  status?: string;
  message?: string;
  provider?: string;
  country?: string;
  city?: string;
  isp?: string;
  organization?: string;
}

interface UserStatRecord {
  id?: number;
  record_at: number;
  u: number;
  d: number;
  server_rate: number;
}

interface UserFormState {
  id?: number;
  email: string;
  password: string;
  plan_id: string;
  transfer_enable: string;
  device_limit: string;
  expired_at: string;
  balance: string;
  commission_balance: string;
  commission_rate: string;
  discount: string;
  speed_limit: string;
  remarks: string;
  invite_user_email: string;
  banned: boolean;
  is_admin: boolean;
  is_staff: boolean;
}

interface GenerateFormState {
  email_prefix: string;
  email_suffix: string;
  password: string;
  plan_id: string;
  expired_at: string;
  generate_count: string;
}

interface MailFormState {
  subject: string;
  content: string;
}

const PAGE_SIZE = 10;

function emptyUserForm(record?: UserRecord | null): UserFormState {
  return {
    id: record?.id,
    email: record?.email || "",
    password: "",
    plan_id: record?.plan_id ? String(record.plan_id) : "",
    transfer_enable: record?.transfer_enable ? String(Math.round(record.transfer_enable / 1073741824)) : "",
    device_limit: record?.device_limit != null ? String(record.device_limit) : "",
    expired_at: record?.expired_at ? String(record.expired_at) : "",
    balance: record?.balance ? String(record.balance) : "0",
    commission_balance: record?.commission_balance ? String(record.commission_balance) : "0",
    commission_rate: record?.commission_rate != null ? String(record.commission_rate) : "",
    discount: record?.discount != null ? String(record.discount) : "",
    speed_limit: record?.speed_limit != null ? String(record.speed_limit) : "",
    remarks: record?.remarks || "",
    invite_user_email: record?.invite_user?.email || "",
    banned: Boolean(Number(record?.banned || 0)),
    is_admin: Boolean(Number(record?.is_admin || 0)),
    is_staff: Boolean(Number(record?.is_staff || 0))
  };
}

function defaultGenerateForm(): GenerateFormState {
  return {
    email_prefix: "",
    email_suffix: "example.com",
    password: "",
    plan_id: "",
    expired_at: "",
    generate_count: "1"
  };
}

function buildUserFilter(email: string, planId: string, banned: string) {
  const filters: Array<{ key: string; condition: string; value: string | number }> = [];
  if (email.trim()) {
    filters.push({ key: "email", condition: "模糊", value: email.trim() });
  }
  if (planId) {
    filters.push({ key: "plan_id", condition: "=", value: planId });
  }
  if (banned) {
    filters.push({ key: "banned", condition: "=", value: banned });
  }
  return filters;
}

export function UserPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [statsUser, setStatsUser] = useState<UserRecord | null>(null);
  const [ipGeoUser, setIpGeoUser] = useState<UserRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [ipGeoOpen, setIpGeoOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyUserForm());
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(defaultGenerateForm());
  const [mailForm, setMailForm] = useState<MailFormState>({ subject: "", content: "" });
  const [statsPage, setStatsPage] = useState(1);
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsRecords, setStatsRecords] = useState<UserStatRecord[]>([]);
  const [geoProviders, setGeoProviders] = useState<IpGeoProvider[]>([]);
  const [geoProvider, setGeoProvider] = useState("ipinfo");
  const [geoLoading, setGeoLoading] = useState<Record<string, boolean>>({});
  const [geoRecords, setGeoRecords] = useState<Record<string, IpGeoResponse>>({});
  const [error, setError] = useState<string | null>(null);

  async function loadUsers(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const [userEnvelope, planEnvelope] = await Promise.all([
        adminRequest<UserRecord[]>("user/fetch", {
          query: {
            current: nextPage,
            pageSize: PAGE_SIZE,
            ...(buildUserFilter(searchEmail, planFilter, bannedFilter).length
              ? { filter: buildUserFilter(searchEmail, planFilter, bannedFilter) }
              : {})
          }
        }),
        adminRequest<PlanRecord[]>("plan/fetch")
      ]);

      const userPayload = unwrapEnvelope(userEnvelope);
      const planPayload = unwrapEnvelope(planEnvelope);
      setRecords(Array.isArray(userPayload) ? userPayload : []);
      setTotal(Number(userEnvelope.total || 0));
      setPlans(Array.isArray(planPayload) ? planPayload : []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load users");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function submitUserUpdate() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("user/update", {
          method: "POST",
          body: {
            id: form.id,
            email: form.email,
            password: form.password || undefined,
            plan_id: form.plan_id || null,
            transfer_enable: form.transfer_enable ? Number(form.transfer_enable) * 1073741824 : 0,
            balance: Number(form.balance || 0),
            commission_balance: Number(form.commission_balance || 0),
            commission_rate: form.commission_rate || null,
            discount: form.discount || null,
            expired_at: form.expired_at || null,
            speed_limit: form.speed_limit || null,
            remarks: form.remarks || null,
            invite_user_email: form.invite_user_email || null,
            device_limit: form.device_limit || null,
            banned: form.banned ? 1 : 0,
            is_admin: form.is_admin ? 1 : 0,
            is_staff: form.is_staff ? 1 : 0
          }
        })
      );
      setEditorOpen(false);
      await loadUsers();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  }

  async function openEditor(record: UserRecord) {
    setSubmitting(true);
    try {
      const envelope = await adminRequest<UserRecord>("user/getUserInfoById", {
        query: { id: record.id }
      });
      const detail = unwrapEnvelope(envelope);
      setSelected(detail);
      setForm(emptyUserForm(detail));
      setEditorOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load user detail");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGenerate() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("user/generate", {
          method: "POST",
          body: {
            email_prefix: generateForm.generate_count === "1" ? generateForm.email_prefix : undefined,
            email_suffix: generateForm.email_suffix,
            password: generateForm.password || undefined,
            plan_id: generateForm.plan_id || undefined,
            expired_at: generateForm.expired_at || undefined,
            generate_count: Number(generateForm.generate_count || 1)
          }
        })
      );
      setGenerateOpen(false);
      setGenerateForm(defaultGenerateForm());
      await loadUsers(1);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendMail() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("user/sendMail", {
          method: "POST",
          body: {
            subject: mailForm.subject,
            content: mailForm.content,
            ...(buildUserFilter(searchEmail, planFilter, bannedFilter).length
              ? { filter: buildUserFilter(searchEmail, planFilter, bannedFilter) }
              : {})
          }
        })
      );
      setMailOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function runRowAction(endpoint: string, body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(await adminRequest(endpoint, { method: "POST", body }));
      await loadUsers();
    } finally {
      setSubmitting(false);
    }
  }

  async function loadIpGeoProviders() {
    try {
      const envelope = await adminRequest<{ providers: IpGeoProvider[]; default?: string }>("user/ipGeoProviders");
      const payload = unwrapEnvelope(envelope);
      setGeoProviders(payload.providers || []);
      setGeoProvider(payload.default || payload.providers?.[0]?.key || "ipinfo");
    } catch (nextError) {
      setGeoProviders([]);
    }
  }

  async function fetchGeo(ip: string) {
    if (!ip || geoLoading[ip]) return;
    setGeoLoading(current => ({ ...current, [ip]: true }));
    try {
      const envelope = await adminRequest<IpGeoResponse>("user/ipGeo", {
        method: "POST",
        body: {
          ip,
          provider: geoProvider
        }
      });
      const payload = unwrapEnvelope(envelope);
      setGeoRecords(current => ({
        ...current,
        [ip]:
          payload && payload.status === "success"
            ? payload
            : {
                status: "failed",
                message: payload?.message || "Fetch failed",
                provider: geoProvider
              }
      }));
    } catch (nextError) {
      setGeoRecords(current => ({
        ...current,
        [ip]: {
          status: "failed",
          message: nextError instanceof Error ? nextError.message : "Fetch failed",
          provider: geoProvider
        }
      }));
    } finally {
      setGeoLoading(current => ({ ...current, [ip]: false }));
    }
  }

  async function fetchAllGeo() {
    const ipRecords = [
      ...(ipGeoUser?.recent_ip_records || []),
      ...(ipGeoUser?.recent_login_ip_records || [])
    ];
    const uniqueIps = Array.from(new Set(ipRecords.map(item => item.ip).filter(Boolean)));
    for (const ip of uniqueIps) {
      // eslint-disable-next-line no-await-in-loop
      await fetchGeo(ip);
    }
  }

  async function openTrafficStats(record: UserRecord) {
    setStatsUser(record);
    setStatsPage(1);
    setStatsOpen(true);
  }

  async function loadTrafficStats(currentPage = statsPage, user = statsUser) {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const envelope = await adminRequest<UserStatRecord[]>("stat/getStatUser", {
        query: {
          user_id: user.id,
          current: currentPage,
          pageSize: PAGE_SIZE
        }
      });
      const payload = unwrapEnvelope(envelope);
      setStatsRecords(payload || []);
      setStatsTotal(Number(envelope.total || 0));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load traffic stats");
      setStatsRecords([]);
      setStatsTotal(0);
    } finally {
      setSubmitting(false);
    }
  }

  async function openIpGeo(record: UserRecord) {
    setIpGeoUser(record);
    setIpGeoOpen(true);
  }

  async function dumpCsv() {
    setSubmitting(true);
    try {
      const envelope = await adminRequest<string>("user/dumpCSV", {
        method: "POST",
        body: {
          ...(buildUserFilter(searchEmail, planFilter, bannedFilter).length
            ? { filter: buildUserFilter(searchEmail, planFilter, bannedFilter) }
            : {})
        }
      });
      const content = envelope.data || "";
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to export users");
    } finally {
      setSubmitting(false);
    }
  }

  async function bulkDelete() {
    if (!window.confirm("Delete all users in the current filter scope?")) return;
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("user/allDel", {
          method: "POST",
          body: {
            ...(buildUserFilter(searchEmail, planFilter, bannedFilter).length
              ? { filter: buildUserFilter(searchEmail, planFilter, bannedFilter) }
              : {})
          }
        })
      );
      setPage(1);
      await loadUsers(1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete users");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadUsers(page);
  }, [page]);

  useEffect(() => {
    void loadIpGeoProviders();
  }, []);

  useEffect(() => {
    if (statsOpen && statsUser?.id) {
      void loadTrafficStats(statsPage, statsUser);
    }
  }, [statsOpen, statsPage, statsUser?.id]);

  useEffect(() => {
    if (ipGeoOpen && ipGeoUser) {
      void fetchAllGeo();
    }
  }, [ipGeoOpen, ipGeoUser?.id, geoProvider]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const planOptions = useMemo(
    () => plans.map(plan => ({ id: String(plan.id), label: plan.name })),
    [plans]
  );
  const statusOptions = useMemo(
    () => [
      { id: "0", label: "Active" },
      { id: "1", label: "Banned" }
    ],
    []
  );
  const geoProviderOptions = useMemo(
    () => geoProviders.map(provider => ({ id: provider.key, label: provider.name })),
    [geoProviders]
  );
  const ipGeoRows = useMemo(
    () => [
      ...(ipGeoUser?.recent_ip_records || []),
      ...(ipGeoUser?.recent_login_ip_records || [])
    ],
    [ipGeoUser?.recent_ip_records, ipGeoUser?.recent_login_ip_records]
  );
  const selectedPlan = useMemo(() => form.plan_id || null, [form.plan_id]);
  const generatePlan = useMemo(() => generateForm.plan_id || null, [generateForm.plan_id]);
  const stats = useMemo(() => {
    const activeUsers = records.filter(record => !Number(record.banned || 0)).length;
    const adminUsers = records.filter(record => Number(record.is_admin || 0)).length;
    const totalBalance = records.reduce((sum, record) => sum + Number(record.balance || 0), 0) / 100;
    const totalTraffic = records.reduce((sum, record) => sum + Number(record.total_used || 0), 0);

    return [
      { label: "Current page", value: String(records.length), hint: `Page ${page} inventory` },
      { label: "Active users", value: String(activeUsers), hint: "Available accounts" },
      { label: "Admins", value: String(adminUsers), hint: "Privileged accounts" },
      { label: "Traffic used", value: formatBytes(totalTraffic), hint: `Balance ${formatMoney(totalBalance)}` }
    ];
  }, [page, records]);

  return (
    <PageFrame
      title="Users"
      description="The user workspace now handles search, editing, account generation, account safety actions, and account-level operational tasks in the new shell."
      onRefresh={() => void loadUsers(page)}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">User Directory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Search active accounts, review balance and plan state, and open actions from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button color="default" variant="light" onPress={() => void dumpCsv()} isLoading={submitting}>
              Export CSV
            </Button>
            <Button color="secondary" variant="light" onPress={() => setMailOpen(true)}>
              Mass mail
            </Button>
            <Button color="danger" variant="light" onPress={() => void bulkDelete()} isLoading={submitting}>
              Bulk delete
            </Button>
            <Button color="primary" onPress={() => setGenerateOpen(true)}>
              Generate users
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-5`}>
          <Accordion
            variant="splitted"
            showDivider={false}
            itemClasses={adminFilterAccordionItemClasses}
            className={adminFilterAccordionClassName}
          >
            <Accordion.Item id="filters">
              <Accordion.Heading>
                <Accordion.Trigger className="flex items-start justify-between gap-4">
                  <div>
                    <p>Filters</p>
                    <p className="mt-1 text-xs text-slate-400">Refine the current dataset quickly.</p>
                  </div>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <div className="grid gap-3 md:grid-cols-4">
                    <ModalField label="Email">
                      <Input
                        aria-label="Email"
                        placeholder="Search by email"
                        value={searchEmail}
                        onValueChange={setSearchEmail}
                      />
                    </ModalField>
                    <ModalField label="Plan">
                      <Select
                        aria-label="Plan"
                        placeholder="All plans"
                        items={planOptions}
                        selectedKey={planFilter || null}
                        onSelectionChange={key => setPlanFilter(String(key || ""))}
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
                    </ModalField>
                    <ModalField label="Status">
                      <Select
                        aria-label="Status"
                        placeholder="All users"
                        items={statusOptions}
                        selectedKey={bannedFilter || null}
                        onSelectionChange={key => setBannedFilter(String(key || ""))}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox items={statusOptions}>
                            {item => (
                              <ListBoxItem id={item.id} textValue={item.label}>
                                {item.label}
                              </ListBoxItem>
                            )}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </ModalField>
                    <div className="flex items-end gap-2">
                      <Button color="primary" onPress={() => { setPage(1); void loadUsers(1); }}>
                        Apply filters
                      </Button>
                      <Button
                        variant="flat"
                        onPress={() => {
                          setSearchEmail("");
                          setPlanFilter("");
                          setBannedFilter("");
                          setPage(1);
                          void loadUsers(1);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          {error ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="primary" label="Loading users" />
            </div>
          ) : (
            <>
              <Table aria-label="Users" classNames={adminTableClassNames}>
                <Table.Content>
                  <TableHeader>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Plan</TableColumn>
                    <TableColumn>Balance</TableColumn>
                    <TableColumn>Usage</TableColumn>
                    <TableColumn>Expires</TableColumn>
                    <TableColumn>Status</TableColumn>
                    <TableColumn align="end">Actions</TableColumn>
                  </TableHeader>
                  <TableBody items={records} emptyContent="No users found">
                    {item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{item.email}</p>
                            <p className="text-xs text-slate-500">ID {item.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.plan_name || "No plan"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatMoney((item.balance || 0) / 100)}</p>
                            <p className="text-xs text-slate-500">Commission {formatMoney((item.commission_balance || 0) / 100)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatBytes(item.total_used || 0)} used</p>
                            <p className="text-xs text-slate-500">Cap {formatBytes(item.transfer_enable || 0)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(item.expired_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Chip color={Number(item.banned || 0) ? "danger" : "success"} variant="flat">
                              {Number(item.banned || 0) ? "Banned" : "Active"}
                            </Chip>
                            {Number(item.is_admin || 0) ? <Chip variant="flat">Admin</Chip> : null}
                            {Number(item.is_staff || 0) ? <Chip variant="flat">Staff</Chip> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  color="primary"
                                  variant="light"
                                  isIconOnly
                                  radius="full"
                                  aria-label={`Edit ${item.email}`}
                                  onPress={() => void openEditor(item)}
                                  isLoading={submitting}
                                >
                                  <PencilToLine width={16} height={16} aria-hidden="true" />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>Edit user<Tooltip.Arrow /></Tooltip.Content>
                            </Tooltip>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  color="secondary"
                                  variant="light"
                                  isIconOnly
                                  radius="full"
                                  aria-label={`Reset secret for ${item.email}`}
                                  onPress={() => void runRowAction("user/resetSecret", { id: item.id })}
                                  isLoading={submitting}
                                >
                                  <Key width={16} height={16} aria-hidden="true" />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>Reset key<Tooltip.Arrow /></Tooltip.Content>
                            </Tooltip>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  color="primary"
                                  variant="light"
                                  isIconOnly
                                  radius="full"
                                  aria-label={`View traffic for ${item.email}`}
                                  onPress={() => void openTrafficStats(item)}
                                  isLoading={submitting}
                                >
                                  <SquareChartBar width={16} height={16} aria-hidden="true" />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>Traffic stats<Tooltip.Arrow /></Tooltip.Content>
                            </Tooltip>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  color="secondary"
                                  variant="light"
                                  isIconOnly
                                  radius="full"
                                  aria-label={`View IP geography for ${item.email}`}
                                  onPress={() => void openIpGeo(item)}
                                  isLoading={submitting}
                                >
                                  <Globe width={16} height={16} aria-hidden="true" />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>IP geo<Tooltip.Arrow /></Tooltip.Content>
                            </Tooltip>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  isIconOnly
                                  radius="full"
                                  aria-label={Number(item.banned || 0) ? `Unban ${item.email}` : `Ban ${item.email}`}
                                  onPress={() => void runRowAction("user/ban", { filter: [{ key: "id", condition: "=", value: item.id }] })}
                                  isLoading={submitting}
                                >
                                  {Number(item.banned || 0) ? (
                                    <LockOpen width={16} height={16} aria-hidden="true" />
                                  ) : (
                                    <Ban width={16} height={16} aria-hidden="true" />
                                  )}
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{Number(item.banned || 0) ? "Unban user" : "Ban user"}<Tooltip.Arrow /></Tooltip.Content>
                            </Tooltip>
                            <Tooltip>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  isIconOnly
                                  radius="full"
                                  aria-label={`Delete ${item.email}`}
                                  onPress={() => void runRowAction("user/delUser", { id: item.id })}
                                  isLoading={submitting}
                                >
                                  <TrashBin width={16} height={16} aria-hidden="true" />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>Delete user<Tooltip.Arrow /></Tooltip.Content>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table.Content>
              </Table>

              <div className="flex justify-center">
                <Pagination page={page} total={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Edit user</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 md:grid-cols-2">
                <ModalField label="Email">
                  <Input aria-label="Email" value={form.email} onValueChange={value => setForm(current => ({ ...current, email: value }))} />
                </ModalField>
                <ModalField label="New Password">
                  <Input aria-label="New Password" type="password" value={form.password} onValueChange={value => setForm(current => ({ ...current, password: value }))} />
                </ModalField>
                <ModalField label="Plan">
                  <Select
                    aria-label="Plan"
                    items={planOptions}
                    selectedKey={selectedPlan}
                    onSelectionChange={key =>
                      setForm(current => ({ ...current, plan_id: String(key || "") }))
                    }
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
                </ModalField>
                <ModalField label="Transfer (GB)">
                  <Input aria-label="Transfer (GB)" type="number" value={form.transfer_enable} onValueChange={value => setForm(current => ({ ...current, transfer_enable: value }))} />
                </ModalField>
                <ModalField label="Device Limit">
                  <Input aria-label="Device Limit" type="number" value={form.device_limit} onValueChange={value => setForm(current => ({ ...current, device_limit: value }))} />
                </ModalField>
                <ModalField label="Expire Timestamp">
                  <Input aria-label="Expire Timestamp" value={form.expired_at} onValueChange={value => setForm(current => ({ ...current, expired_at: value }))} />
                </ModalField>
                <ModalField label="Balance (cents)">
                  <Input aria-label="Balance (cents)" value={form.balance} onValueChange={value => setForm(current => ({ ...current, balance: value }))} />
                </ModalField>
                <ModalField label="Commission Balance (cents)">
                  <Input aria-label="Commission Balance (cents)" value={form.commission_balance} onValueChange={value => setForm(current => ({ ...current, commission_balance: value }))} />
                </ModalField>
                <ModalField label="Commission Rate">
                  <Input aria-label="Commission Rate" type="number" value={form.commission_rate} onValueChange={value => setForm(current => ({ ...current, commission_rate: value }))} />
                </ModalField>
                <ModalField label="Discount">
                  <Input aria-label="Discount" type="number" value={form.discount} onValueChange={value => setForm(current => ({ ...current, discount: value }))} />
                </ModalField>
                <ModalField label="Speed Limit">
                  <Input aria-label="Speed Limit" type="number" value={form.speed_limit} onValueChange={value => setForm(current => ({ ...current, speed_limit: value }))} />
                </ModalField>
                <ModalField label="Invite User Email">
                  <Input aria-label="Invite User Email" value={form.invite_user_email} onValueChange={value => setForm(current => ({ ...current, invite_user_email: value }))} />
                </ModalField>
                <ModalField label="Remarks" className="md:col-span-2">
                  <TextArea aria-label="Remarks" minRows={4} value={form.remarks} onValueChange={value => setForm(current => ({ ...current, remarks: value }))} />
                </ModalField>
                <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                    <p className="mb-3 text-sm font-semibold">Banned</p>
                    <Switch isSelected={form.banned} onValueChange={value => setForm(current => ({ ...current, banned: value }))} />
                  </div>
                  <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                    <p className="mb-3 text-sm font-semibold">Admin</p>
                    <Switch isSelected={form.is_admin} onValueChange={value => setForm(current => ({ ...current, is_admin: value }))} />
                  </div>
                  <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
                    <p className="mb-3 text-sm font-semibold">Staff</p>
                    <Switch isSelected={form.is_staff} onValueChange={value => setForm(current => ({ ...current, is_staff: value }))} />
                  </div>
                </div>
                {selected ? (
                  <div className="md:col-span-2 rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
                    <p>Subscription URL</p>
                    <p className="mt-2 break-all text-slate-900">{selected.subscribe_url || "Unavailable"}</p>
                    <p className="mt-4">Recent online IPs: {(selected.recent_ips || []).join(", ") || "—"}</p>
                    <p className="mt-2">Recent login IPs: {(selected.recent_login_ips || []).join(", ") || "—"}</p>
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => void submitUserUpdate()} isLoading={submitting}>
                  Save user
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={generateOpen} onOpenChange={isOpen => !isOpen && setGenerateOpen(false)} size="3xl">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Generate users</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 md:grid-cols-2">
                <ModalField label="Email Prefix">
                  <Input aria-label="Email Prefix" value={generateForm.email_prefix} onValueChange={value => setGenerateForm(current => ({ ...current, email_prefix: value }))} />
                </ModalField>
                <ModalField label="Email Suffix">
                  <Input aria-label="Email Suffix" value={generateForm.email_suffix} onValueChange={value => setGenerateForm(current => ({ ...current, email_suffix: value }))} />
                </ModalField>
                <ModalField label="Password">
                  <Input aria-label="Password" type="password" value={generateForm.password} onValueChange={value => setGenerateForm(current => ({ ...current, password: value }))} />
                </ModalField>
                <ModalField label="Generate Count">
                  <Input aria-label="Generate Count" type="number" value={generateForm.generate_count} onValueChange={value => setGenerateForm(current => ({ ...current, generate_count: value }))} />
                </ModalField>
                <ModalField label="Plan">
                  <Select
                    aria-label="Plan"
                    items={planOptions}
                    selectedKey={generatePlan}
                    onSelectionChange={key =>
                      setGenerateForm(current => ({ ...current, plan_id: String(key || "") }))
                    }
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
                </ModalField>
                <ModalField label="Expire Timestamp">
                  <Input aria-label="Expire Timestamp" value={generateForm.expired_at} onValueChange={value => setGenerateForm(current => ({ ...current, expired_at: value }))} />
                </ModalField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setGenerateOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => void submitGenerate()} isLoading={submitting}>
                  Generate
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={mailOpen} onOpenChange={isOpen => !isOpen && setMailOpen(false)} size="3xl">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Mass mail</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <ModalField label="Subject">
                  <Input aria-label="Subject" value={mailForm.subject} onValueChange={value => setMailForm(current => ({ ...current, subject: value }))} />
                </ModalField>
                <ModalField label="Content">
                  <TextArea aria-label="Content" minRows={8} value={mailForm.content} onValueChange={value => setMailForm(current => ({ ...current, content: value }))} />
                </ModalField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setMailOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => void sendMail()} isLoading={submitting}>
                  Queue email
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={statsOpen} onOpenChange={isOpen => !isOpen && setStatsOpen(false)} size="5xl" scrollBehavior="inside">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Traffic logs for {statsUser?.email || "user"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <Table classNames={adminTableClassNames}>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="User traffic logs">
                      <Table.Header>
                        <Table.Column id="date">Date</Table.Column>
                        <Table.Column id="upload">Upload</Table.Column>
                        <Table.Column id="download">Download</Table.Column>
                        <Table.Column id="rate">Rate</Table.Column>
                      </Table.Header>
                      <Table.Body items={statsRecords} renderEmptyState={() => "No traffic records found"}>
                        {item => (
                          <Table.Row id={`${item.record_at}-${item.id || 0}`}>
                            <Table.Cell>{formatDateTime(item.record_at)}</Table.Cell>
                            <Table.Cell>{formatBytes(item.u || 0)}</Table.Cell>
                            <Table.Cell>{formatBytes(item.d || 0)}</Table.Cell>
                            <Table.Cell>{item.server_rate || 1}</Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                <div className="flex justify-center">
                  <Pagination
                    page={statsPage}
                    total={Math.max(1, Math.ceil(statsTotal / PAGE_SIZE))}
                    onChange={setStatsPage}
                  />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setStatsOpen(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={ipGeoOpen} onOpenChange={isOpen => !isOpen && setIpGeoOpen(false)} size="5xl" scrollBehavior="inside">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>IP geography for {ipGeoUser?.email || "user"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="gap-4">
                <div className="flex flex-wrap items-end gap-3">
                  <ModalField label="Provider" className="w-full max-w-xs">
                    <Select
                      aria-label="Provider"
                      className="max-w-xs"
                      items={geoProviderOptions}
                      selectedKey={geoProvider}
                      onSelectionChange={key => setGeoProvider(String(key || "ipinfo"))}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox items={geoProviderOptions}>
                          {item => (
                            <ListBoxItem id={item.id} textValue={item.label}>
                              {item.label}
                            </ListBoxItem>
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </ModalField>
                  <Button color="primary" variant="light" onPress={() => void fetchAllGeo()}>
                    Refresh geo
                  </Button>
                </div>

                <Table classNames={adminTableClassNames}>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="IP geo records">
                      <Table.Header>
                        <Table.Column id="ip">IP</Table.Column>
                        <Table.Column id="lastSeen">Last Seen</Table.Column>
                        <Table.Column id="status">Status</Table.Column>
                        <Table.Column id="country">Country</Table.Column>
                        <Table.Column id="city">City</Table.Column>
                        <Table.Column id="isp">ISP</Table.Column>
                        <Table.Column id="organization">Organization</Table.Column>
                      </Table.Header>
                      <Table.Body items={ipGeoRows} renderEmptyState={() => "No IP records found"}>
                        {item => {
                          const geo = geoRecords[item.ip];
                          const loadingState = geoLoading[item.ip];
                          const failed = geo?.status === "failed";

                          return (
                            <Table.Row id={`${item.ip}-${item.last_seen_at}`}>
                              <Table.Cell>{item.ip}</Table.Cell>
                              <Table.Cell>{formatDateTime(item.last_seen_at)}</Table.Cell>
                              <Table.Cell>
                                <Chip variant="flat" color={loadingState ? "secondary" : failed ? "danger" : "success"}>
                                  {loadingState ? "Loading" : failed ? "Failed" : "Resolved"}
                                </Chip>
                              </Table.Cell>
                              <Table.Cell>{loadingState ? "Loading..." : failed ? "Failed" : geo?.country || "—"}</Table.Cell>
                              <Table.Cell>{loadingState ? "Loading..." : failed ? "Failed" : geo?.city || "—"}</Table.Cell>
                              <Table.Cell>{loadingState ? "Loading..." : failed ? "Failed" : geo?.isp || "—"}</Table.Cell>
                              <Table.Cell>{loadingState ? "Loading..." : failed ? "Failed" : geo?.organization || "—"}</Table.Cell>
                            </Table.Row>
                          );
                        }}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setIpGeoOpen(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
