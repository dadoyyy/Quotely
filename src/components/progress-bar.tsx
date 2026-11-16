"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "loading" | "done";

/**
 * A thin bar across the top that starts the instant an internal link is clicked and finishes when the
 * new page arrives, so a slow server never feels like a dead click.
 */
export function ProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;
  const [phase, setPhase] = useState<Phase>("idle");
  const [seenAt, setSeenAt] = useState(here);
  const safety = useRef<number | undefined>(undefined);

  // The page changed: finish the bar.
  if (seenAt !== here) {
    setSeenAt(here);
    if (phase === "loading") setPhase("done");
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page or just a #hash
      setPhase("loading");
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => setPhase("idle"), 12000); // never get stuck
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(safety.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const t = window.setTimeout(() => setPhase("idle"), 350);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-[3px] print:hidden">
      <div
        className={
          phase === "done"
            ? "h-full w-full bg-brand-400 opacity-0 shadow-glow transition-[width,opacity] duration-300"
            : "h-full w-[8%] animate-progress bg-brand-400 shadow-glow"
        }
      />
    </div>
  );
}
