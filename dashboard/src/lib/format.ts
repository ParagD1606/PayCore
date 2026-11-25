import { format, parseISO, isValid } from "date-fns";

export function formatAmount(
  amount: string | number | null | undefined,
  currency = "INR"
): string {
  const value = typeof amount === "string" ? Number(amount) : Number(amount ?? 0);
  if (!Number.isFinite(value)) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (!isValid(date)) return "—";
  return format(date, "dd MMM yyyy, HH:mm");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (!isValid(date)) return "—";
  return format(date, "dd MMM yyyy");
}

export function shortenId(id: string, size = 8): string {
  if (!id) return "—";
  if (id.length <= size * 2) return id;
  return `${id.slice(0, size)}…${id.slice(-4)}`;
}
