"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { respond, type RespondState } from "./actions";

type Mode = "approve" | "changes" | "reject";

const COPY: Record<Mode, { tab: string; button: string; pending: string }> = {
  approve: { tab: "Approve", button: "Approve this quote", pending: "Approving…" },
  changes: { tab: "Request changes", button: "Send my request", pending: "Sending…" },
  reject: { tab: "Decline", button: "Decline this quote", pending: "Sending…" },
};

export function ResponsePanel({ token, businessName }: { token: string; businessName: string }) {
  const [mode, setMode] = useState<Mode>("approve");
  const [state, action, pending] = useActionState(respond.bind(null, token), {} as RespondState);

  const toast = useToast();
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success("Your response has been sent.");
  }, [state, toast]);

  if (state.ok) {
    const done = { approved: "Thank you. You've approved this quote.", changes_requested: "Thanks. Your request has been sent.", rejected: "Thanks for letting us know. Your response has been sent." }[state.status ?? ""] ?? "Thank you. Your response has been recorded.";
    return (
      <div role="status" className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-900">
        <p className="font-medium">{done}</p>
        <p className="mt-1">{businessName} has been notified.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm print:hidden">
      <h2 className="font-semibold">Your response</h2>
      <div role="tablist" aria-label="Response" className="flex flex-wrap gap-1">
        {(Object.keys(COPY) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("rounded-xl px-3 py-1.5 text-sm font-medium", mode === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")}
          >
            {COPY[m].tab}
          </button>
        ))}
      </div>
      <input type="hidden" name="action" value={mode} />

      {mode === "approve" ? (
        <>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Your full name</span>
            <input name="name" autoComplete="name" maxLength={120} required className={controlClass} />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="accept" required className="mt-0.5 h-4 w-4 accent-neutral-900" />
            <span>I accept this quote and its terms, as written above.</span>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Note (optional)</span>
            <textarea name="note" maxLength={2000} rows={2} className={controlClass} />
          </label>
        </>
      ) : (
        <>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Your name (optional)</span>
            <input name="name" autoComplete="name" maxLength={120} className={controlClass} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{mode === "changes" ? "What would you like changed?" : "Why are you declining?"}</span>
            <textarea name="note" maxLength={2000} rows={4} required className={controlClass} />
          </label>
        </>
      )}

      {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass(mode === "reject" ? "danger" : "primary")}>
        {pending ? COPY[mode].pending : COPY[mode].button}
      </button>
    </form>
  );
}
