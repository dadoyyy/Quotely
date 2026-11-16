"use client";

import { useState, type KeyboardEvent } from "react";
import { controlClass } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { CATALOG_KINDS, KIND_LABELS, UNITS, UNIT_LABELS } from "@/lib/constants";
import { formatCents } from "@/lib/money-format";
import type { FieldErrors, LineDraft, SectionDraft } from "@/lib/quotes/model";
import type { PricedLine } from "@/lib/pricing/types";

export type Column = "name" | "qty" | "price" | "disc";

interface Props {
  line: LineDraft;
  index: number;
  priced: PricedLine | undefined;
  errors: FieldErrors | undefined;
  sections: SectionDraft[];
  catalogListId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<LineDraft>) => void;
  onNameBlur: () => void;
  onEnter: (column: Column) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const cell = (invalid: boolean) => cn(controlClass, "px-2 py-1.5", invalid && "border-red-500");

export function LineRow(p: Props) {
  const { line, errors } = p;
  const [open, setOpen] = useState(false);
  const n = p.index + 1;

  const key = (column: Column) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      p.onEnter(column);
    }
  };
  const common = (column: Column) => ({ "data-line": line.id, "data-col": column, onKeyDown: key(column) });

  const lineMargin = p.priced ? p.priced.netCents - p.priced.allocatedDiscountCents - p.priced.costCents : null;
  const messages = errors ? Object.values(errors) : [];

  return (
    <div className="rounded-xl border border-neutral-200 p-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_6.5rem_7.5rem_4.5rem_7rem]">
        <div className="col-span-2 sm:col-span-1">
          <input
            {...common("name")}
            aria-label={`Item name, line ${n}`}
            aria-invalid={errors?.name ? true : undefined}
            list={p.catalogListId}
            placeholder="Item or service"
            value={line.name}
            onChange={(e) => p.onChange({ name: e.target.value })}
            onBlur={p.onNameBlur}
            className={cell(Boolean(errors?.name))}
          />
        </div>
        <div>
          <input
            {...common("qty")}
            aria-label={`Quantity, line ${n}`}
            aria-invalid={errors?.quantity ? true : undefined}
            inputMode="decimal"
            placeholder="Qty"
            value={line.quantity}
            onChange={(e) => p.onChange({ quantity: e.target.value })}
            className={cn(cell(Boolean(errors?.quantity)), "text-right tabular-nums")}
          />
        </div>
        <div>
          <select
            aria-label={`Unit, line ${n}`}
            value={line.unit}
            onChange={(e) => p.onChange({ unit: e.target.value as LineDraft["unit"] })}
            className={cell(false)}
          >
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </div>
        <div>
          <input
            {...common("price")}
            aria-label={`Unit price, line ${n}`}
            aria-invalid={errors?.price ? true : undefined}
            inputMode="decimal"
            placeholder={p.priced ? formatCents(p.priced.unitPriceCents).replace("₱", "") : "Price"}
            value={line.price}
            onChange={(e) => p.onChange({ price: e.target.value })}
            className={cn(cell(Boolean(errors?.price)), "text-right tabular-nums")}
          />
        </div>
        <div>
          <input
            {...common("disc")}
            aria-label={`Discount percent, line ${n}`}
            aria-invalid={errors?.discount ? true : undefined}
            inputMode="decimal"
            placeholder="Disc %"
            value={line.discount}
            onChange={(e) => p.onChange({ discount: e.target.value })}
            className={cn(cell(Boolean(errors?.discount)), "text-right tabular-nums")}
          />
        </div>
        <div className="flex items-center justify-end text-sm font-medium tabular-nums sm:col-span-1" aria-label={`Line total, line ${n}`}>
          {p.priced ? formatCents(p.priced.netCents) : "—"}
        </div>
      </div>

      {messages.length > 0 && <p role="alert" className="mt-1 text-xs text-red-600">{messages.join(" · ")}</p>}

      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="rounded px-2 py-1 text-neutral-600 hover:bg-neutral-100">
          {open ? "Hide details" : "Details"}
        </button>
        <button type="button" onClick={() => p.onMove(-1)} disabled={!p.canMoveUp} aria-label={`Move line ${n} up`} className="rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-30">↑</button>
        <button type="button" onClick={() => p.onMove(1)} disabled={!p.canMoveDown} aria-label={`Move line ${n} down`} className="rounded px-2 py-1 hover:bg-neutral-100 disabled:opacity-30">↓</button>
        <button type="button" onClick={p.onDuplicate} className="rounded px-2 py-1 hover:bg-neutral-100">Duplicate</button>
        <button type="button" onClick={p.onRemove} aria-label={`Delete line ${n}`} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">Delete</button>
        {line.catalogItemId && <span className="ml-auto text-neutral-500">From price list</span>}
      </div>

      {open && (
        <div className="mt-2 grid gap-3 border-t border-neutral-200 pt-3 text-sm sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium">Description (shown to the customer)</span>
            <textarea value={line.description} onChange={(e) => p.onChange({ description: e.target.value })} rows={2} maxLength={2000} className={controlClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Type</span>
            <select value={line.kind} onChange={(e) => p.onChange({ kind: e.target.value as LineDraft["kind"] })} className={controlClass}>
              {CATALOG_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Section</span>
            <select value={line.sectionId ?? ""} onChange={(e) => p.onChange({ sectionId: e.target.value || null })} className={controlClass}>
              <option value="">No section</option>
              {p.sections.map((s) => <option key={s.id} value={s.id}>{s.title || "Untitled section"}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Your cost per unit (₱)</span>
            <input inputMode="decimal" value={line.cost} aria-invalid={errors?.cost ? true : undefined} onChange={(e) => p.onChange({ cost: e.target.value })} className={cell(Boolean(errors?.cost))} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Markup over cost (%)</span>
            <input inputMode="decimal" value={line.markup} aria-invalid={errors?.markup ? true : undefined} onChange={(e) => p.onChange({ markup: e.target.value })} className={cell(Boolean(errors?.markup))} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={line.taxable} onChange={(e) => p.onChange({ taxable: e.target.checked })} className="h-4 w-4 accent-neutral-900" />
            <span>Charge VAT on this line</span>
          </label>
          {lineMargin !== null && (
            <p className="text-xs text-amber-800" data-testid={`margin-${line.id}`}>
              Internal margin on this line: {formatCents(lineMargin)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
