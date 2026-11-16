"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app", label: "Dashboard", exact: true, icon: "M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 8h6V4h-6z" },
  { href: "/app/quotes", label: "Quotes", icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4" },
  { href: "/app/invoices", label: "Invoices", icon: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6" },
  { href: "/app/customers", label: "Customers", icon: "M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1a3.5 3.5 0 0 0-2.5-3.4M15.5 4.3a3.5 3.5 0 0 1 0 6.4" },
  { href: "/app/catalog", label: "Price list", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/app/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  // Highlight the clicked item immediately; it only counts until the page it was clicked on changes.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const target = clicked && clicked.from === pathname ? clicked.href : null;
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((item) => {
        const active = target
          ? item.href === target
          : item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => { setClicked({ href: item.href, from: pathname }); onNavigate?.(); }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-neutral-900 text-white shadow-soft"
                : "text-neutral-600 hover:bg-white hover:text-neutral-900 hover:shadow-soft",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className={cn("size-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110", active ? "text-brand-400" : "text-neutral-400 group-hover:text-brand-600")}
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            >
              <path d={item.icon} />
            </svg>
            {item.label}
            {active && <span aria-hidden className="ml-auto size-1.5 rounded-full bg-brand-400" />}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The app frame: a fixed sidebar on large screens, a top bar with a sliding menu below that.
 * Server-rendered pieces (account, sign-out) come in as props.
 */
export function AppShell({ account, footer, children }: { account: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  // The menu is open only on the page it was opened from, so navigating closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (v: boolean) => setOpenedOn(v ? pathname : null);

  // Lock page scroll while it is open, and let Escape close it.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Large screens: sticky sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-neutral-200/70 bg-white p-5 lg:flex print:hidden">
        <Link href="/app" className="px-1"><Logo /></Link>
        <NavLinks />
        <div className="mt-auto space-y-3">
          {account}
          {footer}
        </div>
      </aside>

      {/* Small screens: top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200/70 bg-white/80 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <Link href="/app"><Logo /></Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[57px] z-20 lg:hidden print:hidden">
          <button aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 animate-fade bg-neutral-900/40 backdrop-blur-[2px]" />
          <div id="mobile-menu" className="relative flex max-h-full animate-drawer flex-col gap-5 overflow-y-auto border-b border-neutral-200 bg-white p-4 shadow-lift">
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="space-y-3 border-t border-neutral-200 pt-4">
              {account}
              {footer}
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10 print:p-0">
        <div key={pathname} className="w-full animate-enter">{children}</div>
      </main>
    </div>
  );
}
