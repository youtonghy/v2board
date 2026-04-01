import { ListBox, ListBoxItem } from "@heroui/react";
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
    <div className="rounded-[1.1rem] border border-slate-200 bg-white">
      <ListBox
        aria-label={ariaLabel}
        className="max-h-56 overflow-y-auto p-2"
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
      >
        {options.map(option => (
          <ListBoxItem key={option.id} id={option.id} textValue={option.label}>
            {option.label}
          </ListBoxItem>
        ))}
      </ListBox>
    </div>
  );
}
