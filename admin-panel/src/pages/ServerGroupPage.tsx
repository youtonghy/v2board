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
import { asArray } from "../lib/admin-format";
import { adminTableClassNames, SectionCard, StatGrid } from "../components/AdminContent";

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
      setRecords(asArray(unwrapEnvelope(envelope)) as ServerGroupRecord[]);
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

  const stats = [
    { label: "Groups", value: String(records.length), hint: "Access scopes configured" },
    { label: "Users", value: String(records.reduce((sum, record) => sum + Number(record.user_count || 0), 0)), hint: "Accounts linked to groups" },
    { label: "Servers", value: String(records.reduce((sum, record) => sum + Number(record.server_count || 0), 0)), hint: "Nodes mapped to groups" },
    { label: "Busy groups", value: String(records.filter(record => Number(record.server_count || 0) > 0).length), hint: "Groups in active use" }
  ];

  return (
    <PageFrame
      title="Server Groups"
      description="Server groups now have a dedicated maintenance page with usage counters and direct create, edit, and delete actions."
      legacyPath="/server/group"
      onRefresh={() => void loadGroups()}
      loading={loading}
    >
      <StatGrid items={stats} />

      <SectionCard
        title="Server Groups"
        description="Manage permission groups and inspect how many users and servers depend on each group."
        action={
          <Button
            color="primary"
            radius="full"
            onPress={() => {
              setSelected(null);
              setName("");
              setEditorOpen(true);
            }}
          >
            Add group
          </Button>
        }
      >
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner color="primary" label="Loading groups" />
            </div>
          ) : (
            <Table aria-label="Server Groups" classNames={adminTableClassNames}>
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
                          color="primary"
                          variant="light"
                          onPress={() => {
                            setSelected(item);
                            setName(item.name);
                            setEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button size="sm" color="danger" variant="light" onPress={() => void deleteGroup(item.id)} isLoading={submitting}>
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
