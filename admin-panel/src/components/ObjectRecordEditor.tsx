import {
  Calendar,
  DateField,
  DatePicker,
  Input,
  Switch,
  Table,
  TextArea,
} from "@heroui/react";
import { parseDate, type DateValue } from "@internationalized/date";
import { AdminMultiSelectField } from "./AdminMultiSelectField";
import { AdminSelectField, type AdminSelectOption } from "./AdminSelectField";
import { RESET_TRAFFIC_OPTIONS } from "../lib/admin-constants";

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
    return value.every(item => typeof item === "string") ? value.join("\n") : JSON.stringify(value, null, 2);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

const BOOLEAN_KEYS = new Set([
  "invite_force",
  "invite_never_expire",
  "invite_admin_only",
  "user_invite_page_enable",
  "public_register_enable",
  "invite_link_stats_enable",
  "commission_first_time_enable",
  "commission_auto_check_enable",
  "withdraw_close_enable",
  "commission_distribution_enable",
  "force_https",
  "stop_register",
  "subscribe_ua_whitelist_enable",
  "try_out_enable",
  "plan_change_enable",
  "reset_traffic_never_expire_enable",
  "surplus_enable",
  "allow_new_period",
  "new_order_event_id",
  "renew_order_event_id",
  "change_order_event_id",
  "show_info_to_server_enable",
  "email_oauth_enable",
  "telegram_bot_enable",
  "telegram_login_enable",
  "sso_login_enable",
  "sso_auto_register",
  "email_whitelist_enable",
  "email_gmail_limit_enable",
  "recaptcha_enable",
  "turnstile_enable",
  "email_verify",
  "safe_mode_enable",
  "cors_separate_frontend_enable",
  "subscribe_burn_after_read",
  "register_limit_by_ip_enable",
  "password_limit_enable",
  "totp_enable",
  "passkey_login_enable",
  "api_v1_disable",
  "ip_no_log",
  "device_limit_mode",
]);

const SINGLE_SELECT_OPTIONS: Record<string, AdminSelectOption[]> = {
  ticket_status: [
    { id: "0", label: "Open to all" },
    { id: "1", label: "Paid users only" },
    { id: "2", label: "Disabled" },
  ],
  register_mode: [
    { id: "0", label: "Open" },
    { id: "1", label: "Invite only" },
    { id: "2", label: "Closed" },
  ],
  reset_traffic_method: RESET_TRAFFIC_OPTIONS.map(option => ({
    id: option.key,
    label: option.label,
  })),
  frontend_theme_sidebar: [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ],
  frontend_theme_header: [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ],
  frontend_theme_color: [
    { id: "default", label: "Default" },
    { id: "darkblue", label: "Dark Blue" },
    { id: "black", label: "Black" },
    { id: "green", label: "Green" },
  ],
  sso_provider: [{ id: "casdoor", label: "Casdoor" }],
  show_subscribe_method: [
    { id: "0", label: "Permanent" },
    { id: "1", label: "One-time" },
    { id: "2", label: "Temporary" },
  ],
};

const MULTI_SELECT_OPTIONS: Record<string, AdminSelectOption[]> = {
  commission_withdraw_method: [
    { id: "支付宝", label: "Alipay" },
    { id: "USDT", label: "USDT" },
    { id: "Paypal", label: "PayPal" },
  ],
  email_whitelist_suffix: [
    { id: "gmail.com", label: "gmail.com" },
    { id: "qq.com", label: "qq.com" },
    { id: "163.com", label: "163.com" },
    { id: "yahoo.com", label: "yahoo.com" },
    { id: "sina.com", label: "sina.com" },
    { id: "126.com", label: "126.com" },
    { id: "outlook.com", label: "outlook.com" },
    { id: "yeah.net", label: "yeah.net" },
    { id: "foxmail.com", label: "foxmail.com" },
  ],
  subscribe_ua_whitelist: [
    { id: "clash", label: "clash" },
    { id: "clashmeta", label: "clashmeta" },
    { id: "clash-meta", label: "clash-meta" },
    { id: "clash verge", label: "clash verge" },
    { id: "clashverge", label: "clashverge" },
    { id: "sing-box", label: "sing-box" },
    { id: "singbox", label: "singbox" },
    { id: "shadowrocket", label: "shadowrocket" },
    { id: "quantumult", label: "quantumult" },
    { id: "quantumult x", label: "quantumult x" },
    { id: "surge", label: "surge" },
    { id: "loon", label: "loon" },
    { id: "stash", label: "stash" },
    { id: "sagernet", label: "sagernet" },
    { id: "passwall", label: "passwall" },
    { id: "hiddify", label: "hiddify" },
    { id: "v2rayn", label: "v2rayn" },
    { id: "v2rayng", label: "v2rayng" },
    { id: "v2ray", label: "v2ray" },
    { id: "v2raytun", label: "v2raytun" },
    { id: "ssrplus", label: "ssrplus" },
    { id: "shadowsocks", label: "shadowsocks" },
    { id: "surfboard", label: "surfboard" },
    { id: "nekobox", label: "nekobox" },
    { id: "nekoray", label: "nekoray" },
    { id: "TJXT", label: "TJXT" },
  ],
};

function mergeOptions(baseOptions: AdminSelectOption[], currentValue: unknown): AdminSelectOption[] {
  const merged = new Map<string, AdminSelectOption>();

  baseOptions.forEach(option => merged.set(option.id, option));

  if (Array.isArray(currentValue)) {
    currentValue.forEach(item => {
      const id = String(item);
      if (!merged.has(id)) {
        merged.set(id, { id, label: id });
      }
    });
  }

  return Array.from(merged.values());
}

