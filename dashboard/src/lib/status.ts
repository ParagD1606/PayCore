export type StatusTone = "default" | "success" | "warning" | "danger" | "muted";

export function orderStatusTone(status: string): StatusTone {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
      return "muted";
    default:
      return "default";
  }
}

export function paymentStatusTone(status: string): StatusTone {
  switch (status) {
    case "succeeded":
      return "success";
    case "failed":
      return "danger";
    case "processing":
    case "requires_action":
    case "requires_payment_method":
      return "warning";
    case "cancelled":
      return "muted";
    default:
      return "default";
  }
}

export function ledgerTypeTone(type: string): StatusTone {
  switch (type) {
    case "payment_capture":
      return "success";
    case "reversal":
    case "refund":
      return "warning";
    case "adjustment":
      return "default";
    default:
      return "muted";
  }
}

export function humanizeStatus(status: string): string {
  return status.replaceAll("_", " ");
}
