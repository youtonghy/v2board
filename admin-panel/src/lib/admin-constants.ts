export const PERIOD_OPTIONS = [
  { key: "month_price", label: "Monthly" },
  { key: "quarter_price", label: "Quarterly" },
  { key: "half_year_price", label: "Half Year" },
  { key: "year_price", label: "Yearly" },
  { key: "two_year_price", label: "Two Years" },
  { key: "three_year_price", label: "Three Years" },
  { key: "onetime_price", label: "One Time" },
  { key: "reset_price", label: "Reset Package" }
] as const;

export const RESET_TRAFFIC_OPTIONS = [
  { key: "null", label: "Follow system default", value: null },
  { key: "0", label: "First day of every month", value: 0 },
  { key: "1", label: "Monthly reset", value: 1 },
  { key: "2", label: "Never reset", value: 2 },
  { key: "3", label: "January 1st every year", value: 3 },
  { key: "4", label: "Yearly reset", value: 4 }
] as const;

export const COUPON_TYPE_OPTIONS = [
  { key: "1", label: "Amount", value: 1 },
  { key: "2", label: "Percentage", value: 2 }
] as const;

export const GIFTCARD_TYPE_OPTIONS = [
  { key: "1", label: "Account Balance", value: 1 },
  { key: "2", label: "Subscription Days", value: 2 },
  { key: "3", label: "Transfer Data", value: 3 },
  { key: "4", label: "Reset Traffic", value: 4 },
  { key: "5", label: "Plan Exchange", value: 5 }
] as const;

export function toDatetimeInput(timestamp?: number | string | null): string {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp) * 1000);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDatetimeInput(value: string): number | null {
  if (!value) return null;
  return Math.floor(new Date(value).getTime() / 1000);
}
