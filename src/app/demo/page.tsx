import type { Metadata } from "next";
import Link from "next/link";
import { QuoteDocument } from "@/components/quote-document";
import { Badge, Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { DEMO_AI, buildDemo } from "@/lib/demo/fixture";
import { formatBps, formatCents } from "@/lib/money-format";
import { marginBps } from "@/lib/pricing/engine";

export const metadata: Metadata = {
  title: "Demo · Smart Quotation & Proposal Generator",
  description: "See a quotation from both sides: what the customer sees, and what only you see.",
};

export default function DemoPage() {
  const { priced, snapshot, internal } = buildDemo();
  const m = marginBps(priced);

  return (
    <main className="mx-auto max-w-5xl space-y-14 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <ButtonLink href="/login" variant="ghost" size="sm">Sign in</ButtonLink>
      </div>
      <header className="animate-enter space-y-4">
        <Badge tone="amber">Sample data, nothing here is saved</Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">One quotation, <span className="text-brand-600">both sides</span></h1>
        <p className="max-w-2xl text-neutral-600">
          Every number below is calculated live by the same pricing engine the app uses, from a sample renovation price list.
        </p>
        <div className="flex gap-3">
          <ButtonLink href="/signup" arrow>Try it with your own price list</ButtonLink>
          <Link href="/" className="self-center text-sm underline">Back</Link>
        </div>
      </header>

      <section className="animate-enter space-y-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold sm:text-2xl"><span className="grid size-8 place-items-center rounded-full bg-brand-400 text-sm font-bold text-neutral-900">1</span>Describe the job, get a draft</h2>
        <p className="text-sm text-neutral-600">
          The AI reads the customer&apos;s message (and photos) and picks items from <em>your</em> price list. It never writes a price,
          and it only fills in a quantity the customer actually stated. You review before anything is added.
        </p>
        <Card className="space-y-3 p-5 text-sm">
          <p className="rounded-xl bg-neutral-50 p-3 italic">&ldquo;{DEMO_AI.text}&rdquo;</p>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {DEMO_AI.matches.map((x) => (
              <li key={x.name} className="flex items-start justify-between gap-3 p-3">
                <div>
                  <div className="font-medium">{x.name}{x.quantity ? ` × ${x.quantity}` : ""}</div>
                  <div className="text-xs text-neutral-500">{x.reason}</div>
                </div>
                <div className="whitespace-nowrap text-right tabular-nums">
                  {formatCents(DEMO_AI.prices[x.name])}
                  <div className="text-xs text-neutral-500">from your price list</div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-neutral-600">Not in your price list: {DEMO_AI.unmatched.join(", ")}</p>
        </Card>
      </section>

      <section className="animate-enter space-y-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold sm:text-2xl"><span className="grid size-8 place-items-center rounded-full bg-brand-400 text-sm font-bold text-neutral-900">2</span>What only you see</h2>
        <p className="text-sm text-neutral-600">Cost, markup and margin stay private. They are never part of what the customer receives.</p>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <tr><th className="p-3">Item</th><th className="p-3 text-right">Your cost</th><th className="p-3 text-right">Markup</th><th className="p-3 text-right">Customer pays</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {internal.map((l) => (
                <tr key={l.id}>
                  <td className="p-3">{l.name}</td>
                  <td className="p-3 text-right tabular-nums">{formatCents(l.costCents)}</td>
                  <td className="p-3 text-right tabular-nums">{formatBps(l.markupBps)}</td>
                  <td className="p-3 text-right tabular-nums">{formatCents(l.netCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-sm">
          After the {formatBps(snapshot.totals.discount.value)} discount, your margin is <strong>{formatCents(priced.marginCents)}</strong> ({formatBps(m)}).
        </p>
      </section>

      <section className="animate-enter space-y-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold sm:text-2xl"><span className="grid size-8 place-items-center rounded-full bg-brand-400 text-sm font-bold text-neutral-900">3</span>What the customer gets</h2>
        <p className="text-sm text-neutral-600">
          A private link they can read, approve, decline or ask for changes on, with no account needed. Once sent, the document can&apos;t be altered.
        </p>
        <QuoteDocument snapshot={snapshot} />
      </section>

      <section className="animate-enter space-y-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold sm:text-2xl"><span className="grid size-8 place-items-center rounded-full bg-brand-400 text-sm font-bold text-neutral-900">4</span>Approved? Invoice it</h2>
        <p className="text-sm text-neutral-600">
          The invoice is a frozen copy of exactly what the customer approved. Record payment, or void it. Export quotes, invoices and customers to CSV any time.
        </p>
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
          <div>
            <p className="font-medium">INV-2026-0017 · Maria Santos</p>
            <p className="text-neutral-500">Due 2026-11-30</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums">{formatCents(priced.totalCents)}</span>
            <Badge tone="green">Paid</Badge>
          </div>
        </Card>
      </section>

      <footer className="rounded-3xl bg-neutral-900 p-8 text-center text-white">
        <p className="text-xl font-semibold">Ready to quote your own jobs?</p>
        <div className="mt-3 flex justify-center gap-3">
          <ButtonLink href="/signup" variant="accent" arrow>Get started</ButtonLink>
          <ButtonLink href="/login" variant="secondary">Sign in</ButtonLink>
        </div>
      </footer>
    </main>
  );
}
