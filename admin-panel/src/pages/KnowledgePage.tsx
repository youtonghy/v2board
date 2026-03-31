import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  Select,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TextArea
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  SortableTableRow,
  adminTableActionCellClassName,
  sortableCollisionDetection,
  useSortableTableSensors
} from "../components/SortableTable";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { ModalField } from "../components/ModalField";
import { PageFrame } from "../components/PageFrame";
import { asArray, formatDateTime } from "../lib/admin-format";
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
  const sortableSensors = useSortableTableSensors();

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || sortingId !== null) return;

    const fromIndex = filtered.findIndex(record => String(record.id) === String(active.id));
    const toIndex = filtered.findIndex(record => String(record.id) === String(over.id));
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    void reorderKnowledge(fromIndex, toIndex);
  }

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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Knowledge Base</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Keep categories organized and maintain article visibility without relying on the old editor page.
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              className="min-w-[220px]"
              label="Category"
              labelPlacement="outside"
              items={[
                { id: "all", label: "All Categories" },
                ...categories.map(category => ({ id: category, label: category }))
              ]}
              selectedKey={activeCategory}
              onSelectionChange={key => setActiveCategory(String(key || "all"))}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={[
                  { id: "all", label: "All Categories" },
                  ...categories.map(category => ({ id: category, label: category }))
                ]}>
                  {item => (
                    <ListBoxItem id={item.id} textValue={item.label}>
                      {item.label}
                    </ListBoxItem>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button color="primary" radius="full" onPress={() => void openEditor()}>
              Add article
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
                <Input
                  label="Category Filter"
                  labelPlacement="outside"
                  value={activeCategory === "all" ? "" : activeCategory}
                  isReadOnly
                />
                <div className="md:col-span-3 text-sm text-slate-500 flex items-end">
                  Active category selection is managed from the section header to keep category switching visible at all times.
                </div>
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner color="primary" label="Loading knowledge articles" />
            </div>
          ) : (
            <DndContext
              sensors={sortableSensors}
              collisionDetection={sortableCollisionDetection}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filtered.map(record => String(record.id))}
                strategy={verticalListSortingStrategy}
              >
                <Table aria-label="Knowledge Articles" classNames={adminTableClassNames}>
                  <Table.Content>
                    <TableHeader>
                      <TableColumn>Sort</TableColumn>
                      <TableColumn>Title</TableColumn>
                      <TableColumn>Category</TableColumn>
                      <TableColumn>Language</TableColumn>
                      <TableColumn>Updated</TableColumn>
                      <TableColumn>Visible</TableColumn>
                      <TableColumn align="end">Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No articles found">
                    {filtered.map(item => {
                      const sorting = sortingId === item.id;

                      return (
                        <SortableTableRow
                          key={item.id}
                          id={String(item.id)}
                          dragLabel={`Reorder article ${item.title}`}
                          isDisabled={sortingId !== null}
                        >
                          <TableCell>{item.title}</TableCell>
                          <TableCell><Chip variant="flat" className="bg-sky-50 text-sky-700">{item.category}</Chip></TableCell>
                          <TableCell>{item.language || "en-US"}</TableCell>
                          <TableCell>{formatDateTime(item.updated_at || null)}</TableCell>
                          <TableCell>
                            <Switch isSelected={Boolean(Number(item.show || 0))} onValueChange={() => void runAction("knowledge/show", { id: item.id })} />
                          </TableCell>
                          <TableCell className={adminTableActionCellClassName}>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" color="primary" variant="light" onPress={() => void openEditor(item)} isLoading={submitting || sorting}>
                                Edit
                              </Button>
                              <Button size="sm" color="danger" variant="light" onPress={() => void runAction("knowledge/drop", { id: item.id })} isDisabled={sorting}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </SortableTableRow>
                      );
                    })}
                    </TableBody>
                  </Table.Content>
                </Table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)} size="5xl" scrollBehavior="inside">
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{selected.id ? "Edit article" : "Create article"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 md:grid-cols-2">
                <ModalField label="Title"><Input aria-label="Title" value={selected.title} onValueChange={value => setSelected(current => ({ ...current, title: value }))} /></ModalField>
                <ModalField label="Language"><Input aria-label="Language" value={selected.language || "en-US"} onValueChange={value => setSelected(current => ({ ...current, language: value }))} /></ModalField>
                <ModalField label="Category" className="md:col-span-2"><Input aria-label="Category" value={selected.category} onValueChange={value => setSelected(current => ({ ...current, category: value }))} /></ModalField>
                <ModalField label="Body" className="md:col-span-2"><TextArea aria-label="Body" minRows={16} value={selected.body || ""} onValueChange={value => setSelected(current => ({ ...current, body: value }))} /></ModalField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="light" onPress={() => setEditorOpen(false)}>Cancel</Button>
                <Button color="primary" onPress={() => void saveKnowledge()} isLoading={submitting}>Save article</Button>
              </Modal.Footer>
        </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </PageFrame>
  );
}
