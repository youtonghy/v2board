import {
  Button,
  Card,
  CardContent,
  CardHeader,
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
import { AdminSelectField } from "../components/AdminSelectField";
import { AdminTextField } from "../components/AdminTextField";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { ModalField } from "../components/ModalField";
import { PageFrame } from "../components/PageFrame";
import { asArray } from "../lib/admin-format";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

interface ServerRouteRecord {
  id: number;
  remarks: string;
  match: string[] | string;
  action: string;
  action_value?: string | null;
}

const ACTION_OPTIONS = [
  "block",
  "block_ip",
  "block_port",
  "protocol",
  "dns",
  "route",
  "route_ip",
  "default_out"
];

function defaultRouteRecord(): ServerRouteRecord {
  return {
    id: 0,
    remarks: "",
    match: [],
    action: "block",
    action_value: ""
  };
}

export function ServerRoutePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<ServerRouteRecord[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<ServerRouteRecord>(defaultRouteRecord());
  const [error, setError] = useState<string | null>(null);

  async function loadRoutes() {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminRequest<ServerRouteRecord[]>("server/route/fetch");
      setRecords(asArray(unwrapEnvelope(envelope)) as ServerRouteRecord[]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load routes");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveRoute() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("server/route/save", {
          method: "POST",
          body: {
            id: selected.id || undefined,
            remarks: selected.remarks,
            action: selected.action,
            action_value: selected.action_value || undefined,
            match:
              selected.action === "default_out"
                ? []
                : String(Array.isArray(selected.match) ? selected.match.join("\n") : selected.match)
                    .split("\n")
                    .map(item => item.trim())
                    .filter(Boolean)
          }
        })
      );
      setEditorOpen(false);
      await loadRoutes();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRoute(id: number) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(await adminRequest("server/route/drop", { method: "POST", body: { id } }));
      await loadRoutes();
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadRoutes();
  }, []);

  const selectedAction = useMemo(() => selected.action || "block", [selected.action]);
  const routeActionInvalid = !selected.action.trim();
  const routeMatchInvalid =
    selected.action !== "default_out" &&
    !String(Array.isArray(selected.match) ? selected.match.join("\n") : selected.match || "").trim();
  const stats = useMemo(() => {
    const defaultOut = records.filter(record => record.action === "default_out").length;
    const withMatch = records.filter(record => Array.isArray(record.match) ? record.match.length > 0 : Boolean(record.match)).length;

    return [
      { label: "Routes", value: String(records.length), hint: "Total routing policies" },
      { label: "Default out", value: String(defaultOut), hint: "Fallback outbound routes" },
      { label: "Match based", value: String(withMatch), hint: "Explicit rule matching" },
      { label: "Actions", value: String(new Set(records.map(record => record.action)).size), hint: "Action types in use" }
    ];
  }, [records]);

  return (
    <PageFrame
      title="Routes"
      description="Server route rules now have a dedicated editor for action types, target values, and line-based match entries."
      onRefresh={() => void loadRoutes()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Routing Rules</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Review route actions, edit match conditions, and keep the route table manageable inside the new panel.
            </p>
          </div>
          <Button
            variant="primary"
           
            onPress={() => {
              setSelected(defaultRouteRecord());
              setEditorOpen(true);
            }}
          >
            Add route
          </Button>
        </CardHeader>
        <CardContent className={adminSectionBodyClassName}>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <Table variant="secondary" aria-label="Server Routes" className={adminTableClassNames.wrapper}>
              <Table.ScrollContainer>
              <Table.Content>
                <TableHeader>
                  <TableColumn>Remarks</TableColumn>
                  <TableColumn>Action</TableColumn>
                  <TableColumn>Action Value</TableColumn>
                  <TableColumn>Match</TableColumn>
                  <TableColumn>Actions</TableColumn>
                </TableHeader>
                <TableBody items={records}>
                  {item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.remarks}</TableCell>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>{item.action_value || "—"}</TableCell>
                      <TableCell className="max-w-[420px]">
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {Array.isArray(item.match) ? item.match.join(", ") : item.match || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            isIconOnly
                            aria-label={`Edit route ${item.remarks || item.id || ""}`}
                            onPress={() => {
                              setSelected(item);
                              setEditorOpen(true);
                            }}
                          >
                            <PencilToLine width={16} height={16} aria-hidden="true" />
                          </Button>
                            <DangerConfirmButton
                              size="sm"
                              isDisabled={submitting}
                              isIconOnly
                              aria-label={`Delete route ${item.remarks || item.id || ""}`}
                              title={`Delete route ${item.remarks || item.id}?`}
                              description="This will permanently remove the route."
                              confirmLabel="Delete route"
                              onConfirm={() => void deleteRoute(item.id)}
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
        isOpen={editorOpen}
        onOpenChange={isOpen => !isOpen && setEditorOpen(false)}
        title={selected.id ? "Edit route" : "Create route"}
        isBusy={submitting}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onPress={() => setEditorOpen(false)}>Cancel</Button>
            <Button variant="primary" onPress={() => void saveRoute()} isDisabled={submitting || routeActionInvalid || routeMatchInvalid}>Save route</Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            if (routeActionInvalid || routeMatchInvalid) return;
            void saveRoute();
          }}
        >
          <AdminTextField label="Remarks" value={selected.remarks} onChange={event => setSelected(current => ({ ...current, remarks: event.target.value }))} />
          <ModalField label="Action" required>
            <AdminSelectField
              ariaLabel="Action"
              options={ACTION_OPTIONS.map(action => ({ id: action, label: action }))}
              selectedKey={selectedAction}
              onSelectionChange={key => setSelected(current => ({ ...current, action: String(key || "block") }))}
            />
          </ModalField>
          <AdminTextField label="Action Value" value={selected.action_value || ""} onChange={event => setSelected(current => ({ ...current, action_value: event.target.value }))} />
          {selected.action !== "default_out" ? (
            <AdminTextField
              label="Match Rules"
              description="One match item per line."
              multiline
              rows={10}
              value={Array.isArray(selected.match) ? selected.match.join("\n") : selected.match || ""}
              onChange={event => setSelected(current => ({ ...current, match: event.target.value }))}
              isRequired
              isInvalid={routeMatchInvalid}
              errorMessage="Match rules are required."
            />
          ) : (
            <div className="rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
              Default out rules do not require explicit match values.
            </div>
          )}
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
