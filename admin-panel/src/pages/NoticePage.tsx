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
import { adminRequest } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { SectionCard, StatGrid } from "../components/AdminContent";
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
      legacyPath="/notice"
      onRefresh={() => void loadNotices()}
      loading={loading}
    >
      <StatGrid items={stats} />

      <SectionCard
        title="Announcement Feed"
        description="Edit title, content, tags, image URL, and visibility without leaving the new shell."
        action={
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
        }
      >
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Spinner color="primary" label="Loading notices" />
          </div>
        ) : (
          <Table
            removeWrapper
            aria-label="Notices"
            classNames={{
              th: "bg-slate-50 text-slate-500 uppercase text-[11px] tracking-[0.18em]",
              td: "py-4"
            }}
          >
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
                        variant="flat"
                        onPress={() => {
                          setSelected(normalizeNotice(item));
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" color="danger" variant="flat" onPress={() => void dropNotice(item)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <Modal isOpen={open} onOpenChange={isOpen => !isOpen && setOpen(false)} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected?.id ? "Edit notice" : "Create notice"}</ModalHeader>
          <ModalBody className="gap-5">
            <Input
              label="Title"
              labelPlacement="outside"
              value={selected?.title || ""}
              onValueChange={value => setSelected(current => (current ? { ...current, title: value } : current))}
            />
            <Textarea
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
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveNotice()} isLoading={saving}>
              Save notice
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
