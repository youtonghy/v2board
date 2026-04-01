import { ListBox, ListBoxItem, Select } from "@heroui/react";

export interface AdminSelectOption {
  id: string;
  label: string;
}

export function AdminSelectField({
  ariaLabel,
  placeholder = "Select one",
  options,
  selectedKey,
  onSelectionChange,
}: {
  ariaLabel: string;
  placeholder?: string;
  options: AdminSelectOption[];
  selectedKey: string | null;
  onSelectionChange: (key: string | null) => void;
}) {
  return (
    <Select aria-label={ariaLabel} placeholder={placeholder} selectedKey={selectedKey} onSelectionChange={key => onSelectionChange(key ? String(key) : null)}>
      <Select.Trigger className="h-9 w-full">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
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
