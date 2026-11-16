import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

const Check = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("size-3", className)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);

const LOGIN_POINTS = [
  { t: "Quotes from your own price list", d: "Pick items, set quantities. Totals are exact to the centavo." },
  { t: "One private link per quote", d: "Customers approve from any phone, with no account." },
  { t: "Your margin stays yours", d: "Cost and profit are never part of what the customer sees." },
];

const SIGNUP_STEPS = [
  { t: "Create your account", d: "Just an email and a password." },
  { t: "Pick a ready-made price list", d: "Home renovation, events or aircon repair. Change any price." },
  { t: "Send your first quote", d: "Share the private link and wait for the tap." },
];

const ROWS = [
  ["Floor tile installation", "₱5,687.50"],
  ["Porcelain tile 60x60", "₱9,281.25"],
  ["Interior repaint", "₱10,206.00"],
];

function Backdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <svg viewBox="0 0 600 600" className="absolute -right-48 top-1/4 size-[640px] opacity-70" fill="none">
        <g className="fx-spin"><circle cx="300" cy="300" r="260" stroke="#a2d44a" strokeOpacity=".22" strokeWidth="1.5" strokeDasharray="4 10" /><circle cx="560" cy="300" r="7" fill="#a2d44a" /></g>
        <g className="fx-spin-rev"><circle cx="300" cy="300" r="190" stroke="#a2d44a" strokeOpacity=".16" strokeWidth="1.5" /><circle cx="110" cy="300" r="5" fill="#cdee80" /></g>
      </svg>
    </>
  );
}

function QuoteCard() {
  return (
    <div className="relative my-14 max-w-md">
      <div className="fx-float rounded-2xl bg-white p-5 text-neutral-900 shadow-lift">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3 text-xs">
          <span className="font-semibold">Quotation QT-2026-0042</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-800"><Check className="size-2.5" />Approved</span>
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
      <div className="fx-float-b absolute -right-6 -top-5 flex items-center gap-2 rounded-full bg-brand-400 py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-neutral-900 shadow-lift">
        <span className="relative grid size-6 place-items-center rounded-full bg-neutral-900 text-brand-400"><span className="fx-ping absolute inset-0 rounded-full bg-neutral-900" /><Check className="relative" /></span>
        Customer approved
      </div>
      <div className="fx-float-c absolute -bottom-11 left-8 rounded-xl border border-white/10 bg-neutral-800 px-3.5 py-2 shadow-lift">
        <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Only you see this</p>
        <p className="text-sm font-semibold tabular-nums text-brand-400">Margin 32%</p>
      </div>
    </div>
  );
}

function Steps() {
  return (
    <ol className="relative my-10 max-w-md space-y-4">
      <div aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px border-l-2 border-dashed border-brand-400/40" />
      {SIGNUP_STEPS.map((s, i) => (
        <li key={s.t} className={cn("relative flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm", i === 0 ? "fx-float" : i === 1 ? "fx-float-b" : "fx-float-c")}>
          <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-brand-400 text-sm font-bold text-neutral-900">{i + 1}</span>
          <div>
            <p className="font-semibold">{s.t}</p>
            <p className="mt-0.5 text-sm text-neutral-400">{s.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  mode = "login",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  mode?: "login" | "signup";
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative flex min-h-screen flex-col px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block w-fit"><Logo /></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="animate-enter">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              <span className="size-1.5 rounded-full bg-brand-500" />
              {mode === "login" ? "Sign in" : "Create account"}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-[2.1rem]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-neutral-600">{subtitle}</p>}
          </div>
          <div className="animate-enter mt-8 [animation-delay:60ms]">{children}</div>
          <p className="animate-enter mt-6 flex items-center gap-2 text-xs text-neutral-500 [animation-delay:100ms]">
            <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
            Your quotes and customers stay private to your business.
          </p>
          {footer && (
            <p className="animate-enter mt-6 border-t border-neutral-200 pt-6 text-sm text-neutral-600 [animation-delay:140ms] [&_a]:font-semibold [&_a]:text-neutral-900 [&_a]:underline [&_a]:decoration-brand-500 [&_a]:decoration-2 [&_a]:underline-offset-4">{footer}</p>
          )}
        </div>
        <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Quotely</p>
      </section>

      <aside aria-hidden className="relative hidden overflow-hidden bg-neutral-900 text-white lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-24">
        <Backdrop />
        <div className="relative">
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            {mode === "login" ? <>Send the quote.<br /><span className="text-brand-400">Get the yes.</span></> : <>Up and running<br /><span className="text-brand-400">in minutes.</span></>}
          </p>
          {mode === "login" ? <QuoteCard /> : <Steps />}
          {mode === "login" && (
            <ul className="max-w-md space-y-5">
              {LOGIN_POINTS.map((p) => (
                <li key={p.t} className="flex gap-3">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand-400 text-neutral-900"><Check /></span>
                  <div>
                    <p className="text-sm font-semibold">{p.t}</p>
                    <p className="mt-0.5 text-sm text-neutral-400">{p.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {mode === "signup" && <p className="max-w-md text-sm text-neutral-400">Customers never need an account to approve your quotes.</p>}
        </div>
      </aside>
    </main>
  );
}
