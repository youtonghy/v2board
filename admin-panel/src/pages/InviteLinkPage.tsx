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
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  TextArea
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { ModalField } from "../components/ModalField";
import { PageFrame } from "../components/PageFrame";
import { formatDateTime } from "../lib/admin-format";
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
  const selectedUser = useMemo(() => generateUserId || null, [generateUserId]);
  const stats = useMemo(() => {
    const active = records.filter(record => record.status === 0).length;
    const disabled = records.filter(record => record.status === 3).length;
    const totalVisits = records.reduce((sum, record) => sum + Number(record.visit_count || 0), 0);
    const totalUses = records.reduce((sum, record) => sum + Number(record.use_count || 0), 0);

    return [
      { label: "Visible page", value: String(records.length), hint: `Page ${page} inventory` },
      { label: "Active links", value: String(active), hint: "Ready for sharing" },
      { label: "Disabled", value: String(disabled), hint: "Manually paused links" },
      { label: "Visits / uses", value: `${totalVisits} / ${totalUses}`, hint: "Current page engagement" }
    ];
  }, [page, records]);

  return (
    <PageFrame
      title="Invite Links"
      description="Invite links now have a dedicated workspace for search, status control, and direct generation from a selected account."
      onRefresh={() => void loadLinks(page)}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Invite Link Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Track issued links, see who they belong to, and disable invalid links without leaving the new panel.
            </p>
          </div>
          <Button color="primary" radius="full" onPress={() => setGenerateOpen(true)}>
            Generate invite link
          </Button>
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
            <Input label="User Email" labelPlacement="outside" value={email} onValueChange={setEmail} />
            <Input label="Keyword" labelPlacement="outside" value={keyword} onValueChange={setKeyword} />
            <Select
              label="Status"
              labelPlacement="outside"
              placeholder="All statuses"
              items={[
                { id: "0", label: "Active" },
                { id: "1", label: "Used Up" },
                { id: "2", label: "Expired" },
                { id: "3", label: "Disabled" }
              ]}
              selectedKey={status || null}
              onSelectionChange={key => setStatus(String(key || ""))}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={[
                  { id: "0", label: "Active" },
                  { id: "1", label: "Used Up" },
                  { id: "2", label: "Expired" },
                  { id: "3", label: "Disabled" }
                ]}>
                  {item => (
                    <ListBoxItem id={item.id} textValue={item.label}>
                      {item.label}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Select.Popover>
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
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="primary" label="Loading invite links" />
            </div>
          ) : (
            <>
              <Table aria-label="Invite Links" classNames={adminTableClassNames}>
                <Table.Content>
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
                          <Chip color={item.status === 0 ? "success" : item.status === 3 ? "warning" : "default"} variant="flat" className="font-medium">
                            {item.status_text}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {item.status === 3 ? (
                              <Button size="sm" color="success" variant="light" onPress={() => void updateStatus(item, 0)} isLoading={submitting}>
                                Enable
                              </Button>
                            ) : (
                              <Button size="sm" color="warning" variant="light" onPress={() => void updateStatus(item, 3)} isLoading={submitting}>
                                Disable
                              </Button>
                            )}
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

      <Modal isOpen={generateOpen} onOpenChange={isOpen => !isOpen && setGenerateOpen(false)} size="3xl">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Generate invite link</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 md:grid-cols-2">
                <ModalField label="Owner">
                  <Select aria-label="Owner" items={userOptions.map(user => ({ id: String(user.id), label: user.email }))} selectedKey={selectedUser} onSelectionChange={key => setGenerateUserId(String(key || ""))}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover><ListBox items={userOptions.map(user => ({ id: String(user.id), label: user.email }))}>{item => <ListBoxItem id={item.id} textValue={item.label}>{item.label}</ListBoxItem>}</ListBox></Select.Popover>
                  </Select>
                </ModalField>
                <ModalField label="Invitee Name"><Input aria-label="Invitee Name" value={inviteeName} onValueChange={setInviteeName} /></ModalField>
                <ModalField label="Max Use"><Input aria-label="Max Use" type="number" value={maxUse} onValueChange={setMaxUse} /></ModalField>
                <ModalField label="Expire Hours"><Input aria-label="Expire Hours" type="number" value={expireHours} onValueChange={setExpireHours} /></ModalField>
                <ModalField label="Content" className="md:col-span-2"><TextArea aria-label="Content" minRows={4} value={content} onValueChange={setContent} /></ModalField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setGenerateOpen(false)}>Cancel</Button>
                <Button color="primary" onPress={() => void generateInviteLink()} isLoading={submitting}>Generate</Button>
              </Modal.Footer>
        </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
