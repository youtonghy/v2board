import { ListBox, ListBoxItem, Select } from "@heroui/react";
import type { Key } from "react";
import type { AdminSelectOption } from "./AdminSelectField";

type Selection = "all" | Set<Key>;

export function AdminMultiSelectField({
  ariaLabel,
  options,
  selectedKeys,
  onSelectionChange
}: {
  ariaLabel: string;
  options: AdminSelectOption[];
  selectedKeys: Selection;
  onSelectionChange: (keys: Selection) => void;
}) {
  const selectProps: any = {
    "aria-label": ariaLabel,
    className: "w-full",
    placeholder: "Select options",
    selectionMode: "multiple" as const,
    selectedKeys,
    onSelectionChange: (key: Key | null) => {
      const nextKeys: Selection =
        key === "all" ? "all" : new Set<Key>(key == null ? [] : [key]);
      onSelectionChange(nextKeys);
    }
  };

  return (
    <Select {...selectProps}>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode="multiple" className="max-h-56 overflow-y-auto p-2">
          {options.map(option => (
            <ListBoxItem key={option.id} id={option.id} textValue={option.label}>
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
