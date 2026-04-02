import { ChevronUp } from "@gravity-ui/icons";
import type { SortDescriptor } from "@heroui/react";
import { useMemo, useState, type ReactNode } from "react";

type AdminSortableValue = string | number | boolean | null | undefined;

type SortGetter<T> = (item: T) => AdminSortableValue;

function normalizeSortValue(value: AdminSortableValue) {
  if (value == null) {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const numeric = Number(value);
  if (value !== "" && Number.isFinite(numeric)) {
    return numeric;
  }

  return String(value).trim().toLowerCase();
}

function compareSortValues(left: AdminSortableValue, right: AdminSortableValue) {
  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);

  if (normalizedLeft == null && normalizedRight == null) return 0;
  if (normalizedLeft == null) return 1;
  if (normalizedRight == null) return -1;

  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    return normalizedLeft - normalizedRight;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), "en-US", {
    numeric: true,
    sensitivity: "base"
  });
}

export function useAdminTableSort<T>(
  items: T[],
  initialDescriptor: SortDescriptor,
  sorters: Record<string, SortGetter<T>>
) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>(initialDescriptor);

  const sortedItems = useMemo(() => {
    const column = String(sortDescriptor.column || "");
    const getSortValue = sorters[column];
    if (!getSortValue) {
      return items;
    }

    const sorted = [...items].sort((left, right) => compareSortValues(getSortValue(left), getSortValue(right)));
    if (sortDescriptor.direction === "descending") {
      sorted.reverse();
    }

    return sorted;
  }, [items, sortDescriptor, sorters]);

  return {
    sortDescriptor,
    setSortDescriptor,
    sortedItems
  };
}

export function AdminSortableColumnHeader({
  label,
  sortDirection
}: {
  label: ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <ChevronUp
        width={14}
        height={14}
        aria-hidden="true"
        className={[
          "shrink-0 transition-transform duration-150",
          sortDirection ? "opacity-100" : "opacity-30",
          sortDirection === "descending" ? "rotate-180" : ""
        ].join(" ")}
      />
    </span>
  );
}
