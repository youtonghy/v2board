import type { ChangeEventHandler } from "react";
import {
  Description,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";

export function AdminTextField({
  label,
  value,
  onChange,
  description,
  errorMessage,
  isRequired = false,
  isInvalid = false,
  className,
  type = "text",
  rows = 4,
  multiline = false,
  placeholder,
  isDisabled = false
}: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  description?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  className?: string;
  type?: string;
  rows?: number;
  multiline?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
}) {
  return (
    <TextField
      className={["w-full gap-2", className].filter(Boolean).join(" ")}
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      validationBehavior="native"
      type={type}
    >
      <Label>{label}</Label>
      {multiline ? (
        <TextArea
          variant="secondary"
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <Input
          variant="secondary"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
      {isInvalid && errorMessage ? (
        <FieldError>{errorMessage}</FieldError>
      ) : description ? (
        <Description>{description}</Description>
      ) : null}
    </TextField>
  );
}
