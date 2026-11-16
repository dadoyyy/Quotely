"use client";

import { useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { controlClass } from "@/components/ui/styles";
import type { AiMatch } from "@/lib/ai/types";
import type { CatalogItemRow } from "@/lib/rows";
import { draftFromDescription, markAiDraftAccepted, type AiDraftState } from "../../ai-actions";

export interface AiPick {
  item: CatalogItemRow;
  quantity: string | null;
}

interface Props {
  quoteId: string;
  catalog: CatalogItemRow[];
  onAdd: (picks: AiPick[]) => void;
}

/** Shrink a photo in the browser so uploads stay small and fast. Falls back to the original file. */
async function shrink(file: File, max = 1600): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function AiPanel({ quoteId, catalog, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [result, setResult] = useState<AiDraftState | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const byId = new Map(catalog.map((c) => [c.id, c]));

  const run = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("quoteId", quoteId);
      fd.set("description", description);
      for (const p of photos) fd.append("photos", await shrink(p));
      const out = await draftFromDescription({}, fd);
      setResult(out);
      if (out.error) toast.error(out.error);
      else if (!out.matches?.length) toast.info("Nothing in your price list matched.");
      else toast.success(`${out.matches.length} suggestion${out.matches.length === 1 ? "" : "s"} ready to review.`);
      setChecked(new Set((out.matches ?? []).map((m) => m.itemId)));
    });
  };

  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const add = () => {
    const picks: AiPick[] = [];
    for (const m of result?.matches ?? []) {
      const item = byId.get(m.itemId);
      if (item && checked.has(m.itemId)) picks.push({ item, quantity: m.quantity });
    }
    if (!picks.length) return;
    onAdd(picks);
    toast.success(`Added ${picks.length} item${picks.length === 1 ? "" : "s"} to the quote.`);
    if (result?.draftId) void markAiDraftAccepted(result.draftId);
    setResult(null);
    setDescription("");
    setPhotos([]);
    setOpen(false);
  };

  if (!open) {
    return (
      <Card className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-neutral-600">Describe the job and get suggested items from your price list.</p>
        <button type="button" className={buttonClass("secondary")} onClick={() => setOpen(true)}>Draft with AI</button>
      </Card>
    );
  }

  const matches: AiMatch[] = result?.matches ?? [];
  return (
    <Card className="space-y-3 p-5" aria-label="Draft with AI">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Draft with AI</h2>
        <button type="button" className={buttonClass("ghost")} onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="text-xs text-neutral-500">
        Suggestions come only from your price list, and prices always come from there too. Review before adding. Your description and photos are sent to Google Gemini.
      </p>
      <label className="block text-sm">
        <span className="font-medium">What does the customer need?</span>
        <textarea
          className={controlClass}
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Repaint two bedrooms, about 3 gallons each, and replace one door handle"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Photos"
          className="hidden"
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 3))}
        />
        <button type="button" className={buttonClass("secondary")} onClick={() => fileInput.current?.click()}>
          {photos.length ? `${photos.length} photo${photos.length > 1 ? "s" : ""} attached` : "Attach photos (up to 3)"}
        </button>
        <button type="button" className={buttonClass("primary")} disabled={busy || (!description.trim() && !photos.length)} onClick={run}>
          {busy ? "Thinking…" : "Suggest items"}
        </button>
      </div>

      {result?.error && <p role="alert" className="text-sm text-red-600">{result.error}</p>}

      {result && !result.error && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-sm text-neutral-600">Nothing in your price list matched. You can add items by hand.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
              {matches.map((m) => {
                const item = byId.get(m.itemId);
                if (!item) return null;
                return (
                  <li key={m.itemId} className="flex gap-3 p-3 text-sm">
                    <input type="checkbox" className="mt-1" checked={checked.has(m.itemId)} onChange={() => toggle(m.itemId)} aria-label={`Add ${item.name}`} />
                    <div>
                      <div className="font-medium">{item.name}{m.quantity ? ` × ${m.quantity}` : ""}</div>
                      <div className="text-xs text-neutral-500">{m.reason}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {(result.unmatched?.length ?? 0) > 0 && (
            <div className="text-sm">
              <div className="font-medium">Not in your price list</div>
              <ul className="list-disc pl-5 text-neutral-600">{result.unmatched?.map((u) => <li key={u}>{u}</li>)}</ul>
            </div>
          )}
          <div className="flex items-center gap-3">
            {matches.length > 0 && (
              <button type="button" className={buttonClass("primary")} disabled={checked.size === 0} onClick={add}>
                Add {checked.size} item{checked.size === 1 ? "" : "s"}
              </button>
            )}
            {result.remaining !== undefined && <span className="text-xs text-neutral-500">{result.remaining} AI drafts left today</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
