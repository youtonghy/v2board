import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Form,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  Spinner,
  SearchField,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { AdminFilterAccordion } from "../components/AdminFilterAccordion";
import { AdminFilterActionGroup } from "../components/AdminFilterActionGroup";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSelectField } from "../components/AdminSelectField";
import { AdminSortableColumnHeader, useAdminTableSort } from "../components/AdminTable";
import { AdminTextField } from "../components/AdminTextField";
import { ModalField } from "../components/ModalField";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { formatDateTime } from "../lib/admin-format";
import {
  adminCardClassName,
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
  const inviteOwnerInvalid = !generateUserId;
  const { sortDescriptor, setSortDescriptor, sortedItems } = useAdminTableSort(
    records,
    { column: "expires", direction: "descending" },
    {
      owner: item => item.user_email || item.user_id,
      invitee: item => item.invitee_name || "",
      usage: item => Number(item.use_count || 0),
      expires: item => Number(item.expired_at || 0),
      status: item => item.status
    }
  );
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Invite Link Inventory</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Track issued links, see who they belong to, and disable invalid links without leaving the new panel.
            </p>
          </div>
          <Button variant="primary" onPress={() => setGenerateOpen(true)}>
            Generate invite link
          </Button>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-5`}>
          <AdminFilterAccordion>
            <Form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(220px,0.8fr)_auto]">
              <SearchField className="space-y-2" value={email} onChange={setEmail}>
                <Label>User Email</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input className="w-full" placeholder="Enter user email" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <SearchField className="space-y-2" value={keyword} onChange={setKeyword}>
                <Label>Keyword</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input className="w-full" placeholder="Enter keyword" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  className="w-full"
                  placeholder="Select a status"
                  selectedKey={status || null}
                  onSelectionChange={key => setStatus(String(key || ""))}
                >
                  <Select.Trigger className="h-9 w-full">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {[
                        { id: "0", label: "Active" },
                        { id: "1", label: "Used Up" },
                        { id: "2", label: "Expired" },
                        { id: "3", label: "Disabled" }
                      ].map(option => (
                        <ListBoxItem key={option.id} id={option.id} textValue={option.label}>
                          {option.label}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <div className="flex items-end justify-end">
                <AdminFilterActionGroup
                  isDisabled={loading}
                  onSearch={() => {
                    setPage(1);
                    void loadLinks(1);
                  }}
                  onReset={() => {
                    setEmail("");
                    setKeyword("");
                    setStatus("");
                    setPage(1);
                    void loadLinks(1);
                  }}
                />
              </div>
            </Form>
          </AdminFilterAccordion>

          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <Table variant="secondary" aria-label="Invite Links" className={adminTableClassNames.wrapper}>
                <Table.ScrollContainer>
                  <Table.Content sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}>
                  <TableHeader>
                    <TableColumn key="owner" allowsSorting>{({ sortDirection }) => <AdminSortableColumnHeader label="Owner" sortDirection={sortDirection} />}</TableColumn>
                    <TableColumn key="invitee" allowsSorting>{({ sortDirection }) => <AdminSortableColumnHeader label="Invitee" sortDirection={sortDirection} />}</TableColumn>
                    <TableColumn key="usage" allowsSorting>{({ sortDirection }) => <AdminSortableColumnHeader label="Usage" sortDirection={sortDirection} />}</TableColumn>
                    <TableColumn key="expires" allowsSorting>{({ sortDirection }) => <AdminSortableColumnHeader label="Expires" sortDirection={sortDirection} />}</TableColumn>
                    <TableColumn key="status" allowsSorting>{({ sortDirection }) => <AdminSortableColumnHeader label="Status" sortDirection={sortDirection} />}</TableColumn>
                    <TableColumn>Actions</TableColumn>
                  </TableHeader>
                  <TableBody items={sortedItems}>
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
                          <Chip color={item.status === 0 ? "success" : item.status === 3 ? "warning" : "default"} variant="soft" className="font-medium">
                            {item.status_text}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {item.status === 3 ? (
                              <Button size="sm" variant="ghost" onPress={() => void updateStatus(item, 0)} isDisabled={submitting}>
                                Enable
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onPress={() => void updateStatus(item, 3)} isDisabled={submitting}>
                                Disable
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table.Content>
                </Table.ScrollContainer>
              </Table>

              <div className="flex justify-center">
                <AdminPagination page={page} total={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminDrawer
        isOpen={generateOpen}
        onOpenChange={isOpen => !isOpen && setGenerateOpen(false)}
        title="Generate invite link"
        isBusy={submitting}
        footer={
          <>
            <Button variant="ghost" onPress={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => void generateInviteLink()} isDisabled={submitting || inviteOwnerInvalid}>
              Generate
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (inviteOwnerInvalid) return;
            void generateInviteLink();
          }}
        >
          <ModalField label="Owner" required>
            <AdminSelectField
              ariaLabel="Owner"
              options={userOptions.map(user => ({ id: String(user.id), label: user.email }))}
              selectedKey={selectedUser}
              onSelectionChange={key => setGenerateUserId(String(key || ""))}
            />
          </ModalField>
          <AdminTextField
            label="Invitee Name"
            value={inviteeName}
            onChange={event => setInviteeName(event.target.value)}
          />
          <AdminTextField
            label="Max Use"
            type="number"
            value={maxUse}
            onChange={event => setMaxUse(event.target.value)}
          />
          <AdminTextField
            label="Expire Hours"
            type="number"
            value={expireHours}
            onChange={event => setExpireHours(event.target.value)}
          />
          <AdminTextField
            label="Content"
            className="md:col-span-2"
            multiline
            rows={4}
            value={content}
            onChange={event => setContent(event.target.value)}
          />
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
