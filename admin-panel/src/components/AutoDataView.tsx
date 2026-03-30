import { Card, CardBody, CardHeader, Code, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || typeof value === "undefined") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  return JSON.stringify(value);
}

function getRows(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(isPlainObject) as Array<Record<string, unknown>>;
  }

  if (isPlainObject(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(isPlainObject) as Array<Record<string, unknown>>;
  }

  return [];
}

export function AutoDataView({ title, payload }: { title: string; payload: unknown }) {
  const rows = getRows(payload);

  if (rows.length > 0) {
    const columns = Object.keys(rows[0]).filter(key => !isPlainObject(rows[0][key])).slice(0, 6);
    return (
      <Card className="border border-default-200 shadow-none">
        <CardHeader className="flex flex-col items-start gap-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-default-500">{title}</p>
          <p className="text-xs text-default-400">{rows.length} visible rows</p>
        </CardHeader>
        <CardBody className="overflow-auto">
          <Table
            aria-label={title}
            removeWrapper
            classNames={{
              table: "min-w-[640px]"
            }}
          >
            <TableHeader columns={columns.map(column => ({ key: column, label: column }))}>
              {column => <TableColumn key={column.key}>{column.label}</TableColumn>}
            </TableHeader>
            <TableBody items={rows.slice(0, 20)}>
              {row => (
                <TableRow key={String(row.id || row.uuid || JSON.stringify(row))}>
                  {columns.map(column => (
                    <TableCell key={column}>{formatValue(row[column])}</TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border border-default-200 shadow-none">
      <CardHeader className="flex flex-col items-start gap-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-default-500">{title}</p>
        <p className="text-xs text-default-400">Structured JSON snapshot</p>
      </CardHeader>
      <CardBody>
        <Code className="w-full whitespace-pre-wrap break-all rounded-2xl bg-slate-950/95 p-4 text-xs text-white" color="default">
          {JSON.stringify(payload, null, 2)}
        </Code>
      </CardBody>
    </Card>
  );
}
