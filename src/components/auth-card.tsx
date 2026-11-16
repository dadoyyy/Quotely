import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

const POINTS = [
  { t: "Quotes from your own price list", d: "Pick items, set quantities. Totals are exact to the centavo." },
  { t: "One private link per quote", d: "Customers approve from any phone, with no account." },
  { t: "Your margin stays yours", d: "Cost and profit are never part of what the customer sees." },
];

const ROWS = [
  ["Floor tile installation", "₱5,687.50"],
  ["Porcelain tile 60x60", "₱9,281.25"],
  ["Interior repaint", "₱10,206.00"],
];

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex min-h-screen flex-col px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        <Link href="/" className="inline-block w-fit"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="animate-enter">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-[2rem]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-neutral-600">{subtitle}</p>}
          </div>
          <div className="animate-enter mt-8 [animation-delay:60ms]">{children}</div>
          {footer && (
            <p className="animate-enter mt-8 text-sm text-neutral-600 [animation-delay:100ms] [&_a]:font-semibold [&_a]:text-neutral-900 [&_a]:underline [&_a]:decoration-brand-500 [&_a]:decoration-2 [&_a]:underline-offset-4">{footer}</p>
          )}
        </div>
        <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Quotely</p>
      </section>

      <aside aria-hidden className="relative hidden overflow-hidden bg-neutral-900 text-white lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-24">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <p className="relative max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
          Send the quote.<br /><span className="text-brand-400">Get the yes.</span>
        </p>

        <div className="relative my-10 max-w-md rounded-2xl bg-white p-5 text-neutral-900 shadow-lift">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 text-xs">
            <span className="font-semibold">Quotation QT-2026-0042</span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-800">Approved</span>
          </div>
          <ul className="divide-y divide-neutral-100 text-sm">
            {ROWS.map(([n, p]) => (
              <li key={n} className="flex justify-between py-2.5"><span>{n}</span><span className="font-medium tabular-nums">{p}</span></li>
            ))}
          </ul>
          <div className="flex items-end justify-between border-t border-neutral-200 pt-3">
            <span className="text-xs text-neutral-500">Total</span>
            <span className="text-2xl font-semibold tabular-nums">₱25,174.75</span>
          </div>
        </div>

        <ul className="relative max-w-md space-y-5">
          {POINTS.map((p) => (
            <li key={p.t} className="flex gap-3">
              <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand-400 text-neutral-900">
                <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </span>
              <div>
                <p className="text-sm font-semibold">{p.t}</p>
                <p className="mt-0.5 text-sm text-neutral-400">{p.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
