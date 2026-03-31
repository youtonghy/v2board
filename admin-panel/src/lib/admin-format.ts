export function formatDateTime(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date =
    typeof value === "number"
      ? new Date(value * 1000)
      : /^\d+$/.test(String(value))
        ? new Date(Number(value) * 1000)
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatBytes(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const bytes = Number(value);
  if (Number.isNaN(bytes)) {
    return String(value);
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const nextValue = bytes / 1024 ** index;
  return `${nextValue.toFixed(nextValue >= 100 || index === 0 ? 0 : 2)} ${units[index]}`;
}

export function formatMoney(value?: number | string | null, currency = "$"): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return `${currency}${value}`;
  }

  return `${currency}${numeric.toFixed(2)}`;
}

export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
