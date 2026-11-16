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

const KINDS: Record<Kind, { label: string; chip: string; text: string; bar: string; path: string }> = {
  success: { label: "Done", chip: "bg-brand-400 text-neutral-900", text: "text-brand-400", bar: "bg-brand-400", path: "m5 12.5 4.5 4.5L19 7.5" },
  error: { label: "Something's wrong", chip: "bg-red-500 text-white", text: "text-red-400", bar: "bg-red-500", path: "M12 7v6M12 17h.01" },
  info: { label: "Heads up", chip: "bg-white/15 text-brand-300", text: "text-brand-300", bar: "bg-brand-300", path: "M12 8h.01M11 12h1v5h1" },
};

const SWIPE_AWAY = 80;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number } | null>(null);
  const remaining = useRef(toast.duration);
  const started = useRef(0);
  const holding = paused || dx !== 0;

  // A countdown that stops while the pointer is over the toast or a finger is dragging it.
  useEffect(() => {
    if (toast.leaving || holding) return;
    started.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(500, remaining.current - (Date.now() - started.current));
    };
  }, [holding, toast.id, toast.leaving, onDismiss]);

  const k = KINDS[toast.kind];
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button")) return; drag.current = { x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (drag.current) setDx(e.clientX - drag.current.x); }}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        if (Math.abs(dx) > SWIPE_AWAY) onDismiss(toast.id);
        setDx(0);
      }}
      onPointerCancel={() => { drag.current = null; setDx(0); }}
      style={dx ? { transform: `translateX(${dx}px)`, opacity: Math.max(0.3, 1 - Math.abs(dx) / 220), transition: "none" } : undefined}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm touch-pan-y select-none overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-lift ring-1",
        toast.kind === "error" ? "ring-red-400/40" : "ring-white/10",
        toast.leaving ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", k.bar)} />
      <div className="flex items-start gap-3 py-3 pl-4 pr-2.5">
        <span aria-hidden className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", k.chip)}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={k.path} />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", k.text)}>{k.label}</p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-white">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="grid size-7 shrink-0 place-items-center rounded-xl text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {/* Time left */}
      <div
        aria-hidden
        className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left animate-shrink opacity-80", k.bar)}
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: holding ? "paused" : "running" }}
      />
    </div>
  );
}
