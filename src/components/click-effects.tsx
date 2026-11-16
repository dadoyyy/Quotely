"use client";

import { useEffect } from "react";

/**
 * A soft ripple from the point of contact on anything marked `.btn-fx` (every button and button-link,
 * plus the nav). One listener for the whole app, no per-button state.
 */
export function ClickEffects() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn-fx");
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const dot = document.createElement("span");
      dot.className = "fx-ripple";
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      window.setTimeout(() => dot.remove(), 900);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
