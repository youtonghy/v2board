import { Accordion, AccordionItem, Input, ListBoxItem, Select, Switch, TextArea } from "@heroui/react";

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
  const booleanEntries = entries.filter(([, currentValue]) => typeof currentValue === "boolean");
  const fieldEntries = entries.filter(([, currentValue]) => typeof currentValue !== "boolean");

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
        <AccordionItem
          key="fields"
          aria-label="Advanced fields"
          title="Advanced fields"
          subtitle="Structured values continue to map to the existing backend payload."
        >
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
            <Select
              key={key}
              label={label}
              labelPlacement="outside"
              selectedKeys={new Set(selectValues)}
              selectionMode="multiple"
              onSelectionChange={keys =>
                onChange({
                  ...value,
                  [key]: Array.from(keys).map(item => String(item))
                })
              }
              description={key}
            >
              {selectValues.map(item => (
                <ListBoxItem key={item}>{item}</ListBoxItem>
              ))}
            </Select>
          );
        }

        if (useTextarea) {
          return (
            <TextArea
              key={key}
              label={label}
              labelPlacement="outside"
              minRows={4}
              value={editorValue}
              onValueChange={nextValue =>
                onChange({
                  ...value,
                  [key]: parseTextValue(currentValue, nextValue)
                })
              }
              description={key}
            />
          );
        }

        return (
          <Input
            key={key}
            label={label}
            labelPlacement="outside"
            type={typeof currentValue === "number" ? "number" : "text"}
            value={editorValue}
            onValueChange={nextValue =>
              onChange({
                ...value,
                [key]: parseTextValue(currentValue, nextValue)
              })
            }
            description={key}
          />
        );
            })}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
