import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button, Card, CardContent, CardHeader, Chip, Input, Spinner, Switch, Table, TableBody, TableCell, TableColumn, TableHeader } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminSelectField } from "../components/AdminSelectField";
import { AdminTextField } from "../components/AdminTextField";
import {
  SortableTableRow,
  adminTableActionCellClassName,
  sortableCollisionDetection,
  useSortableTableSensors
} from "../components/SortableTable";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { asArray, formatDateTime } from "../lib/admin-format";
import {
  adminCardClassName,
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
  const titleInvalid = !selected.title.trim();
  const categoryInvalid = !selected.category.trim();
  const bodyInvalid = !String(selected.body || "").trim();

  return (
    <PageFrame
      title="Knowledge"
      description="The knowledge base now supports category filtering, direct editing, visibility toggles, and article lifecycle management inside the new shell."
      onRefresh={() => void loadKnowledge()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Knowledge Base</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Keep categories organized and maintain article visibility without relying on the old editor page.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="min-w-[220px]">
              <div className="mb-2 space-y-1">
                <p className="text-sm font-medium text-slate-700">Category</p>
              </div>
              <AdminSelectField
                ariaLabel="Category"
                options={[
                  { id: "all", label: "All Categories" },
                  ...categories.map(category => ({ id: category, label: category }))
                ]}
                selectedKey={activeCategory}
                onSelectionChange={key => setActiveCategory(String(key || "all"))}
              />
            </div>
            <Button variant="primary" onPress={() => void openEditor()}>
              Add article
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`${adminSectionBodyClassName} gap-5`}>
          <div className="rounded-[1.7rem] border border-slate-100 bg-white/90 px-5 py-4 text-sm text-slate-500">
            Active category selection is managed from the section header to keep category switching visible at all times.
          </div>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner />
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
                <Table aria-label="Knowledge Articles" className={adminTableClassNames.wrapper}>
                  <Table.Content>
                    <TableHeader>
                      <TableColumn>Sort</TableColumn>
                      <TableColumn>Title</TableColumn>
                      <TableColumn>Category</TableColumn>
                      <TableColumn>Language</TableColumn>
                      <TableColumn>Updated</TableColumn>
                      <TableColumn>Visible</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
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
                          <TableCell><Chip variant="soft" className="bg-sky-50 text-sky-700">{item.category}</Chip></TableCell>
                          <TableCell>{item.language || "en-US"}</TableCell>
                          <TableCell>{formatDateTime(item.updated_at || null)}</TableCell>
                          <TableCell>
                            <Switch isSelected={Boolean(Number(item.show || 0))} onChange={() => void runAction("knowledge/show", { id: item.id })} />
                          </TableCell>
                          <TableCell className={adminTableActionCellClassName}>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onPress={() => void openEditor(item)} isDisabled={submitting || sorting}>
                                Edit
                              </Button>
                                <DangerConfirmButton
                                  size="sm"
                                  isDisabled={sorting}
                                  title={`Delete article ${item.title}?`}
                                  description="This will permanently remove the knowledge article."
                                  confirmLabel="Delete article"
                                  onConfirm={() => void runAction("knowledge/drop", { id: item.id })}
                                >
                                  Delete
                                </DangerConfirmButton>
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

      <AdminDrawer
        isOpen={editorOpen}
        onOpenChange={isOpen => !isOpen && setEditorOpen(false)}
        title={selected.id ? "Edit article" : "Create article"}
        isBusy={submitting}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => void saveKnowledge()} isDisabled={submitting || titleInvalid || categoryInvalid || bodyInvalid}>
              Save article
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (titleInvalid || categoryInvalid || bodyInvalid) return;
            void saveKnowledge();
          }}
        >
          <AdminTextField
            label="Title"
            value={selected.title}
            onChange={event => setSelected(current => ({ ...current, title: event.target.value }))}
            isRequired
            isInvalid={titleInvalid}
            errorMessage="Title is required."
          />
          <AdminTextField
            label="Language"
            value={selected.language || "en-US"}
            onChange={event => setSelected(current => ({ ...current, language: event.target.value }))}
          />
          <AdminTextField
            label="Category"
            className="md:col-span-2"
            value={selected.category}
            onChange={event => setSelected(current => ({ ...current, category: event.target.value }))}
            isRequired
            isInvalid={categoryInvalid}
            errorMessage="Category is required."
          />
          <AdminTextField
            label="Body"
            className="md:col-span-2"
            multiline
            rows={16}
            value={selected.body || ""}
            onChange={event => setSelected(current => ({ ...current, body: event.target.value }))}
            isRequired
            isInvalid={bodyInvalid}
            errorMessage="Body is required."
          />
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
