/** The quote's history for staff: audit events and the customer's comments, newest first. */
export interface TimelineEvent {
  id: string;
  type: string;
  actor_type: "staff" | "customer" | "system";
  actor_label: string | null;
  created_at: string;
}
export interface TimelineComment {
  id: string;
  author_label: string | null;
  body: string;
  created_at: string;
}
export interface TimelineItem {
  key: string;
  at: string;
  title: string;
  body?: string;
}

const LABELS: Record<string, (who: string) => string> = {
  sent: () => "Sent to customer",
  viewed: () => "Customer opened the quote",
  approved: (who) => `${who} approved the quote`,
  rejected: (who) => `${who} declined the quote`,
  changes_requested: (who) => `${who} asked for changes`,
  emailed: () => "Link emailed to the customer",
  link_renewed: () => "A new link was made; earlier links stopped working",
  expired: () => "The quote expired",
};

export function buildTimeline(events: TimelineEvent[], comments: TimelineComment[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...events.map((e) => ({
      key: `e${e.id}`,
      at: e.created_at,
      title: (LABELS[e.type] ?? (() => e.type.replace(/_/g, " ")))(e.actor_label ?? "The customer"),
    })),
    ...comments.map((c) => ({
      key: `c${c.id}`,
      at: c.created_at,
      title: `Message from ${c.author_label ?? "the customer"}`,
      body: c.body,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
}
