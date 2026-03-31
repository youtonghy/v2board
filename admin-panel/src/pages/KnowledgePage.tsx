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
import { asArray, formatDateTime } from "../lib/admin-format";
import { adminTableClassNames, FilterPanel, SectionCard, StatGrid } from "../components/AdminContent";

interface KnowledgeRecord {
  id: number;
  title: string;
  category: string;
  language?: string;
  body?: string;
  show: number;
  updated_at?: string;
}

function defaultKnowledgeRecord(category = ""): KnowledgeRecord {
  return {
    id: 0,
    title: "",
    category,
    language: "en-US",
    body: "",
    show: 1
  };
}

export function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sortingId, setSortingId] = useState<number | null>(null);
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<KnowledgeRecord>(defaultKnowledgeRecord());
  const [error, setError] = useState<string | null>(null);

  async function loadKnowledge() {
    setLoading(true);
    setError(null);
    try {
      const [knowledgeEnvelope, categoryEnvelope] = await Promise.all([
        adminRequest<KnowledgeRecord[]>("knowledge/fetch"),
        adminRequest<string[]>("knowledge/getCategory")
      ]);
      setRecords(asArray(unwrapEnvelope(knowledgeEnvelope)) as KnowledgeRecord[]);
      setCategories(asArray(unwrapEnvelope(categoryEnvelope)).map(item => String(item)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load knowledge base");
      setRecords([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function openEditor(record?: KnowledgeRecord) {
    if (!record?.id) {
      setSelected(defaultKnowledgeRecord(activeCategory === "all" ? "" : activeCategory));
      setEditorOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const detailEnvelope = await adminRequest<KnowledgeRecord>("knowledge/fetch", {
        query: { id: record.id }
      });
      setSelected(unwrapEnvelope(detailEnvelope));
      setEditorOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveKnowledge() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("knowledge/save", {
          method: "POST",
          body: {
            id: selected.id || undefined,
            title: selected.title,
            category: selected.category,
            language: selected.language || "en-US",
            body: selected.body
          }
        })
      );
      setEditorOpen(false);
      await loadKnowledge();
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(endpoint: string, body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(await adminRequest(endpoint, { method: "POST", body }));
      await loadKnowledge();
    } finally {
      setSubmitting(false);
    }
  }

  async function reorderKnowledge(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= filtered.length) return;

    const visibleRecords = [...filtered];
    const [current] = visibleRecords.splice(fromIndex, 1);
    visibleRecords.splice(toIndex, 0, current);

    const orderedIds = visibleRecords.map(item => item.id);
    const nextRecords = [...records];
    let pointer = 0;
    for (let index = 0; index < nextRecords.length; index += 1) {
      if (activeCategory === "all" || nextRecords[index].category === activeCategory) {
        nextRecords[index] = visibleRecords[pointer];
        pointer += 1;
      }
    }

    setRecords(nextRecords);
    setSortingId(current.id);
    try {
      await unwrapEnvelope(
        await adminRequest("knowledge/sort", {
          method: "POST",
          body: {
            knowledge_ids: orderedIds
          }
        })
      );
      await loadKnowledge();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to sort knowledge");
      await loadKnowledge();
    } finally {
      setSortingId(null);
    }
  }

  useEffect(() => {
    void loadKnowledge();
  }, []);

  const filtered = useMemo(
    () => records.filter(record => activeCategory === "all" || record.category === activeCategory),
    [records, activeCategory]
  );
  const stats = useMemo(() => {
    const visible = filtered.filter(record => Boolean(Number(record.show ?? 0))).length;
    const localized = filtered.filter(record => Boolean(record.language)).length;

    return [
      { label: "Visible set", value: String(filtered.length), hint: activeCategory === "all" ? "All categories" : activeCategory },
      { label: "Visible", value: String(visible), hint: "Shown in the help center" },
      { label: "Categories", value: String(categories.length), hint: "Available category groups" },
      { label: "Localized", value: String(localized), hint: "Language metadata set" }
    ];
  }, [activeCategory, categories.length, filtered]);

  return (
    <PageFrame
      title="Knowledge"
      description="The knowledge base now supports category filtering, direct editing, visibility toggles, and article lifecycle management inside the new shell."
      onRefresh={() => void loadKnowledge()}
      loading={loading}
    >
      <StatGrid items={stats} />

      <SectionCard
        title="Knowledge Base"
        description="Keep categories organized and maintain article visibility without relying on the old editor page."
        action={<div className="flex gap-2">
            <Select
              className="min-w-[220px]"
              label="Category"
              labelPlacement="outside"
              selectedKeys={new Set([activeCategory])}
              onSelectionChange={keys => setActiveCategory(String(Array.from(keys)[0] || "all"))}
            >
              <SelectItem key="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category}>{category}</SelectItem>
              ))}
            </Select>
            <Button color="primary" radius="full" onPress={() => void openEditor()}>
              Add article
            </Button>
          </div>}
        bodyClassName="gap-5"
      >
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="primary" label="Loading knowledge articles" />
            </div>
          ) : (
            <Table aria-label="Knowledge Articles" classNames={adminTableClassNames}>
              <TableHeader>
                <TableColumn>Sort</TableColumn>
                <TableColumn>Title</TableColumn>
                <TableColumn>Category</TableColumn>
                <TableColumn>Language</TableColumn>
                <TableColumn>Updated</TableColumn>
                <TableColumn>Visible</TableColumn>
                <TableColumn align="end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={filtered} emptyContent="No articles found">
                {item => {
                  const index = filtered.findIndex(record => record.id === item.id);
                  const sorting = sortingId === item.id;

                  return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          color="default"
                          variant="light"
                          isDisabled={sorting || index <= 0}
                          onPress={() => void reorderKnowledge(index, index - 1)}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          color="default"
                          variant="light"
                          isDisabled={sorting || index >= filtered.length - 1}
                          onPress={() => void reorderKnowledge(index, index + 1)}
                        >
                          Down
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell><Chip variant="flat" className="bg-sky-50 text-sky-700">{item.category}</Chip></TableCell>
                    <TableCell>{item.language || "en-US"}</TableCell>
                    <TableCell>{formatDateTime(item.updated_at || null)}</TableCell>
                    <TableCell>
                      <Switch isSelected={Boolean(Number(item.show || 0))} onValueChange={() => void runAction("knowledge/show", { id: item.id })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" color="primary" variant="light" onPress={() => void openEditor(item)} isLoading={submitting}>
                          Edit
                        </Button>
                        <Button size="sm" color="danger" variant="light" onPress={() => void runAction("knowledge/drop", { id: item.id })} isLoading={submitting}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}}
              </TableBody>
            </Table>
          )}
      </SectionCard>

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected.id ? "Edit article" : "Create article"}</ModalHeader>
          <ModalBody className="grid gap-4 md:grid-cols-2">
            <Input label="Title" labelPlacement="outside" value={selected.title} onValueChange={value => setSelected(current => ({ ...current, title: value }))} />
            <Input label="Language" labelPlacement="outside" value={selected.language || "en-US"} onValueChange={value => setSelected(current => ({ ...current, language: value }))} />
            <Input className="md:col-span-2" label="Category" labelPlacement="outside" value={selected.category} onValueChange={value => setSelected(current => ({ ...current, category: value }))} />
            <Textarea className="md:col-span-2" label="Body" labelPlacement="outside" minRows={16} value={selected.body || ""} onValueChange={value => setSelected(current => ({ ...current, body: value }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveKnowledge()} isLoading={submitting}>
              Save article
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
