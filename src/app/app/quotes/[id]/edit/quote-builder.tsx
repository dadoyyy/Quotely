"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { formatBps, formatCents } from "@/lib/money-format";
import { marginBps } from "@/lib/pricing/engine";
import {
  applyCatalogItem, buildQuote, duplicateLine, emptyLine, groupLines, moveLine, newId, removeSection,
  type DiscountKind, type HeaderDraft, type LineDraft, type QuoteDraftState,
} from "@/lib/quotes/model";
import type { CatalogItemRow } from "@/lib/rows";
import { saveQuoteDraft } from "../../actions";
import { LineRow, type Column } from "./line-row";

export interface CustomerOption {
  id: string;
  name: string;
  company: string | null;
  is_vat_exempt: boolean;
}

interface Props {
  quoteId: string;
  quoteNumber: string | null;
  initial: QuoteDraftState;
  customers: CustomerOption[];
  catalog: CatalogItemRow[];
}

const CATALOG_LIST = "quote-catalog-items";

export function QuoteBuilder({ quoteId, quoteNumber, initial, customers, catalog }: Props) {
  const [state, setState] = useState<QuoteDraftState>(initial);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial));
  const [showErrors, setShowErrors] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const focusNext = useRef<{ id: string; col: Column } | null>(null);

  const built = useMemo(() => buildQuote(state), [state]);
  const json = useMemo(() => JSON.stringify(state), [state]);
  const dirty = json !== savedJson;
  const { priced } = built;
  const pricedById = useMemo(() => new Map((priced?.lines ?? []).map((l) => [l.id, l])), [priced]);
  const groups = useMemo(() => groupLines(state), [state]);
  const flat = useMemo(() => groups.flatMap((g) => g.lines), [groups]);
  const catalogByName = useMemo(() => new Map(catalog.map((c) => [c.name.trim().toLowerCase(), c])), [catalog]);

  /* ---------------------------------------------------------------- state helpers */

  const setHeader = (patch: Partial<HeaderDraft>) => setState((s) => ({ ...s, header: { ...s.header, ...patch } }));
  const updateLine = (id: string, patch: Partial<LineDraft>) =>
    setState((s) => ({ ...s, lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));

  const addLine = (sectionId: string | null, afterId?: string, from?: CatalogItemRow) => {
    const base = emptyLine(sectionId);
    const line = from ? applyCatalogItem(base, from) : base;
    focusNext.current = { id: line.id, col: from ? "qty" : "name" };
    setState((s) => {
      const i = afterId ? s.lines.findIndex((l) => l.id === afterId) : -1;
      const lines = s.lines.slice();
      lines.splice(i >= 0 ? i + 1 : lines.length, 0, line);
      return { ...s, lines };
    });
  };

  // Move focus to a field that was just created or targeted by Enter.
  useEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    focusNext.current = null;
    document.querySelector<HTMLInputElement>(`[data-line="${f.id}"][data-col="${f.col}"]`)?.focus();
  });

  /** Fill a line from the price list when its name matches an item and nothing was typed by hand yet. */
  const autofill = (line: LineDraft) => {
    if (line.catalogItemId || line.cost || line.markup || line.price) return line;
    const hit = catalogByName.get(line.name.trim().toLowerCase());
    return hit ? applyCatalogItem(line, hit) : line;
  };
  const onNameBlur = (id: string) =>
    setState((s) => {
      const line = s.lines.find((l) => l.id === id);
      if (!line) return s;
      const next = autofill(line);
      return next === line ? s : { ...s, lines: s.lines.map((l) => (l.id === id ? next : l)) };
    });

  const onEnter = (line: LineDraft, col: Column) => {
    if (col === "name") {
      onNameBlur(line.id);
      focusNext.current = { id: line.id, col: "qty" };
      setState((s) => ({ ...s })); // re-render so the focus effect runs
      return;
    }
    const i = flat.findIndex((l) => l.id === line.id);
    const next = flat[i + 1];
    if (next) {
      focusNext.current = { id: next.id, col };
      setState((s) => ({ ...s }));
    } else {
      addLine(line.sectionId, line.id);
    }
  };

  /* ---------------------------------------------------------------- saving */

  const save = useCallback(() => {
    if (pending) return;
    setShowErrors(true);
    if (!built.payload) {
      setStatus({ kind: "error", text: "Fix the highlighted fields, then save." });
      return;
    }
    const payload = built.payload;
    const snapshot = json;
    setStatus(null);
    startTransition(async () => {
      try {
        const r = await saveQuoteDraft(quoteId, payload);
        if (r.ok) {
          setSavedJson(snapshot);
          setStatus({ kind: "ok", text: `Saved at ${new Date(r.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` });
        } else {
          setStatus({ kind: "error", text: r.error });
        }
      } catch {
        setStatus({ kind: "error", text: "Couldn't reach the server. Your changes are still here; try again." });
      }
    });
  }, [pending, built.payload, json, quoteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ---------------------------------------------------------------- render */

  const h = state.header;
  const err = (k: string) => (showErrors ? built.headerErrors[k] : undefined);
  const margin = priced ? marginBps(priced) : 0;

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit quote</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{quoteNumber ?? "Draft, not numbered yet"}</p>
        </div>
        <Link href={`/app/quotes/${quoteId}`} className={buttonClass("ghost")}>View quote</Link>
      </div>

      <datalist id={CATALOG_LIST}>{catalog.map((c) => <option key={c.id} value={c.name} />)}</datalist>

      <div className="grid gap-4 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-4">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Labeled label="Customer" error={err("customerId")}>
              <select
                value={h.customerId}
                onChange={(e) => {
                  const c = customers.find((x) => x.id === e.target.value);
                  setHeader({ customerId: e.target.value, ...(c ? { vatExempt: c.is_vat_exempt } : {}) });
                }}
                className={cn(controlClass, err("customerId") && "border-red-500")}
              >
                <option value="">Choose a customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
              </select>
            </Labeled>
            <Labeled label="Title" error={err("title")}>
              <input value={h.title} maxLength={200} onChange={(e) => setHeader({ title: e.target.value })} className={cn(controlClass, err("title") && "border-red-500")} />
            </Labeled>
            <Labeled label="Issue date" error={err("issueDate")}>
              <input type="date" value={h.issueDate} onChange={(e) => setHeader({ issueDate: e.target.value })} className={controlClass} />
            </Labeled>
            <Labeled label="Valid until" error={err("validUntil")}>
              <input type="date" value={h.validUntil} onChange={(e) => setHeader({ validUntil: e.target.value })} className={cn(controlClass, err("validUntil") && "border-red-500")} />
            </Labeled>
            <div className="sm:col-span-2">
              <Labeled label="Scope of work" hint="Shown to the customer.">
                <textarea value={h.scope} maxLength={5000} rows={3} onChange={(e) => setHeader({ scope: e.target.value })} className={controlClass} />
              </Labeled>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Items</h2>
              <div className="flex flex-wrap items-center gap-2">
                {catalog.length > 0 && (
                  <select
                    aria-label="Add from price list"
                    value=""
                    onChange={(e) => {
                      const item = catalog.find((c) => c.id === e.target.value);
                      if (item) addLine(null, undefined, item);
                    }}
                    className={cn(controlClass, "w-auto py-1.5")}
                  >
                    <option value="">Add from price list…</option>
                    {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => setState((s) => ({ ...s, sections: [...s.sections, { id: newId(), title: "" }] }))} className={buttonClass("secondary", "sm")}>
                  Add section
                </button>
              </div>
            </div>

            <div className="hidden grid-cols-[1fr_5rem_6.5rem_7.5rem_4.5rem_7rem] gap-2 px-2 text-xs font-medium uppercase tracking-wide text-neutral-500 sm:grid">
              <span>Item</span><span className="text-right">Qty</span><span>Unit</span><span className="text-right">Price</span><span className="text-right">Disc %</span><span className="text-right">Total</span>
            </div>

            {groups.map((g) => (
              <div key={g.section?.id ?? "loose"} className="space-y-2">
                {g.section && (
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Section title"
                      placeholder="Section title, e.g. Demolition"
                      value={g.section.title}
                      maxLength={120}
                      onChange={(e) => setState((s) => ({ ...s, sections: s.sections.map((x) => (x.id === g.section!.id ? { ...x, title: e.target.value } : x)) }))}
                      className={cn(controlClass, "font-medium")}
                    />
                    <button type="button" onClick={() => setState((s) => removeSection(s, g.section!.id))} className={buttonClass("ghost", "sm")} aria-label={`Remove section ${g.section.title || "untitled"}`}>
                      Remove
                    </button>
                  </div>
                )}
                {g.lines.map((l, i) => (
                  <LineRow
                    key={l.id}
                    line={l}
                    index={flat.findIndex((x) => x.id === l.id)}
                    priced={pricedById.get(l.id)}
                    errors={showErrors ? built.lineErrors[l.id] : undefined}
                    sections={state.sections}
                    catalogListId={CATALOG_LIST}
                    canMoveUp={i > 0}
                    canMoveDown={i < g.lines.length - 1}
                    onChange={(patch) => updateLine(l.id, patch)}
                    onNameBlur={() => onNameBlur(l.id)}
                    onEnter={(col) => onEnter(l, col)}
                    onMove={(dir) => setState((s) => ({ ...s, lines: moveLine(s.lines, l.id, dir) }))}
                    onDuplicate={() => setState((s) => ({ ...s, lines: duplicateLine(s.lines, l.id) }))}
                    onRemove={() => setState((s) => ({ ...s, lines: s.lines.filter((x) => x.id !== l.id) }))}
                  />
                ))}
                <button type="button" onClick={() => addLine(g.section?.id ?? null, g.lines.at(-1)?.id)} className={buttonClass("secondary", "sm")}>
                  + Add item{g.section ? ` to ${g.section.title || "section"}` : ""}
                </button>
              </div>
            ))}
          </Card>

          <Card className="grid gap-4 p-5">
            <Labeled label="Terms and conditions" hint="Shown to the customer. Defaults come from Settings.">
              <textarea value={h.terms} maxLength={5000} rows={4} onChange={(e) => setHeader({ terms: e.target.value })} className={controlClass} />
            </Labeled>
            <Labeled label="Internal notes" hint="Only your team sees these.">
              <textarea value={h.notes} maxLength={5000} rows={2} onChange={(e) => setHeader({ notes: e.target.value })} className={controlClass} />
            </Labeled>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="space-y-3 p-5 text-sm">
            <Row label="Subtotal" value={money(priced?.subtotalCents)} />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="discount-kind" className="text-neutral-600 dark:text-neutral-400">Discount</label>
                <div className="flex items-center gap-1.5">
                  <select
                    id="discount-kind"
                    value={h.discountKind}
                    onChange={(e) => setHeader({ discountKind: e.target.value as DiscountKind, discountValue: "" })}
                    className={cn(controlClass, "w-24 px-2 py-1.5")}
                  >
                    <option value="none">None</option>
                    <option value="percent">%</option>
                    <option value="fixed">₱</option>
                  </select>
                  <input
                    aria-label="Discount value"
                    inputMode="decimal"
                    disabled={h.discountKind === "none"}
                    value={h.discountValue}
                    onChange={(e) => setHeader({ discountValue: e.target.value })}
                    className={cn(controlClass, "w-24 px-2 py-1.5 text-right tabular-nums", err("discountValue") && "border-red-500")}
                  />
                </div>
              </div>
              {err("discountValue") && <p role="alert" className="text-xs text-red-600">{err("discountValue")}</p>}
              {priced && priced.discountCents > 0 && <Row label="" value={`−${formatCents(priced.discountCents)}`} />}
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="vat-rate" className="text-neutral-600 dark:text-neutral-400">VAT %</label>
              <input
                id="vat-rate"
                inputMode="decimal"
                value={h.vatRate}
                onChange={(e) => setHeader({ vatRate: e.target.value })}
                className={cn(controlClass, "w-24 px-2 py-1.5 text-right tabular-nums", err("vatRate") && "border-red-500")}
              />
            </div>
            {err("vatRate") && <p role="alert" className="text-xs text-red-600">{err("vatRate")}</p>}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={h.vatExempt} onChange={(e) => setHeader({ vatExempt: e.target.checked })} className="h-4 w-4 accent-neutral-900 dark:accent-neutral-100" />
              <span>Customer is VAT-exempt</span>
            </label>
            <Row label="VAT" value={money(priced?.vatCents)} />

            <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <Row label="Total" value={money(priced?.totalCents)} strong />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label htmlFor="deposit" className="text-neutral-600 dark:text-neutral-400">Deposit %</label>
              <input
                id="deposit"
                inputMode="decimal"
                value={h.depositPercent}
                onChange={(e) => setHeader({ depositPercent: e.target.value })}
                className={cn(controlClass, "w-24 px-2 py-1.5 text-right tabular-nums", err("depositPercent") && "border-red-500")}
              />
            </div>
            {err("depositPercent") && <p role="alert" className="text-xs text-red-600">{err("depositPercent")}</p>}
            {priced && priced.depositCents > 0 && (
              <>
                <Row label="Deposit due" value={formatCents(priced.depositCents)} />
                <Row label="Balance" value={formatCents(priced.balanceCents)} />
              </>
            )}
            {built.pricingError && <p role="alert" className="text-xs text-red-600">{built.pricingError}</p>}
          </Card>

          <Card className="border-amber-300 bg-amber-50 p-5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">Internal · never shown to your customer</p>
            <Row label="Your cost" value={money(priced?.costCents)} />
            <div className="mt-2">
              <Row
                label="Margin"
                value={priced ? `${formatCents(priced.marginCents)} · ${formatBps(Math.abs(margin))}${margin < 0 ? " below cost" : ""}` : "—"}
              />
            </div>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p
            role="status"
            className={cn("text-sm", status?.kind === "error" ? "text-red-600 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400")}
          >
            {status?.text ?? (dirty ? "Unsaved changes" : "All changes saved")}
          </p>
          <div className="flex items-center gap-2">
            {priced && <span className="hidden text-sm font-medium tabular-nums sm:inline">Total {formatCents(priced.totalCents)}</span>}
            <button type="button" onClick={save} disabled={pending || !dirty} className={buttonClass("primary")}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const money = (cents: number | undefined) => (cents === undefined ? "—" : formatCents(cents));

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "text-base font-semibold")}>
      <span className={strong ? "" : "text-neutral-600 dark:text-neutral-400"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Labeled({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {error ? <span role="alert" className="block text-sm text-red-600 dark:text-red-400">{error}</span> : hint && <span className="block text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>}
    </label>
  );
}
