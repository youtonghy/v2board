import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
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
import { asArray } from "../lib/admin-format";
import { adminTableClassNames, SectionCard, StatGrid } from "../components/AdminContent";

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

  const selectedAction = useMemo(
    () => (selected.action ? new Set([selected.action]) : new Set<string>()),
    [selected.action]
  );
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
      <StatGrid items={stats} />

      <SectionCard
        title="Routing Rules"
        description="Review route actions, edit match conditions, and keep the route table manageable inside the new panel."
        action={
          <Button
            color="primary"
            radius="full"
            onPress={() => {
              setSelected(defaultRouteRecord());
              setEditorOpen(true);
            }}
          >
            Add route
          </Button>
        }
      >
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner color="primary" label="Loading routes" />
            </div>
          ) : (
            <Table aria-label="Server Routes" classNames={adminTableClassNames}>
              <TableHeader>
                <TableColumn>Remarks</TableColumn>
                <TableColumn>Action</TableColumn>
                <TableColumn>Action Value</TableColumn>
                <TableColumn>Match</TableColumn>
                <TableColumn align="end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={records} emptyContent="No routes found">
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
                        <Button size="sm" color="primary" variant="light" onPress={() => { setSelected(item); setEditorOpen(true); }}>
                          Edit
                        </Button>
                        <Button size="sm" color="danger" variant="light" onPress={() => void deleteRoute(item.id)} isLoading={submitting}>
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

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)} size="4xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{selected.id ? "Edit route" : "Create route"}</ModalHeader>
          <ModalBody className="grid gap-4 md:grid-cols-2">
            <Input label="Remarks" labelPlacement="outside" value={selected.remarks} onValueChange={value => setSelected(current => ({ ...current, remarks: value }))} />
            <Select
              label="Action"
              labelPlacement="outside"
              selectedKeys={selectedAction}
              onSelectionChange={keys => setSelected(current => ({ ...current, action: String(Array.from(keys)[0] || "block") }))}
            >
              {ACTION_OPTIONS.map(action => (
                <SelectItem key={action}>{action}</SelectItem>
              ))}
            </Select>
            <Input className="md:col-span-2" label="Action Value" labelPlacement="outside" value={selected.action_value || ""} onValueChange={value => setSelected(current => ({ ...current, action_value: value }))} />
            {selected.action !== "default_out" ? (
              <Textarea
                className="md:col-span-2"
                label="Match Rules"
                labelPlacement="outside"
                minRows={10}
                description="One match item per line."
                value={Array.isArray(selected.match) ? selected.match.join("\n") : selected.match || ""}
                onValueChange={value => setSelected(current => ({ ...current, match: value }))}
              />
            ) : (
              <div className="md:col-span-2 rounded-2xl border border-default-200 bg-default-50 p-4 text-sm text-slate-600">
                Default out rules do not require explicit match values.
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveRoute()} isLoading={submitting}>
              Save route
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
