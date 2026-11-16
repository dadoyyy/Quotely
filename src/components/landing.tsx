import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

const FEATURES = [
  { title: "Quote from your price list", body: "Labor, materials and fees with your markup. Totals, VAT, discounts and deposits are calculated for you, to the centavo.", icon: "M4 6h16M4 12h16M4 18h10" },
  { title: "Describe the job, get a draft", body: "Paste the customer's message or a photo. AI suggests items from your own price list and never invents a price.", icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" },
  { title: "One link to approve", body: "Customers read, approve, decline or ask for changes on a private page. No account needed, and a sent quote can't be altered.", icon: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" },
  { title: "Invoice and export", body: "Turn an approved quote into an invoice, record payments, and export quotes, invoices and customers to CSV.", icon: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6" },
];

const INDUSTRIES = ["Home renovation", "Event organizers", "Aircon repair", "Freelancers"];

const STATS = [
  { value: "₱0.00", label: "Rounding drift", note: "Money is whole centavos, never floating point." },
  { value: "0", label: "Prices written by AI", note: "It picks items from your list. You set every price." },
  { value: "1", label: "Private link", note: "Approve, decline or request changes without an account." },
];

function Icon({ d, className = "size-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** A stylised quotation with floating status chips. Pure markup, so it scales and never loads an image. */
function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-md px-3 sm:px-8" aria-hidden>
      <div className="absolute inset-0 -z-10 rounded-[3rem] bg-gradient-to-br from-brand-200/70 via-brand-100/40 to-transparent blur-2xl" />
      <div className="absolute right-0 top-8 -z-10 size-72 rounded-full border border-brand-300/60" />
      <div className="absolute -right-6 top-2 -z-10 size-96 rounded-full border border-dashed border-brand-300/40" />

      <div className="mt-3 animate-float rounded-3xl border border-neutral-200 bg-white px-5 pb-10 pt-12 shadow-lift">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Quotation</p>
            <p className="font-semibold">QT-2026-0042</p>
          </div>
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">Approved</span>
        </div>
        <div className="mt-4 space-y-2.5 text-sm">
          {[["Floor tile installation", "₱5,687.50"], ["Porcelain tile 60x60", "₱8,437.50"], ["Interior repaint", "₱10,206.00"]].map(([n, p]) => (
            <div key={n} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
              <span className="text-neutral-700">{n}</span>
              <span className="font-medium tabular-nums">{p}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-neutral-200 pt-4">
          <span className="text-sm text-neutral-500">Total incl. VAT</span>
          <span className="text-2xl font-semibold tabular-nums">₱28,923.40</span>
        </div>
      </div>

      <div className="absolute left-8 top-0 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium shadow-lift sm:left-14">
        <span className="grid size-7 place-items-center rounded-full bg-brand-400 text-neutral-900"><Icon d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" className="size-4" /></span>
        AI draft ready
      </div>
      <div className="absolute -bottom-4 right-6 flex items-center gap-2 rounded-2xl bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-lift sm:right-12">
        <span className="size-2 rounded-full bg-brand-400" />
        Margin 32%
      </div>
      <div className="absolute -bottom-4 left-6 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium shadow-lift sm:left-12">
        <span className="grid size-7 place-items-center rounded-full bg-neutral-900 text-brand-400"><Icon d="m5 12.5 4.5 4.5L19 7.5" className="size-4" /></span>
        Customer approved
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-clip px-4 pb-10 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/"><Logo /></Link>
        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-medium text-neutral-600 md:flex">
          <a href="#features" className="hover:text-neutral-900">Features</a>
          <a href="#numbers" className="hover:text-neutral-900">Why it adds up</a>
          <Link href="/demo" className="hover:text-neutral-900">Demo</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</ButtonLink>
          <ButtonLink href="/signup" size="sm" arrow>Get started</ButtonLink>
        </div>
      </header>

      <section className="grid items-center gap-14 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-enter space-y-6">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-700">
            Quotes, approvals &amp; invoices
          </span>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            Quotes your customers
            <span className="relative mt-1 block text-brand-600">
              approve in one tap.
              <svg viewBox="0 0 300 12" className="absolute -bottom-2 left-0 h-2.5 w-3/4 text-brand-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" preserveAspectRatio="none" aria-hidden>
                <path d="M2 8c40-6 90-6 150-2s90 2 146-3" />
              </svg>
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            Built for freelancers, contractors and small shops. Build a quotation from your own price list, send it as a private link,
            and turn the approved quote into an invoice.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href="/signup" size="lg" arrow>Get started free</ButtonLink>
            <ButtonLink href="/demo" variant="secondary" size="lg" arrow>See a demo</ButtonLink>
          </div>
        </div>
        <div className="animate-enter [animation-delay:120ms]"><HeroArt /></div>
      </section>

      <section aria-label="Who it is for" className="rounded-3xl border border-neutral-200/80 bg-white/90 px-6 py-5 shadow-soft">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-medium text-neutral-500">Made for businesses that quote by the job</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-base font-semibold text-neutral-800">
            {INDUSTRIES.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      </section>

      <section id="features" className="scroll-mt-8 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Features</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Everything between “how much?” and “paid”</h2>
          <p className="mt-3 text-neutral-600">One tool for the whole job, from the first message to the last payment.</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="group rounded-3xl border border-neutral-200/80 bg-gradient-to-b from-brand-50/70 to-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-colors duration-300 group-hover:bg-brand-400 group-hover:text-neutral-900"><Icon d={f.icon} /></span>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-neutral-900 px-6 py-10 text-white sm:px-12 sm:py-14">
        <div aria-hidden className="absolute -right-10 -top-16 size-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 right-24 size-56 rounded-full border border-brand-400/30" />
        <div className="relative max-w-lg space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Let&apos;s make things happen</h2>
          <p className="text-neutral-300">Pick a sample price list, build your first quote in minutes, and send it before the customer loses interest.</p>
          <div className="pt-3"><ButtonLink href="/signup" variant="accent" size="lg" arrow>Create your first quote</ButtonLink></div>
        </div>
      </section>

      <section id="numbers" className="scroll-mt-8 py-16 sm:py-24">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Why it adds up</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Careful with your numbers</h2>
        </div>
        <div className="mt-8 grid overflow-hidden rounded-3xl bg-neutral-900 text-white md:grid-cols-3">
          {STATS.map((s, i) => (
            <div key={s.label} className={`p-6 sm:p-8 ${i ? "border-t border-white/10 md:border-l md:border-t-0" : ""}`}>
              <p className="text-4xl font-semibold tracking-tight text-brand-400 sm:text-5xl">{s.value}</p>
              <p className="mt-3 font-medium">{s.label}</p>
              <p className="mt-1 text-sm text-neutral-400">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-400 text-neutral-900"><Icon d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3 6-6a8 8 0 0 1 8-2 8 8 0 0 1-2 8l-6 6-3-3zM14.5 9.5h.01" className="size-5" /></span>
          <p className="font-medium text-neutral-900">Ready to quote like a pro? <span className="text-neutral-600">Try it with a sample price list.</span></p>
        </div>
        <ButtonLink href="/signup" arrow>Get started</ButtonLink>
      </section>

      <footer className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-6 text-sm text-neutral-500 sm:flex-row">
        <Logo />
        <nav aria-label="Footer" className="flex gap-6 font-medium">
          <Link href="/demo" className="hover:text-neutral-900">Demo</Link>
          <Link href="/login" className="hover:text-neutral-900">Sign in</Link>
          <Link href="/signup" className="hover:text-neutral-900">Sign up</Link>
        </nav>
        <p>© {new Date().getFullYear()} Quotely</p>
      </footer>
    </div>
  );
}

