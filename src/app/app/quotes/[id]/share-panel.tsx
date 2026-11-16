"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlClass } from "@/components/ui/styles";
import type { ShareState } from "@/lib/quotes/share-state";
import { renewShareLink, sendQuote } from "../share-actions";

export function SharePanel({ quoteId, mode, customerEmail, emailConfigured }: { quoteId: string; mode: "send" | "renew"; customerEmail: string | null; emailConfigured: boolean }) {
  const [state, action, pending] = useActionState(mode === "send" ? sendQuote : renewShareLink, {} as ShareState);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.emailedTo) toast.success(`Quote emailed to ${state.emailedTo}.`);
    else if (state.link) toast.success("Customer link is ready.");
    if (state.emailError) toast.error(state.emailError);
  }, [state, toast]);

  const copy = async () => {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the field is selectable as a fallback */
    }
  };

  return (
    <Card className="space-y-3 p-5 text-sm">
      <h2 className="font-medium">{mode === "send" ? "Send to customer" : "Customer link"}</h2>
      {mode === "send" ? (
        <p className="text-neutral-600">
          Sending locks this quote, gives it a number, and creates a private link for your customer. To change it afterwards you&apos;ll make a new revision.
        </p>
      ) : (
        <p className="text-neutral-600">
          Links can&apos;t be shown again after they&apos;re created. Make a new one to share it again; any earlier link stops working.
        </p>
      )}

      {state.link && (
        <div className="space-y-2">
          {state.number && <p className="font-medium text-green-700">Sent as {state.number}.</p>}
          {state.emailedTo && <p className="text-green-700">Emailed to {state.emailedTo}.</p>}
          {state.emailError && <p role="alert" className="text-amber-700">{state.emailError}</p>}
          <div className="flex gap-2">
            <input readOnly value={state.link} aria-label="Customer link" onFocus={(e) => e.currentTarget.select()} className={controlClass} />
            <button type="button" onClick={copy} className={buttonClass("secondary")}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="text-xs text-neutral-500">Anyone with this link can view and answer the quote. Share it only with your customer.</p>
        </div>
      )}
      {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">{state.error}</p>}

      <form
        action={action}
        onSubmit={(e) => {
          if (mode === "send" && !window.confirm("Send this quote? It will be locked and numbered.")) e.preventDefault();
          if (mode === "renew" && !window.confirm("Make a new link? The old one will stop working.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={quoteId} />
        {customerEmail && emailConfigured ? (
          <div className="mb-3 space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="email" defaultChecked className="h-4 w-4 accent-neutral-900" />
              <span>Also email it to {customerEmail}</span>
            </label>
            <textarea name="message" rows={2} maxLength={1000} placeholder="Add a personal note (optional)" aria-label="Personal note" className={controlClass} />
          </div>
        ) : (
          <p className="mb-3 text-xs text-neutral-500">
            {!customerEmail ? "Add an email address to this customer to send the link by email." : "Email sending isn't set up yet, so you'll copy the link yourself."}
          </p>
        )}
        <button type="submit" disabled={pending || (mode === "send" && state.ok)} className={buttonClass(mode === "send" ? "primary" : "secondary")}>
          {pending ? "Working…" : mode === "send" ? "Send quote" : "Make a new link"}
        </button>
      </form>
    </Card>
  );
}
