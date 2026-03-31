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
import { useEffect, useState } from "react";
import { adminRequest } from "../lib/api";
import { PageFrame } from "../components/PageFrame";

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

  return (
    <PageFrame
      title="Notices"
      description="Announcements are now managed in a dedicated HeroUI table and modal instead of the generic data snapshot. Visibility toggles and save contracts stay aligned with the current backend."
      legacyPath="/notice"
      onRefresh={() => void loadNotices()}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">Announcement Feed</p>
            <p className="text-sm text-slate-500">Edit title, content, tags, image URL, and visibility without leaving the new shell.</p>
          </div>
          <Button
            color="primary"
            onPress={() => {
              setSelected(normalizeNotice());
              setOpen(true);
            }}
          >
            Add notice
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Spinner color="warning" label="Loading notices" />
            </div>
          ) : (
            <Table removeWrapper aria-label="Notices">
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
                    <TableCell>{item.title || "Untitled"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(item.tags || []).map(tag => (
                          <Chip key={tag} size="sm" variant="flat">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.created_at ? new Date(item.created_at * 1000).toLocaleString() : "—"}
                    </TableCell>
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
        </CardBody>
      </Card>

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
