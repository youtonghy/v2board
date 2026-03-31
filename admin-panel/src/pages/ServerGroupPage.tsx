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
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { useEffect, useState } from "react";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";

interface ServerGroupRecord {
  id: number;
  name: string;
  user_count?: number;
  server_count?: number;
}

export function ServerGroupPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<ServerGroupRecord[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<ServerGroupRecord | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadGroups() {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminRequest<ServerGroupRecord[]>("server/group/fetch");
      setRecords(unwrapEnvelope(envelope));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load server groups");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveGroup() {
    setSubmitting(true);
    try {
      await unwrapEnvelope(
        await adminRequest("server/group/save", {
          method: "POST",
          body: {
            id: selected?.id,
            name
          }
        })
      );
      setEditorOpen(false);
      await loadGroups();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteGroup(id: number) {
    setSubmitting(true);
    try {
      await unwrapEnvelope(await adminRequest("server/group/drop", { method: "POST", body: { id } }));
      await loadGroups();
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadGroups();
  }, []);

  return (
    <PageFrame
      title="Server Groups"
      description="Server groups now have a dedicated maintenance page with usage counters and direct create, edit, and delete actions."
      legacyPath="/server/group"
      onRefresh={() => void loadGroups()}
      loading={loading}
    >
      <Card className="border border-white/60 bg-white/90 shadow-panel">
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">Server Groups</p>
            <p className="text-sm text-slate-500">Manage permission groups and inspect how many users and servers depend on each group.</p>
          </div>
          <Button
            color="primary"
            onPress={() => {
              setSelected(null);
              setName("");
              setEditorOpen(true);
            }}
          >
            Add group
          </Button>
        </CardHeader>
        <CardBody>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner color="warning" label="Loading groups" />
            </div>
          ) : (
            <Table removeWrapper aria-label="Server Groups">
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Users</TableColumn>
                <TableColumn>Servers</TableColumn>
                <TableColumn align="end">Actions</TableColumn>
              </TableHeader>
              <TableBody items={records} emptyContent="No groups found">
                {item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.user_count || 0}</TableCell>
                    <TableCell>{item.server_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            setSelected(item);
                            setName(item.name);
                            setEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => void deleteGroup(item.id)} isLoading={submitting}>
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

      <Modal isOpen={editorOpen} onOpenChange={isOpen => !isOpen && setEditorOpen(false)}>
        <ModalContent>
          <ModalHeader>{selected ? "Edit group" : "Create group"}</ModalHeader>
          <ModalBody>
            <Input label="Group Name" labelPlacement="outside" value={name} onValueChange={setName} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={() => void saveGroup()} isLoading={submitting}>
              Save group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageFrame>
  );
}
