import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
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
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { formatBytes, formatDateTime, formatMoney } from "../lib/admin-format";

interface PlanRecord {
  id: number;
  name: string;
}

interface UserRecord {
  id: number;
  email: string;
  balance?: number;
  commission_balance?: number;
  plan_id?: number | null;
  plan_name?: string;
  transfer_enable?: number;
  total_used?: number;
  device_limit?: number | null;
  expired_at?: number | null;
  banned?: number;
  is_admin?: number;
  is_staff?: number;
  subscribe_url?: string;
  remarks?: string | null;
  recent_ips?: string[];
  recent_login_ips?: string[];
  alive_ip?: number;
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
    device_limit: "",
    expired_at: record?.expired_at ? String(record.expired_at) : "",
    balance: record?.balance ? String(record.balance) : "0",
    commission_balance: record?.commission_balance ? String(record.commission_balance) : "0",
    commission_rate: "",
    discount: "",
    speed_limit: "",
    remarks: record?.remarks || "",
    invite_user_email: "",
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyUserForm());
  const [generateForm, setGenerateForm] = useState<GenerateFormState>(defaultGenerateForm());
  const [mailForm, setMailForm] = useState<MailFormState>({ subject: "", content: "" });
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

  useEffect(() => {
    void loadUsers(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedPlan = useMemo(
    () => (form.plan_id ? new Set([form.plan_id]) : new Set<string>()),
    [form.plan_id]
  );
  const generatePlan = useMemo(
    () => (generateForm.plan_id ? new Set([generateForm.plan_id]) : new Set<string>()),
    [generateForm.plan_id]
  );

  return (
    <PageFrame
      title="Users"
      description="The user workspace now handles search, editing, account generation, account safety actions, and account-level operational tasks in the new shell."
      legacyPath="/user"
      onRefresh={() => void loadUsers(page)}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">User Directory</p>
            <p className="text-sm text-slate-500">Search active accounts, review balance and plan state, and open actions from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="flat" onPress={() => setMailOpen(true)}>
              Mass mail
            </Button>
            <Button color="primary" onPress={() => setGenerateOpen(true)}>
              Generate users
            </Button>
          </div>
        </CardHeader>
        <CardBody className="gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              label="Email"
              labelPlacement="outside"
              placeholder="Search by email"
              value={searchEmail}
              onValueChange={setSearchEmail}
            />
            <Select
              label="Plan"
              labelPlacement="outside"
              placeholder="All plans"
              selectedKeys={planFilter ? new Set([planFilter]) : new Set<string>()}
              onSelectionChange={keys => setPlanFilter(String(Array.from(keys)[0] || ""))}
            >
              {plans.map(plan => (
                <SelectItem key={String(plan.id)}>{plan.name}</SelectItem>
              ))}
            </Select>
            <Select
              label="Status"
              labelPlacement="outside"
              placeholder="All users"
              selectedKeys={bannedFilter ? new Set([bannedFilter]) : new Set<string>()}
              onSelectionChange={keys => setBannedFilter(String(Array.from(keys)[0] || ""))}
            >
              <SelectItem key="0">Active</SelectItem>
              <SelectItem key="1">Banned</SelectItem>
            </Select>
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

          {error ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="warning" label="Loading users" />
            </div>
          ) : (
            <>
              <Table removeWrapper aria-label="Users">
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
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => {
                              setSelected(item);
                              setForm(emptyUserForm(item));
                              setEditorOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => void runRowAction("user/resetSecret", { id: item.id })}
                            isLoading={submitting}
                          >
                            Reset key
                          </Button>
                          <Button
                            size="sm"
                            color={Number(item.banned || 0) ? "success" : "warning"}
                            variant="flat"
                            onPress={() => void runRowAction("user/ban", { filter: [{ key: "id", condition: "=", value: item.id }] })}
                            isLoading={submitting}
                          >
                            {Number(item.banned || 0) ? "Ban selected" : "Ban"}
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() => void runRowAction("user/delUser", { id: item.id })}
                            isLoading={submitting}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex justify-center">
                <Pagination page={page} total={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Edit user</ModalHeader>
          <ModalBody className="grid gap-4 md:grid-cols-2">
            <Input label="Email" labelPlacement="outside" value={form.email} onValueChange={value => setForm(current => ({ ...current, email: value }))} />
            <Input label="New Password" labelPlacement="outside" type="password" value={form.password} onValueChange={value => setForm(current => ({ ...current, password: value }))} />
            <Select
              label="Plan"
              labelPlacement="outside"
              selectedKeys={selectedPlan}
              onSelectionChange={keys => setForm(current => ({ ...current, plan_id: String(Array.from(keys)[0] || "") }))}
            >
              {plans.map(plan => (
                <SelectItem key={String(plan.id)}>{plan.name}</SelectItem>
              ))}
            </Select>
            <Input label="Transfer (GB)" labelPlacement="outside" type="number" value={form.transfer_enable} onValueChange={value => setForm(current => ({ ...current, transfer_enable: value }))} />
            <Input label="Device Limit" labelPlacement="outside" type="number" value={form.device_limit} onValueChange={value => setForm(current => ({ ...current, device_limit: value }))} />
            <Input label="Expire Timestamp" labelPlacement="outside" value={form.expired_at} onValueChange={value => setForm(current => ({ ...current, expired_at: value }))} />
            <Input label="Balance (cents)" labelPlacement="outside" value={form.balance} onValueChange={value => setForm(current => ({ ...current, balance: value }))} />
            <Input label="Commission Balance (cents)" labelPlacement="outside" value={form.commission_balance} onValueChange={value => setForm(current => ({ ...current, commission_balance: value }))} />
            <Input label="Commission Rate" labelPlacement="outside" type="number" value={form.commission_rate} onValueChange={value => setForm(current => ({ ...current, commission_rate: value }))} />
            <Input label="Discount" labelPlacement="outside" type="number" value={form.discount} onValueChange={value => setForm(current => ({ ...current, discount: value }))} />
            <Input label="Speed Limit" labelPlacement="outside" type="number" value={form.speed_limit} onValueChange={value => setForm(current => ({ ...current, speed_limit: value }))} />
            <Input label="Invite User Email" labelPlacement="outside" value={form.invite_user_email} onValueChange={value => setForm(current => ({ ...current, invite_user_email: value }))} />
            <Textarea className="md:col-span-2" label="Remarks" labelPlacement="outside" minRows={4} value={form.remarks} onValueChange={value => setForm(current => ({ ...current, remarks: value }))} />
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
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void submitUserUpdate()} isLoading={submitting}>
              Save user
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={generateOpen} onOpenChange={isOpen => !isOpen && setGenerateOpen(false)} size="3xl">
        <ModalContent>
          <ModalHeader>Generate users</ModalHeader>
          <ModalBody className="grid gap-4 md:grid-cols-2">
            <Input label="Email Prefix" labelPlacement="outside" value={generateForm.email_prefix} onValueChange={value => setGenerateForm(current => ({ ...current, email_prefix: value }))} />
            <Input label="Email Suffix" labelPlacement="outside" value={generateForm.email_suffix} onValueChange={value => setGenerateForm(current => ({ ...current, email_suffix: value }))} />
            <Input label="Password" labelPlacement="outside" type="password" value={generateForm.password} onValueChange={value => setGenerateForm(current => ({ ...current, password: value }))} />
            <Input label="Generate Count" labelPlacement="outside" type="number" value={generateForm.generate_count} onValueChange={value => setGenerateForm(current => ({ ...current, generate_count: value }))} />
            <Select
              label="Plan"
              labelPlacement="outside"
              selectedKeys={generatePlan}
              onSelectionChange={keys => setGenerateForm(current => ({ ...current, plan_id: String(Array.from(keys)[0] || "") }))}
            >
              {plans.map(plan => (
                <SelectItem key={String(plan.id)}>{plan.name}</SelectItem>
              ))}
            </Select>
            <Input label="Expire Timestamp" labelPlacement="outside" value={generateForm.expired_at} onValueChange={value => setGenerateForm(current => ({ ...current, expired_at: value }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void submitGenerate()} isLoading={submitting}>
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={mailOpen} onOpenChange={isOpen => !isOpen && setMailOpen(false)} size="3xl">
        <ModalContent>
          <ModalHeader>Mass mail</ModalHeader>
          <ModalBody className="gap-4">
            <Input label="Subject" labelPlacement="outside" value={mailForm.subject} onValueChange={value => setMailForm(current => ({ ...current, subject: value }))} />
            <Textarea label="Content" labelPlacement="outside" minRows={8} value={mailForm.content} onValueChange={value => setMailForm(current => ({ ...current, content: value }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setMailOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void sendMail()} isLoading={submitting}>
              Queue email
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
