import { ListBox, ListBoxItem, Select } from "@heroui/react";
import type { Selection } from "react-aria-components";
import type { AdminSelectOption } from "./AdminSelectField";

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
  return (
    <Select
      aria-label={ariaLabel}
      className="w-full"
      placeholder="Select options"
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
    >
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
