import { Input, Switch, Textarea } from "@heroui/react";

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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map(([key, currentValue]) => {
        const label = humanizeKey(key);

        if (typeof currentValue === "boolean") {
          return (
            <div key={key} className="rounded-2xl border border-default-200 bg-default-50 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{key}</p>
              </div>
              <Switch
                isSelected={currentValue}
                onValueChange={nextValue => onChange({ ...value, [key]: nextValue })}
              >
                Enabled
              </Switch>
            </div>
          );
        }

        const editorValue = stringifyValue(currentValue);
        const useTextarea =
          typeof currentValue === "object" ||
          editorValue.includes("\n") ||
          editorValue.length > 80;

        if (useTextarea) {
          return (
            <Textarea
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
  );
}
