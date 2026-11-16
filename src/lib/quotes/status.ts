import type { QuoteStatus } from "../rows";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
  rejected: "Declined",
  changes_requested: "Changes requested",
  expired: "Expired",
  superseded: "Superseded",
  invoiced: "Invoiced",
};

export const STATUS_TONES: Record<QuoteStatus, "neutral" | "green" | "amber" | "red" | "blue"> = {
  draft: "neutral",
  sent: "blue",
  viewed: "blue",
  approved: "green",
  rejected: "red",
  changes_requested: "amber",
  expired: "neutral",
  superseded: "neutral",
  invoiced: "green",
};
