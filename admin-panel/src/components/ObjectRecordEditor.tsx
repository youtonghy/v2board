import { Accordion, Input, ListBox, ListBoxItem, Select, Switch, TextArea } from "@heroui/react";

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

function EditorField({
  label,
  description,
  children,
  className
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 space-y-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
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
  const booleanEntries = entries.filter(([, currentValue]) => typeof currentValue === "boolean");
  const fieldEntries = entries.filter(([, currentValue]) => typeof currentValue !== "boolean");

  if (!entries.length) {
    return (
      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-5">
        <p className="text-sm font-semibold text-slate-900">No editable fields</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The current section does not expose configurable values in this view yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {booleanEntries.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {booleanEntries.map(([key, currentValue]) => {
            const label = humanizeKey(key);

            return (
              <div key={key} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">{key}</p>
                </div>
                <Switch
                  aria-label={label}
                  isSelected={Boolean(currentValue)}
                  onValueChange={nextValue => onChange({ ...value, [key]: nextValue })}
                >
                  Enabled
                </Switch>
              </div>
            );
          })}
        </div>
      ) : null}

      <Accordion
        variant="splitted"
        showDivider={false}
        selectionMode="multiple"
        defaultExpandedKeys={["fields"]}
        itemClasses={{
          base: "px-0",
          trigger: "px-5 py-4",
          title: "text-sm font-semibold text-slate-900",
          content: "px-5 pb-5 pt-0"
        }}
        className="rounded-[1.7rem] border border-slate-100 bg-white/95"
      >
        <Accordion.Item id="fields">
          <Accordion.Heading>
            <Accordion.Trigger className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Advanced fields</p>
                <p className="mt-1 text-xs text-slate-500">
                  Structured values continue to map to the existing backend payload.
                </p>
              </div>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>
              <div className="grid gap-4 md:grid-cols-2">
                {fieldEntries.map(([key, currentValue]) => {
        const label = humanizeKey(key);
        const editorValue = stringifyValue(currentValue);
        const useTextarea =
          typeof currentValue === "object" ||
          editorValue.includes("\n") ||
          editorValue.length > 80;
        const selectValues = Array.isArray(currentValue) && currentValue.every(item => typeof item === "string")
          ? currentValue.map(item => String(item))
          : null;

        if (selectValues && selectValues.length > 0 && selectValues.length <= 8) {
          return (
            <EditorField key={key} label={label} description={key}>
              <Select
                aria-label={label}
                items={selectValues.map(item => ({ id: item, label: item }))}
                selectedKeys={new Set(selectValues)}
                selectionMode="multiple"
                onSelectionChange={keys =>
                  onChange({
                    ...value,
                    [key]: Array.from(keys).map(item => String(item))
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={selectValues.map(item => ({ id: item, label: item }))}>
                    {item => (
                      <ListBoxItem id={item.id} textValue={item.label}>
                        {item.label}
                      </ListBoxItem>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            </EditorField>
          );
        }

        if (useTextarea) {
          return (
            <EditorField key={key} label={label} description={key}>
              <TextArea
                aria-label={label}
                minRows={4}
                value={editorValue}
                onValueChange={nextValue =>
                  onChange({
                    ...value,
                    [key]: parseTextValue(currentValue, nextValue)
                  })
                }
              />
            </EditorField>
          );
        }

        return (
          <EditorField key={key} label={label} description={key}>
            <Input
              aria-label={label}
              type={typeof currentValue === "number" ? "number" : "text"}
              value={editorValue}
              onValueChange={nextValue =>
                onChange({
                  ...value,
                  [key]: parseTextValue(currentValue, nextValue)
                })
              }
            />
          </EditorField>
        );
                })}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
