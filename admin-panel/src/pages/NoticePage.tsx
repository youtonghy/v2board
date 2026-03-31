import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Modal,
          Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  TextArea
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
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

  return (
    <PageFrame
      title="Notices"
      description="Announcements are now managed in a dedicated HeroUI table and modal instead of the generic data snapshot. Visibility toggles and save contracts stay aligned with the current backend."
      onRefresh={() => void loadNotices()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Announcement Feed</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Edit title, content, tags, image URL, and visibility without leaving the new shell.
            </p>
          </div>
          <Button
            color="primary"
            radius="full"
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
            <Spinner color="primary" label="Loading notices" />
          </div>
        ) : (
          <Table aria-label="Notices" classNames={adminTableClassNames}>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>Visible</TableColumn>
              <TableColumn>Title</TableColumn>
              <TableColumn>Tags</TableColumn>
              <TableColumn>Created</TableColumn>
              <TableColumn align="end">Actions</TableColumn>
            </TableHeader>
            <TableBody items={records} emptyContent="No notices found">
              {item => (
                <TableRow key={String(item.id || Math.random())}>
                  <TableCell>{item.id ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      isSelected={Boolean(Number(item.show ?? 0))}
                      onValueChange={() => void toggleNotice(item)}
                    />
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
                        <Chip key={tag} size="sm" variant="flat" className="bg-sky-50 text-sky-700">
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
                        color="primary"
                        variant="light"
                        onPress={() => {
                          setSelected(normalizeNotice(item));
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" color="danger" variant="light" onPress={() => void dropNotice(item)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        </CardContent>
      </Card>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)} size="4xl" scrollBehavior="inside">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
          <Modal.Header>
              <Modal.Heading>{selected?.id ? "Edit notice" : "Create notice"}</Modal.Heading>
            </Modal.Header>
          <Modal.Body className="gap-5">
            <Input
              label="Title"
              labelPlacement="outside"
              value={selected?.title || ""}
              onValueChange={value => setSelected(current => (current ? { ...current, title: value } : current))}
            />
            <TextArea
              label="Content"
              labelPlacement="outside"
              minRows={10}
              value={selected?.content || ""}
              onValueChange={value => setSelected(current => (current ? { ...current, content: value } : current))}
            />
            <Input
              label="Image URL"
              labelPlacement="outside"
              value={selected?.img_url || ""}
              onValueChange={value => setSelected(current => (current ? { ...current, img_url: value } : current))}
            />
            <Input
              label="Tags"
              labelPlacement="outside"
              description="Comma separated"
              value={(selected?.tags || []).join(", ")}
              onValueChange={value =>
                setSelected(current =>
                  current
                    ? {
                        ...current,
                        tags: value
                          .split(",")
                          .map(item => item.trim())
                          .filter(Boolean)
                      }
                    : current
                )
              }
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveNotice()} isLoading={saving}>
              Save notice
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
