import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

describe("timeline", () => {
  it("merges events and comments, newest first, naming who did what", () => {
    const t = buildTimeline(
      [
        { id: "1", type: "sent", actor_type: "staff", actor_label: null, created_at: "2026-11-16T01:00:00Z" },
        { id: "2", type: "viewed", actor_type: "customer", actor_label: null, created_at: "2026-11-16T02:00:00Z" },
        { id: "3", type: "changes_requested", actor_type: "customer", actor_label: "Maria Cruz", created_at: "2026-11-16T03:00:00Z" },
      ],
      [{ id: "9", author_label: "Maria Cruz", body: "Different tile please", created_at: "2026-11-16T03:00:00Z" }],
    );
    expect(t.map((x) => x.title)).toEqual([
      "Message from Maria Cruz", // same instant: the comment is written just after the event, so it sorts first
      "Maria Cruz asked for changes",
      "Customer opened the quote",
      "Sent to customer",
    ]);
    expect(t[0].body).toBe("Different tile please");
  });
  it("falls back gracefully for unknown event types and anonymous customers", () => {
    const t = buildTimeline([{ id: "1", type: "reminder_sent", actor_type: "system", actor_label: null, created_at: "2026-11-16T01:00:00Z" }], []);
    expect(t[0].title).toBe("reminder sent");
    expect(buildTimeline([{ id: "2", type: "approved", actor_type: "customer", actor_label: null, created_at: "x" }], [])[0].title).toBe("The customer approved the quote");
  });
});