function isDateLikeKey(key: string): boolean {
  return /(^|_)(date|datetime|time|at)(_|$)/i.test(key) || /(_at|_date|_time)$/i.test(key);
}

function toDateValue(value: unknown): DateValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const datePart = trimmed.match(/^\d{4}-\d{2}-\d{2}/)?.[0]?.slice(0, 10);
  if (!datePart) {
    return null;
  }

  try {
    return parseDate(datePart);
  } catch {
    return null;
  }
}

function DateFieldEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (nextValue: string) => void;
}) {
  return (
    <DatePicker
      aria-label={label}
      className="w-full"
      value={toDateValue(value)}
      onChange={nextValue => onChange(nextValue ? nextValue.toString() : "")}
    >
      <DateField.Group fullWidth>
        <DateField.Input>{segment => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
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

function coerceSelectValue(originalValue: unknown, nextValue: string | null): unknown {
  if (nextValue === null) {
    return null;
  }

  if (typeof originalValue === "number") {
    return Number(nextValue);
  }

  if (typeof originalValue === "boolean") {
    return nextValue === "1" || nextValue === "true";
  }

  return nextValue;
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
    } catch {
      return originalValue;
    }
  }

  if (originalValue && typeof originalValue === "object") {
    try {
      return rawValue ? JSON.parse(rawValue) : {};
    } catch {
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
  hiddenKeys = [],
  fieldOptionsByKey = {},
}: {
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>) => void;
  hiddenKeys?: string[];
  fieldOptionsByKey?: Record<string, AdminSelectOption[]>;
}) {
  const entries = Object.entries(value).filter(([key]) => !hiddenKeys.includes(key));

  if (!entries.length) {
    return (
      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-5">
        <p className="text-sm font-semibold text-slate-900">No editable fields</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The current section does not expose configurable values in this view yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.7rem] border border-slate-100 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">Advanced fields</p>
        <p className="mt-1 text-xs text-slate-500">
          Fields are edited one per row with HeroUI inputs, switches and text areas.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Advanced config fields" className="min-w-[920px]">
              <Table.Header>
                <Table.Column isRowHeader>Field</Table.Column>
                <Table.Column>Value</Table.Column>
              </Table.Header>
              <Table.Body>
                {entries.map(([key, currentValue]) => {
              const label = humanizeKey(key);
              const editorValue = stringifyValue(currentValue);
              const selectOptions = fieldOptionsByKey[key] || SINGLE_SELECT_OPTIONS[key];
              const multiSelectOptions = MULTI_SELECT_OPTIONS[key];
              const useDatePicker = isDateLikeKey(key) && typeof currentValue === "string";
              const useTextarea =
                typeof currentValue === "object" ||
                editorValue.includes("\n") ||
                editorValue.length > 80 ||
                (Array.isArray(currentValue) && !multiSelectOptions);

                  return (
                    <Table.Row key={key} id={key}>
                  <Table.Cell className="align-top">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">{key}</p>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <div className="w-full max-w-[30rem]">
                      {BOOLEAN_KEYS.has(key) || typeof currentValue === "boolean" ? (
                        <div className="flex w-full justify-end rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                          <Switch
                            aria-label={label}
                            isSelected={Boolean(Number(currentValue)) || currentValue === true}
                            onChange={nextValue => onChange({ ...value, [key]: nextValue ? 1 : 0 })}
                          />
                        </div>
                      ) : selectOptions ? (
                        <AdminSelectField
                          ariaLabel={label}
                          options={mergeOptions(selectOptions, currentValue)}
                          selectedKey={currentValue === null || typeof currentValue === "undefined" ? null : String(currentValue)}
                          onSelectionChange={nextValue =>
                            onChange({
                              ...value,
                              [key]: coerceSelectValue(currentValue, nextValue),
                            })
                          }
                        />
                      ) : multiSelectOptions ? (
                        <AdminMultiSelectField
                          ariaLabel={label}
                          options={mergeOptions(multiSelectOptions, currentValue)}
                          selectedKeys={new Set(Array.isArray(currentValue) ? currentValue.map(item => String(item)) : [])}
                          onSelectionChange={keys =>
                            onChange({
                              ...value,
                              [key]: keys === "all"
                                ? mergeOptions(multiSelectOptions, currentValue).map(option => option.id)
                                : Array.from(keys).map(item => String(item)),
                            })
                          }
                        />
                      ) : useDatePicker ? (
                        <DateFieldEditor
                          label={label}
                          value={currentValue}
                          onChange={nextValue =>
                            onChange({
                              ...value,
                              [key]: nextValue,
                            })
                          }
                        />
                      ) : useTextarea ? (
                        <TextArea
                          aria-label={label}
                          className="w-full"
                          rows={4}
                          value={editorValue}
                          onChange={event =>
                            onChange({
                              ...value,
                              [key]: parseTextValue(currentValue, event.target.value),
                            })
                          }
                        />
                      ) : (
                        <Input
                          aria-label={label}
                          className="w-full"
                          type={typeof currentValue === "number" ? "number" : "text"}
                          value={editorValue}
                          onChange={event =>
                            onChange({
                              ...value,
                              [key]: parseTextValue(currentValue, event.target.value),
                            })
                          }
                        />
                      )}
                    </div>
                  </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  );
}
