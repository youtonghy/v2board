import type { DateValue } from "@internationalized/date";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import {
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  Label,
} from "@heroui/react";

function toDateValue(value?: number | string | null): DateValue | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return fromAbsolute(timestamp * 1000, getLocalTimeZone());
}

function toTimestamp(value: DateValue | null): number | null {
  if (!value) {
    return null;
  }

  const date = "toDate" in value ? value.toDate(getLocalTimeZone()) : null;
  if (!date) {
    return null;
  }

  return Math.floor(date.getTime() / 1000);
}

export function AdminDatePickerField({
  label,
  value,
  onChange,
  description,
  errorMessage,
  isRequired = false,
  isInvalid = false,
  className,
}: {
  label: string;
  value?: number | string | null;
  onChange: (nextValue: number | null) => void;
  description?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  className?: string;
}) {
  return (
    <DatePicker
      className={["w-full gap-2", className].filter(Boolean).join(" ")}
      value={toDateValue(value)}
      onChange={nextValue => onChange(toTimestamp(nextValue))}
      granularity="minute"
      isRequired={isRequired}
      isInvalid={isInvalid}
      validationBehavior="native"
    >
      <Label>{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Input>{segment => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      {isInvalid && errorMessage ? (
        <FieldError>{errorMessage}</FieldError>
      ) : description ? (
        <Description>{description}</Description>
      ) : null}
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {day => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{date => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year }) => <Calendar.YearPickerCell year={year} />}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
