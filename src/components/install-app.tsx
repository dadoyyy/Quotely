"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "none" | "prompt" | "ios";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * "Install app": uses the browser's own install dialog where it offers one (Chrome, Edge, Android, desktop),
 * and shows the Share > Add to Home Screen steps on iPhone and iPad, which have no such dialog.
 * Renders nothing once installed, or in browsers that cannot install.
 */
export function InstallApp({ className, variant = "secondary", size = "md" }: { className?: string; variant?: "primary" | "secondary" | "ghost" | "accent"; size?: "sm" | "md" | "lg" }) {
  const [mode, setMode] = useState<Mode>("none");
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const ios = isIos();
    // Reading browser state once on mount; there is nothing to subscribe to before the first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios) setMode("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("prompt");
    };
    const onInstalled = () => { setMode("none"); setEvent(null); setHelp(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "none") return null;

  const click = async () => {
    if (mode === "ios") return setHelp((v) => !v);
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    setMode("none");
  };

  return (
    <div className={cn("relative", className)}>
      <Button type="button" variant={variant} size={size} onClick={click} aria-expanded={mode === "ios" ? help : undefined} className="w-full">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />
        </svg>
        Install app
      </Button>
      {help && (
        <div role="dialog" aria-label="How to install on iPhone or iPad" className="absolute bottom-full left-0 right-0 z-40 mb-2 animate-drawer rounded-2xl border border-neutral-200 bg-white p-4 text-left text-sm shadow-lift">
          <p className="font-semibold text-neutral-900">Add Quotely to your Home Screen</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-neutral-600">
            <li>Open this page in <strong className="text-neutral-800">Safari</strong>.</li>
            <li>Tap the <strong className="text-neutral-800">Share</strong> button (the square with an arrow).</li>
            <li>Choose <strong className="text-neutral-800">Add to Home Screen</strong>, then <strong className="text-neutral-800">Add</strong>.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
