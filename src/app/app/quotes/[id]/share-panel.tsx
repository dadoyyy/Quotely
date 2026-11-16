"use client";

import { useActionState, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlClass } from "@/components/ui/styles";
import type { ShareState } from "@/lib/quotes/share-state";
import { renewShareLink, sendQuote } from "../share-actions";

export function SharePanel({ quoteId, mode }: { quoteId: string; mode: "send" | "renew" }) {
  const [state, action, pending] = useActionState(mode === "send" ? sendQuote : renewShareLink, {} as ShareState);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the field is selectable as a fallback */
    }
  };

  return (
    <Card className="space-y-3 p-5 text-sm">
      <h2 className="font-medium">{mode === "send" ? "Send to customer" : "Customer link"}</h2>
      {mode === "send" ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          Sending locks this quote, gives it a number, and creates a private link for your customer. To change it afterwards you&apos;ll make a new revision.
        </p>
      ) : (
        <p className="text-neutral-600 dark:text-neutral-400">
          Links can&apos;t be shown again after they&apos;re created. Make a new one to share it again; any earlier link stops working.
        </p>
      )}

      {state.link && (
        <div className="space-y-2">
          {state.number && <p className="font-medium text-green-700 dark:text-green-400">Sent as {state.number}.</p>}
          <div className="flex gap-2">
            <input readOnly value={state.link} aria-label="Customer link" onFocus={(e) => e.currentTarget.select()} className={controlClass} />
            <button type="button" onClick={copy} className={buttonClass("secondary")}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="text-xs text-neutral-500">Anyone with this link can view and answer the quote. Share it only with your customer.</p>
        </div>
      )}
      {state.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{state.error}</p>}

      <form
        action={action}
        onSubmit={(e) => {
          if (mode === "send" && !window.confirm("Send this quote? It will be locked and numbered.")) e.preventDefault();
          if (mode === "renew" && !window.confirm("Make a new link? The old one will stop working.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={quoteId} />
        <button type="submit" disabled={pending || (mode === "send" && state.ok)} className={buttonClass(mode === "send" ? "primary" : "secondary")}>
          {pending ? "Working…" : mode === "send" ? "Send quote" : "Make a new link"}
        </button>
      </form>
    </Card>
  );
}
