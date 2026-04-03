import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Checkbox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { PencilToLine, TrashBin } from "@gravity-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminTextField } from "../components/AdminTextField";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { adminRequest } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";
import { formatDateTime } from "../lib/admin-format";

interface NoticeRecord {
  id?: number;
  title?: string;
  content?: string;
  img_url?: string | null;
  tags?: string[] | null;
  show?: number | boolean;
  created_at?: number;
}

function normalizeNotice(record?: NoticeRecord | null): NoticeRecord {
  return {
    title: "",
    content: "",
    img_url: "",
    tags: [],
    show: 1,
    ...record
  };
}

export function NoticePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<NoticeRecord[]>([]);
  const [selected, setSelected] = useState<NoticeRecord | null>(null);
  const [open, setOpen] = useState(false);

  async function loadNotices() {
    setLoading(true);
    const response = await adminRequest<NoticeRecord[]>("notice/fetch");
    setRecords(response.data || []);
    setLoading(false);
  }

  async function saveNotice() {
    if (!selected) return;
    setSaving(true);
    try {
      await adminRequest("notice/save", {
        method: "POST",
        body: {
          ...selected,
          tags: selected.tags && selected.tags.length ? selected.tags : null
        }
      });
      setOpen(false);
      await loadNotices();
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotice(record: NoticeRecord) {
    if (!record.id) return;
    await adminRequest("notice/show", {
      method: "POST",
      body: { id: record.id }
    });
    await loadNotices();
  }

  async function dropNotice(record: NoticeRecord) {
    await adminRequest("notice/drop", {
      method: "POST",
      body: { id: record.id }
    });
    await loadNotices();
  }

  useEffect(() => {
    void loadNotices();
  }, []);

  const stats = useMemo(() => {
    const visible = records.filter(record => Boolean(Number(record.show ?? 0))).length;
    const tagged = records.filter(record => (record.tags || []).length > 0).length;
    const withImages = records.filter(record => Boolean(record.img_url)).length;

    return [
      { label: "Total notices", value: String(records.length), hint: "Current published inventory" },
      { label: "Visible", value: String(visible), hint: "Enabled for the frontend" },
      { label: "Tagged", value: String(tagged), hint: "Notices with topic labels" },
      { label: "With image", value: String(withImages), hint: "Visual announcements ready" }
    ];
  }, [records]);
  const titleInvalid = !String(selected?.title || "").trim();
  const contentInvalid = !String(selected?.content || "").trim();

  return (
    <PageFrame
      title="Notices"
      description="Announcements are now managed in a dedicated HeroUI table and modal instead of the generic data snapshot. Visibility toggles and save contracts stay aligned with the current backend."
      onRefresh={() => void loadNotices()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Announcement Feed</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Edit title, content, tags, image URL, and visibility without leaving the new shell.
            </p>
          </div>
          <Button
            variant="primary"
           
            onPress={() => {
              setSelected(normalizeNotice());
              setOpen(true);
            }}
          >
            Add notice
          </Button>
        </CardHeader>
        <CardContent className={adminSectionBodyClassName}>
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <Table variant="secondary" aria-label="Notices" className={adminTableClassNames.wrapper}>
            <Table.ScrollContainer>
            <Table.Content>
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Visible</TableColumn>
                <TableColumn>Title</TableColumn>
                <TableColumn>Tags</TableColumn>
                <TableColumn>Created</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody items={records}>
                {item => (
                  <TableRow key={String(item.id ?? "") }>
                    <TableCell>{item.id ?? "—"}</TableCell>
                    <TableCell>
                      <Checkbox
                        aria-label={`Toggle notice ${item.title || item.id || ""}`}
                        isSelected={Boolean(Number(item.show ?? 0))}
                        onChange={() => void toggleNotice(item)}
                      >
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{item.title || "Untitled"}</p>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">{item.content || "No content preview"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(item.tags || []).map(tag => (
                          <Chip key={tag} size="sm" variant="soft" className="bg-sky-50 text-sky-700">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          isIconOnly
                          aria-label={`Edit notice ${item.title || item.id || ""}`}
                          onPress={() => {
                            setSelected(normalizeNotice(item));
                            setOpen(true);
                          }}
                        >
                          <PencilToLine width={16} height={16} aria-hidden="true" />
                        </Button>
                        <DangerConfirmButton
                          size="sm"
                          isIconOnly
                          aria-label={`Delete notice ${item.title || item.id || ""}`}
                          title={`Delete notice ${item.title || item.id || ""}?`}
                          description="This will permanently remove the notice."
                          confirmLabel="Delete notice"
                          onConfirm={() => void dropNotice(item)}
                        >
                          <TrashBin width={16} height={16} aria-hidden="true" />
                        </DangerConfirmButton>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
        </CardContent>
      </Card>

      <AdminDrawer
        isOpen={open}
        onOpenChange={isOpen => !isOpen && setOpen(false)}
        title={selected?.id ? "Edit notice" : "Create notice"}
        isBusy={saving}
        footer={
          <>
            <Button variant="ghost" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => void saveNotice()} isDisabled={saving || titleInvalid || contentInvalid}>
              Save notice
            </Button>
          </>
        }
      >
        <form
          className="space-y-5"
          onSubmit={event => {
            event.preventDefault();
            if (titleInvalid || contentInvalid) return;
            void saveNotice();
          }}
        >
          <AdminTextField
            label="Title"
            value={selected?.title || ""}
            onChange={event => setSelected(current => (current ? { ...current, title: event.target.value } : current))}
            isRequired
            isInvalid={titleInvalid}
            errorMessage="Title is required."
          />
          <AdminTextField
            label="Content"
            multiline
            rows={10}
            value={selected?.content || ""}
            onChange={event => setSelected(current => (current ? { ...current, content: event.target.value } : current))}
            isRequired
            isInvalid={contentInvalid}
            errorMessage="Content is required."
          />
          <AdminTextField
            label="Image URL"
            value={selected?.img_url || ""}
            onChange={event => setSelected(current => (current ? { ...current, img_url: event.target.value } : current))}
          />
          <AdminTextField
            label="Tags"
            description="Comma separated"
            value={(selected?.tags || []).join(", ")}
            onChange={event => setSelected(current => current ? { ...current, tags: event.target.value.split(",").map(item => item.trim()).filter(Boolean) } : current)}
          />
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
