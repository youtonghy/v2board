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
import { formatDateTime } from "../lib/admin-format";

interface InviteLinkRecord {
  id: number;
  user_id: number;
  user_email?: string;
  link_url: string;
  invitee_name?: string | null;
  content?: string | null;
  status: number;
  status_text: string;
  visit_count: number;
  use_count: number;
  max_use: number;
  expired_at: number;
  created_at: string;
}

interface PlanUser {
  id: number;
  email: string;
}

const PAGE_SIZE = 10;

export function InviteLinkPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [records, setRecords] = useState<InviteLinkRecord[]>([]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateUserId, setGenerateUserId] = useState("");
  const [inviteeName, setInviteeName] = useState("");
  const [content, setContent] = useState("");
  const [maxUse, setMaxUse] = useState("1");
  const [expireHours, setExpireHours] = useState("72");
  const [userOptions, setUserOptions] = useState<PlanUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadLinks(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const [linkEnvelope, userEnvelope] = await Promise.all([
        adminRequest<InviteLinkRecord[]>("user/inviteLink/fetch", {
          query: {
            current: nextPage,
            page_size: PAGE_SIZE,
            user_email: email || undefined,
            keyword: keyword || undefined,
            status: status || undefined
          }
        }),
        adminRequest<PlanUser[]>("user/fetch", {
          query: {
            current: 1,
            pageSize: 20
          }
        })
      ]);

      setRecords(unwrapEnvelope(linkEnvelope));
      setTotal(Number(linkEnvelope.total || 0));
      setUserOptions(unwrapEnvelope(userEnvelope).map(user => ({ id: user.id, email: user.email })));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load invite links");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function generateInviteLink() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("user/generateInviteCode", {
          method: "POST",
          body: {
            user_id: Number(generateUserId),
            invitee_name: inviteeName || undefined,
            content: content || undefined,
            max_use: Number(maxUse || 1),
            expire_hours: Number(expireHours || 72)
          }
        })
      );
      setGenerateOpen(false);
      await loadLinks(1);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(record: InviteLinkRecord, nextStatus: number) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("user/inviteLink/updateStatus", {
          method: "POST",
          body: {
            id: record.id,
            status: nextStatus
          }
        })
      );
      await loadLinks(page);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadLinks(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedUser = useMemo(
    () => (generateUserId ? new Set([generateUserId]) : new Set<string>()),
    [generateUserId]
  );

  return (
    <PageFrame
      title="Invite Links"
      description="Invite links now have a dedicated workspace for search, status control, and direct generation from a selected account."
      legacyPath="/invite-link"
      onRefresh={() => void loadLinks(page)}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Invite Link Inventory</p>
            <p className="text-sm text-slate-500">Track issued links, see who they belong to, and disable invalid links without leaving the new panel.</p>
          </div>
          <Button color="primary" onPress={() => setGenerateOpen(true)}>
            Generate invite link
          </Button>
        </CardHeader>
        <CardBody className="gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Input label="User Email" labelPlacement="outside" value={email} onValueChange={setEmail} />
            <Input label="Keyword" labelPlacement="outside" value={keyword} onValueChange={setKeyword} />
            <Select
              label="Status"
              labelPlacement="outside"
              placeholder="All statuses"
              selectedKeys={status ? new Set([status]) : new Set<string>()}
              onSelectionChange={keys => setStatus(String(Array.from(keys)[0] || ""))}
            >
              <SelectItem key="0">Active</SelectItem>
              <SelectItem key="1">Used Up</SelectItem>
              <SelectItem key="2">Expired</SelectItem>
              <SelectItem key="3">Disabled</SelectItem>
            </Select>
            <div className="flex items-end gap-2">
              <Button color="primary" onPress={() => { setPage(1); void loadLinks(1); }}>
                Apply
              </Button>
              <Button
                variant="flat"
                onPress={() => {
                  setEmail("");
                  setKeyword("");
                  setStatus("");
                  setPage(1);
                  void loadLinks(1);
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="warning" label="Loading invite links" />
            </div>
          ) : (
            <>
              <Table removeWrapper aria-label="Invite Links">
                <TableHeader>
                  <TableColumn>Owner</TableColumn>
                  <TableColumn>Invitee</TableColumn>
                  <TableColumn>Usage</TableColumn>
                  <TableColumn>Expires</TableColumn>
                  <TableColumn>Status</TableColumn>
                  <TableColumn align="end">Actions</TableColumn>
                </TableHeader>
                <TableBody items={records} emptyContent="No invite links found">
                  {item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{item.user_email || `User #${item.user_id}`}</p>
                          <p className="max-w-[320px] truncate text-xs text-slate-500">{item.link_url}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p>{item.invitee_name || "Unnamed"}</p>
                        <p className="text-xs text-slate-500">{item.content || "No note"}</p>
                      </TableCell>
                      <TableCell>{item.use_count} / {item.max_use} used</TableCell>
                      <TableCell>
                        <div>
                          <p>{formatDateTime(item.expired_at)}</p>
                          <p className="text-xs text-slate-500">{item.visit_count} visits</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip color={item.status === 0 ? "success" : item.status === 3 ? "warning" : "default"} variant="flat">
                          {item.status_text}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.status === 3 ? (
                            <Button size="sm" variant="flat" onPress={() => void updateStatus(item, 0)} isLoading={submitting}>
                              Enable
                            </Button>
                          ) : (
                            <Button size="sm" color="warning" variant="flat" onPress={() => void updateStatus(item, 3)} isLoading={submitting}>
                              Disable
                            </Button>
                          )}
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

      <Modal isOpen={generateOpen} onOpenChange={isOpen => !isOpen && setGenerateOpen(false)} size="3xl">
        <ModalContent>
          <ModalHeader>Generate invite link</ModalHeader>
          <ModalBody className="grid gap-4 md:grid-cols-2">
            <Select
              label="Owner"
              labelPlacement="outside"
              selectedKeys={selectedUser}
              onSelectionChange={keys => setGenerateUserId(String(Array.from(keys)[0] || ""))}
            >
              {userOptions.map(user => (
                <SelectItem key={String(user.id)}>{user.email}</SelectItem>
              ))}
            </Select>
            <Input label="Invitee Name" labelPlacement="outside" value={inviteeName} onValueChange={setInviteeName} />
            <Input label="Max Use" labelPlacement="outside" type="number" value={maxUse} onValueChange={setMaxUse} />
            <Input label="Expire Hours" labelPlacement="outside" type="number" value={expireHours} onValueChange={setExpireHours} />
            <Textarea className="md:col-span-2" label="Content" labelPlacement="outside" minRows={4} value={content} onValueChange={setContent} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void generateInviteLink()} isLoading={submitting}>
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
