import {
  Accordion,
  Input,
  Table,
  Switch,
  TextArea,
} from "@heroui/react";
import { AdminMultiSelectField } from "./AdminMultiSelectField";

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, match => match.toUpperCase());
}

function stringifyValue(value: unknown): string {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (Array.isArray(value)) {
    return value.every(item => typeof item === "string")
      ? value.join("\n")
      : JSON.stringify(value, null, 2);
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function parseTextValue(originalValue: unknown, rawValue: string): unknown {
  if (Array.isArray(originalValue)) {
    if (originalValue.every(item => typeof item === "string")) {
      return rawValue
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(Boolean);
    }
    try {
      return rawValue ? JSON.parse(rawValue) : [];
    } catch (error) {
      return originalValue;
    }
  }

  if (originalValue && typeof originalValue === "object") {
    try {
      return rawValue ? JSON.parse(rawValue) : {};
    } catch (error) {
      return originalValue;
    }
  }

  if (typeof originalValue === "number") {
    return rawValue === "" ? null : Number(rawValue);
  }

  return rawValue;
}

export function ObjectRecordEditor({
  value,
  onChange,
  hiddenKeys = []
}: {
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>) => void;
  hiddenKeys?: string[];
}) {
  const entries = Object.entries(value).filter(([key]) => !hiddenKeys.includes(key));

  if (!entries.length) {
    return (
      <div className="rounded-[1.4rem] border border-line bg-surface-secondary/80 p-5">
        <p className="text-sm font-semibold text-ink">No editable fields</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          The current section does not expose configurable values in this view yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Accordion
        variant="surface"
        hideSeparator
        defaultExpandedKeys={["fields"]}
        className="rounded-[1.7rem] border border-line/70 bg-surface/95"
      >
        <Accordion.Item id="fields" className="px-0">
          <Accordion.Heading className="px-5 py-4">
            <Accordion.Trigger className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">Advanced fields</p>
                <p className="mt-1 text-xs text-muted">
                  Fields are edited one per row with HeroUI inputs, switches and text areas.
                </p>
              </div>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-5 pb-5 pt-0">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Advanced config fields" className="min-w-[920px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Field</Table.Column>
                      <Table.Column>Value</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {entries.map(([key, currentValue]) => {
                        const label = humanizeKey(key);
                        const editorValue = stringifyValue(currentValue);
                        const useTextarea =
                          typeof currentValue === "object" ||
                          editorValue.includes("\n") ||
                          editorValue.length > 80;
                        const selectValues = Array.isArray(currentValue) && currentValue.every(item => typeof item === "string")
                          ? currentValue.map(item => String(item))
                          : null;

                        return (
                          <Table.Row key={key}>
                            <Table.Cell className="align-top">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-ink">{label}</p>
                                <p className="text-xs text-muted">{key}</p>
                              </div>
                            </Table.Cell>
                            <Table.Cell className="align-top">
                              {typeof currentValue === "boolean" ? (
                                <div className="flex items-center gap-3">
                                  <Switch
                                    aria-label={label}
                                    isSelected={Boolean(currentValue)}
                                    onChange={nextValue => onChange({ ...value, [key]: nextValue })}
                                  />
                                  <span className="text-sm text-muted">
                                    {Boolean(currentValue) ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                              ) : selectValues && selectValues.length > 0 && selectValues.length <= 8 ? (
                                <AdminMultiSelectField
                                  ariaLabel={label}
                                  options={selectValues.map(item => ({ id: item, label: item }))}
                                  selectedKeys={new Set(selectValues)}
                                  onSelectionChange={keys =>
                                    onChange({
                                      ...value,
                                      [key]: keys === "all" ? selectValues : Array.from(keys).map(item => String(item))
                                    })
                                  }
                                />
                              ) : useTextarea ? (
                                <TextArea
                                  aria-label={label}
                                  rows={4}
                                  value={editorValue}
                                  onChange={event =>
                                    onChange({
                                      ...value,
                                      [key]: parseTextValue(currentValue, event.target.value)
                                    })
                                  }
                                />
                              ) : (
                                <Input
                                  aria-label={label}
                                  type={typeof currentValue === "number" ? "number" : "text"}
                                  value={editorValue}
                                  onChange={event =>
                                    onChange({
                                      ...value,
                                      [key]: parseTextValue(currentValue, event.target.value)
                                    })
                                  }
                                />
                              )}
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
