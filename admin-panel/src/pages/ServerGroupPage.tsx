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
import { useEffect, useState } from "react";
import { AdminDrawer } from "../components/AdminDrawer";
import { AdminTextField } from "../components/AdminTextField";
import { adminRequest, unwrapEnvelope } from "../lib/api";
import { PageFrame } from "../components/PageFrame";
import { DangerConfirmButton } from "../components/DangerConfirmButton";
import { asArray } from "../lib/admin-format";
import {
  adminCardClassName,
  adminSectionBodyClassName,
  adminSectionHeaderClassName,
  adminStatCardBodyClassName,
  adminStatsGridClassName,
  adminTableClassNames
} from "../components/AdminContent";

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
  const groupNameInvalid = !name.trim();

  return (
    <PageFrame
      title="Server Groups"
      description="Server groups now have a dedicated maintenance page with usage counters and direct create, edit, and delete actions."
      onRefresh={() => void loadGroups()}
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
            <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-950">Server Groups</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Manage permission groups and inspect how many users and servers depend on each group.
            </p>
          </div>
          <Button
            variant="primary"
           
            onPress={() => {
              setSelected(null);
              setName("");
              setEditorOpen(true);
            }}
          >
            Add group
          </Button>
        </CardHeader>
        <CardContent className={adminSectionBodyClassName}>
          {error ? <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <Table variant="secondary" aria-label="Server Groups" className={adminTableClassNames.wrapper}>
              <Table.ScrollContainer>
              <Table.Content>
                <TableHeader>
                  <TableColumn>ID</TableColumn>
                  <TableColumn>Name</TableColumn>
                  <TableColumn>Users</TableColumn>
                  <TableColumn>Servers</TableColumn>
                  <TableColumn>Actions</TableColumn>
                </TableHeader>
                <TableBody items={records}>
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
                            variant="ghost"
                            onPress={() => {
                              setSelected(item);
                              setName(item.name);
                              setEditorOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <DangerConfirmButton
                            size="sm"
                            isDisabled={submitting}
                            title={`Delete group ${item.name || item.id}?`}
                            description="This will permanently remove the server group."
                            confirmLabel="Delete group"
                            onConfirm={() => void deleteGroup(item.id)}
                          >
                            Delete
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
        title={selected ? "Edit group" : "Create group"}
        isBusy={submitting}
        footer={
          <>
            <Button variant="ghost" onPress={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => void saveGroup()} isDisabled={submitting || groupNameInvalid}>
              Save group
            </Button>
          </>
        }
      >
        <form
          className="space-y-5"
          onSubmit={event => {
            event.preventDefault();
            if (groupNameInvalid) return;
            void saveGroup();
          }}
        >
          <AdminTextField
            label="Group Name"
            value={name}
            onChange={event => setName(event.target.value)}
            isRequired
            isInvalid={groupNameInvalid}
            errorMessage="Group name is required."
          />
        </form>
      </AdminDrawer>
    </PageFrame>
  );
}
