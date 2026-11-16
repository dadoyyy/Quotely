"use client";

import { useEffect } from "react";

/**
 * Eases sections in as they scroll into view. Elements marked `.reveal` are only hidden once this
 * script is running, so without JavaScript (or with reduced motion) everything is simply visible.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("reveal-in");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    for (const el of els) {
      // Anything already on screen stays put; only what is below the fold waits for its moment.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue;
      el.classList.add("reveal-armed");
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return null;
}
