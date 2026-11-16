"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; message: string; leaving: boolean; duration: number }

interface Api {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const noop = () => {};
const Ctx = createContext<Api>({ success: noop, error: noop, info: noop });

/** Show a toast from any client component. Outside a provider (tests, previews) it quietly does nothing. */
export const useToast = () => useContext(Ctx);

const DURATION: Record<Kind, number> = { success: 4000, info: 4500, error: 7000 };
const MAX = 4;
const EXIT_MS = 250;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback((kind: Kind, message: string) => {
    const text = message.trim();
    if (!text) return;
    setToasts((all) => {
      // The same message twice in a row would only be noise.
      if (all.some((t) => !t.leaving && t.kind === kind && t.message === text)) return all;
      const fresh: Toast = { id: next.current++, kind, message: text, leaving: false, duration: DURATION[kind] };
      return [...all, fresh].slice(-MAX);
    });
  }, []);

  const api = useMemo<Api>(
    () => ({ success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m) }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:items-end print:hidden"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

const ICONS: Record<Kind, { wrap: string; path: string }> = {
  success: { wrap: "bg-brand-400 text-neutral-900", path: "m5 12.5 4.5 4.5L19 7.5" },
  error: { wrap: "bg-red-500 text-white", path: "M7 7l10 10M17 7 7 17" },
  info: { wrap: "bg-neutral-900 text-brand-400", path: "M12 8h.01M11 12h1v5h1" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const started = useRef(0);

  // A countdown that stops while the pointer is over the toast.
  useEffect(() => {
    if (toast.leaving || paused) return;
    started.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(500, remaining.current - (Date.now() - started.current));
    };
  }, [paused, toast.id, toast.leaving, onDismiss]);

  const icon = ICONS[toast.kind];
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-white shadow-lift",
        toast.kind === "error" ? "border-red-200" : "border-neutral-200",
        toast.leaving ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pr-2.5">
        <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", icon.wrap)}>
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon.path} />
          </svg>
        </span>
        <p className="min-w-0 flex-1 py-0.5 text-sm font-medium leading-snug text-neutral-900">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="grid size-7 shrink-0 place-items-center rounded-2xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {/* Time left */}
      <div
        aria-hidden
        className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left animate-shrink", toast.kind === "error" ? "bg-red-400" : "bg-brand-400")}
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </div>
  );
}
