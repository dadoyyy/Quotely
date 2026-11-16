import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/money-format";
import { resolvePrice } from "@/lib/pricing/catalog-price";
import { SAMPLE_CATALOGS } from "@/lib/seed/catalogs";
import { UNIT_LABELS } from "@/lib/constants";
import { InstallApp } from "@/components/install-app";
import { AiArt, ApproveArt, BandArt, HeroArt, InvoiceArt, PriceListArt } from "./art";
import { BuilderMock, PhoneMock } from "./mocks";
import { RevealOnScroll } from "./reveal";

/* ------------------------------------------------------------------ small pieces */

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function CircleArrow({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-white transition-transform duration-300 group-hover:translate-x-1", className)}>
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
    </span>
  );
}

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.18em] text-brand-600", className)}>{children}</p>;
}

function SectionHead({ eyebrow, title, sub, className }: { eyebrow: string; title: ReactNode; sub?: string; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg">{sub}</p>}
    </div>
  );
}

const Swoosh = () => (
  <svg viewBox="0 0 300 12" className="absolute -bottom-2 left-0 h-3 w-[85%] text-brand-400" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" preserveAspectRatio="none" aria-hidden>
    <path d="M2 8c44-7 96-7 156-2s88 2 140-3" />
  </svg>
);

/* ------------------------------------------------------------------ content */

const NAV = [
  { href: "#what", label: "What it does" },
  { href: "#how", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#faq", label: "FAQ" },
];

const INDUSTRIES = [
  { name: "Home renovation", d: "M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6" },
  { name: "Event organizers", d: "M4 20 9 7l8 8zM14 4l1 3M19 8l-3 1M18 14l3 1" },
  { name: "Aircon repair", d: "M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4l3 2 3-2M9 20l3-2 3 2" },
  { name: "Freelancers", d: "M3 6h18v11H3zM8 21h8M12 17v4" },
  { name: "Small shops", d: "M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" },
];

const WHAT = [
  { title: "Price list that prices for you", body: "Save your labor, materials and fees once. Cost plus markup becomes the price on every quote.", Art: PriceListArt, href: "#how" },
  { title: "AI drafts from a message", body: "Paste what the customer wrote or attach photos. It suggests items from your list and never writes a price.", Art: AiArt, href: "/demo" },
  { title: "Approve from a private link", body: "Customers read, approve, decline or ask for changes on their phone. No account, no app.", Art: ApproveArt, href: "/demo" },
  { title: "Invoice and get paid", body: "One click turns an approved quote into a numbered invoice. Record payment, flag overdue, export to CSV.", Art: InvoiceArt, href: "#how" },
];

const STEPS = [
  { n: "01", title: "Build", body: "Pick items from your price list, set quantities, add sections, a discount and a deposit. Totals update as you type.", icon: "M4 6h16M4 12h16M4 18h10" },
  { n: "02", title: "Send", body: "Sending locks the quote, numbers it and creates a private link. Email it, or copy it into chat.", icon: "M4 12 20 4l-4 16-4-6z" },
  { n: "03", title: "Get approved", body: "The customer approves, declines or asks for changes. You see when they open it and what they say.", icon: "m5 12.5 4.5 4.5L19 7.5" },
  { n: "04", title: "Invoice", body: "Turn it into an invoice that copies exactly what they approved. Record the payment when it arrives.", icon: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6" },
];

const BENEFITS = [
  { title: "Quote in minutes", body: "Items, quantities, done. No more rebuilding spreadsheets for every job.", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  { title: "Look professional", body: "Clean documents with your name, logo and brand color.", icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" },
  { title: "Close faster", body: "One tap to approve beats printing, signing and scanning.", icon: "M13 3 5 14h6l-1 7 8-11h-6z" },
  { title: "Protect your margin", body: "See cost and profit privately. Customers never do.", icon: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" },
  { title: "Never miscalculate", body: "Money is whole centavos. VAT, discounts and deposits always add up.", icon: "M5 4h14v16H5zM8 8h8M8 12h3M8 16h3M14 12h2M14 16h2" },
  { title: "Follow up in time", body: "A dashboard and daily digest flag quotes that went quiet.", icon: "M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" },
  { title: "Change without chaos", body: "Revise a sent quote as a new version. The old one is superseded.", icon: "M4 4v6h6M20 20v-6h-6M20 10A8 8 0 0 0 6 6L4 10M4 14a8 8 0 0 0 14 4l2-4" },
  { title: "Works on your phone", body: "Build in the truck, approve on the couch. Fully responsive.", icon: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2" },
];

const TRUST = [
  { title: "A sent quote is frozen", body: "The database refuses edits to a sent quote and checks a fingerprint of what the customer saw." },
  { title: "Links are private", body: "Only a hash of each link is stored. They expire, can be renewed, and bots opening them are ignored." },
  { title: "Cost never leaves your side", body: "One serializer builds the customer view. Cost, markup and margin are not in it." },
  { title: "Businesses are walled off", body: "Row-level security in the database keeps each business's data separate, even if a page has a bug." },
  { title: "AI can't set prices", body: "It only picks items by reference from your list. Anything unknown is dropped, and every draft is logged." },
  { title: "Invoices can't be rewritten", body: "An issued invoice is a frozen copy. Mistakes are voided, not edited away." },
];

const FAQ = [
  { q: "Do my customers need an account?", a: "No. They open the private link you send them and approve, decline or ask for changes right there. They only type their name to approve." },
  { q: "Can the AI change my prices?", a: "No. It reads the customer's message and photos and suggests items from your price list. Prices always come from your list, and a quantity is only filled in if the customer actually stated it. You review before anything is added." },
  { q: "What if the customer wants changes after I sent it?", a: "You make a revision. It keeps the same quote number with a new version, and the earlier version is marked superseded only once you send the new one." },
  { q: "Does it handle VAT?", a: "Yes. The VAT rate defaults to 12% and can be changed per quote. You can mark a customer as VAT-exempt and individual items as non-taxable." },
  { q: "Can I use it on my phone?", a: "Yes. Both the app and the customer's approval page are designed for small screens first." },
  { q: "Can I get my data out?", a: "Yes. Export quotes, invoices and customers to CSV at any time. The files open cleanly in Excel and Google Sheets." },
];

const SOCIAL_LINKS = [
  { href: "/demo", label: "Demo" },
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Sign up" },
];

/* ------------------------------------------------------------------ page */

export function Landing() {
  const industries = SAMPLE_CATALOGS.map((c) => ({
    ...c,
    sample: c.items.filter((i) => i.kind !== "fee").slice(0, 4).map((i) => ({
      name: i.name,
      price: formatCents(resolvePrice({ costCents: i.costCents, markupBps: i.markupBps, priceCents: null })),
      unit: UNIT_LABELS[i.unit],
    })),
  }));

  return (
    <div className="w-full overflow-x-clip bg-white">
      <RevealOnScroll />
      <div>
        <div>
          {/* ---------------------------------------------------------- nav */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-neutral-200/70 bg-white/90 px-5 sm:px-10 lg:px-14 xl:px-20 py-4 backdrop-blur-md">
            <Link href="/" className="shrink-0"><Logo /></Link>
            <nav aria-label="Primary" className="hidden items-center gap-9 text-sm font-medium text-neutral-600 lg:flex">
              {NAV.map((n) => <a key={n.href} href={n.href} className="relative py-1 hover:text-neutral-900 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand-400 after:transition-transform hover:after:scale-x-100">{n.label}</a>)}
              <Link href="/demo" className="relative py-1 hover:text-neutral-900 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand-400 after:transition-transform hover:after:scale-x-100">Demo</Link>
            </nav>
            <div className="flex items-center gap-2">
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</ButtonLink>
              <ButtonLink href="/signup" size="sm" arrow>Get started</ButtonLink>
              <details className="group relative lg:hidden">
                <summary aria-label="Menu" className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm marker:hidden [&::-webkit-details-marker]:hidden">
                  <Icon d="M4 7h16M4 12h16M4 17h16" />
                </summary>
                <div className="absolute right-0 top-12 w-52 animate-drawer rounded-2xl border border-neutral-200 bg-white p-2 shadow-lift">
                  {[...NAV, { href: "/demo", label: "Demo" }, { href: "/login", label: "Sign in" }].map((n) => (
                    <a key={n.href} href={n.href} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-brand-50">{n.label}</a>
                  ))}
                </div>
              </details>
            </div>
          </header>

          {/* ---------------------------------------------------------- hero */}
          <section className="relative overflow-hidden border-b border-neutral-200/60 bg-[radial-gradient(rgb(14_28_21/0.07)_1px,transparent_1px)] [background-size:22px_22px]"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-12 sm:py-20 lg:py-24 grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-6">
            <div className="animate-enter space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                <span className="relative grid size-2 place-items-center"><span className="fx-ping absolute inset-0 rounded-full bg-brand-500" /><span className="relative size-1.5 rounded-full bg-brand-500" /></span>
                Quotes · Approvals · Invoices
              </span>
              <h1 className="text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-neutral-900 sm:text-6xl lg:text-[3.55rem] xl:text-[4.4rem] 2xl:text-[5rem]">
                Win more jobs with quotes that
                <span className="relative mt-1 block text-brand-600 sm:whitespace-nowrap">
                  close themselves.
                  <Swoosh />
                </span>
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-neutral-600 sm:text-lg">
                Build a professional quotation from your own price list, send it as a private link, and turn the approved quote into an invoice.
                Made for freelancers, contractors and small shops.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <ButtonLink href="/signup" size="lg" arrow>Get started</ButtonLink>
                <ButtonLink href="/demo" variant="secondary" size="lg" arrow>See the demo</ButtonLink>
                <InstallApp variant="ghost" size="lg" className="w-auto [&_button]:w-auto" />
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-neutral-600">
                {["No account needed for customers", "Prices never come from AI", "Works on any phone"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Icon d="m5 12.5 4.5 4.5L19 7.5" className="size-4 text-brand-600" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="animate-enter [animation-delay:100ms] xl:scale-[1.12] 2xl:scale-[1.25]"><HeroArt className="animate-float" /></div>
          </div></section>

          {/* ---------------------------------------------------------- who for */}
          <section aria-label="Who it is for" className="reveal overflow-hidden border-b border-neutral-200/60 bg-neutral-900 py-7 text-white">
            <p className="mb-5 px-5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 sm:text-xs sm:tracking-[0.18em]">Made for businesses that quote by the job</p>
            <div className="[mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
              <ul className="fx-marquee flex w-max items-center gap-14 pr-14">
                {[...INDUSTRIES, ...INDUSTRIES, ...INDUSTRIES, ...INDUSTRIES].map((i, k) => (
                  <li key={k} aria-hidden={k >= INDUSTRIES.length || undefined} className="flex shrink-0 items-center gap-3 text-lg font-semibold text-neutral-100">
                    <Icon d={i.d} className="size-6 text-brand-400" />
                    {i.name}
                    <span aria-hidden className="ml-11 size-1.5 rotate-45 bg-brand-400/70" />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ---------------------------------------------------------- what */}
          <section id="what" className="reveal scroll-mt-20 bg-white"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <SectionHead eyebrow="What it does" title={<>Everything between “how much?” and “<span className="text-brand-600">paid</span>”</>} sub="One tool for the whole job, from the first message to the last payment." />
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WHAT.map(({ title, body, Art, href }) => (
                <li key={title}>
                  <Link href={href} className="group flex h-full flex-col rounded-3xl border border-neutral-200/80 bg-white p-5 transition duration-300 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-lift">
                    <div className="grid h-28 place-items-center rounded-2xl bg-brand-50"><Art /></div>
                    <h3 className="mt-5 text-lg font-semibold leading-snug">{title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">{body}</p>
                    <span className="mt-5 flex items-center justify-between text-sm font-semibold text-neutral-900">Learn more <CircleArrow /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div></section>

          {/* ---------------------------------------------------------- dark CTA */}
          <section className="reveal relative overflow-hidden bg-neutral-900 [background-image:linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] [background-size:56px_56px]">
            <div className="relative grid items-center gap-4 px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-20 md:grid-cols-[1.1fr_1fr]">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Let&apos;s make things happen</h2>
                <p className="max-w-md text-neutral-300">Pick a sample price list, build your first quote in minutes, and send it before your customer loses interest.</p>
                <div className="pt-2"><ButtonLink href="/signup" variant="accent" size="lg" arrow>Create your first quote</ButtonLink></div>
              </div>
              <BandArt className="mx-auto max-w-sm md:max-w-none" />
            </div>
          </section>

          {/* ---------------------------------------------------------- how */}
          <section id="how" className="reveal scroll-mt-20 bg-brand-50/70 border-y border-neutral-200/60"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <SectionHead eyebrow="How it works" title="From first message to paid, in four steps" />
            <ol className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div aria-hidden className="absolute left-[12%] right-[12%] top-[2.2rem] hidden border-t-2 border-dashed border-brand-300 lg:block" />
              {STEPS.map((s) => (
                <li key={s.n} className="relative rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="relative grid size-12 place-items-center rounded-2xl bg-neutral-900 text-brand-400 shadow-soft"><Icon d={s.icon} className="size-6" /></span>
                  <p className="mt-5 text-xs font-bold tracking-widest text-brand-600">STEP {s.n}</p>
                  <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div></section>

          {/* ---------------------------------------------------------- showcase */}
          <section className="reveal bg-white"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
              <div className="space-y-6">
                <Eyebrow>Your side</Eyebrow>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">See your margin. <span className="text-brand-600">They never will.</span></h2>
                <p className="text-neutral-600 sm:text-lg">Build the quote with live totals, add AI suggestions from your own price list, and watch your profit update as you change a quantity.</p>
                <BuilderMock className="lg:-mr-6" />
              </div>
              <div className="space-y-6 lg:pt-10">
                <Eyebrow>Their side</Eyebrow>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">One tap <span className="text-brand-600">to yes.</span></h2>
                <p className="text-neutral-600">A clean page on any phone, with the total, the deposit and your terms. Nothing to install, nothing to sign up for.</p>
                <PhoneMock />
              </div>
            </div>
          </div></section>

          {/* ---------------------------------------------------------- benefits */}
          <section id="benefits" className="reveal scroll-mt-20 bg-brand-50/70 border-y border-neutral-200/60"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <SectionHead eyebrow="Benefits" title="Less admin. More jobs won." sub="The small things that add up to hours back every week." />
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <li key={b.title} className="group rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition-colors duration-300 group-hover:bg-brand-400 group-hover:text-neutral-900"><Icon d={b.icon} className="size-5" /></span>
                  <h3 className="mt-4 font-semibold">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{b.body}</p>
                </li>
              ))}
            </ul>
          </div></section>

          {/* ---------------------------------------------------------- industries */}
          <section className="reveal bg-white"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <SectionHead eyebrow="Start fast" title="Start from a ready-made price list" sub="Pick one when you sign up, then change the prices to yours." />
            <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {industries.map((c) => (
                <article key={c.id} className="flex min-w-0 flex-col rounded-3xl border border-neutral-200/80 bg-brand-50/60 p-6">
                  <h3 className="text-lg font-semibold">{c.label}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{c.blurb}</p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {c.sample.map((i) => (
                      <li key={i.name} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm ring-1 ring-neutral-200/70">
                        <span className="truncate text-neutral-800">{i.name}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{i.price}<span className="font-normal text-neutral-400"> / {i.unit}</span></span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs font-medium text-neutral-500">{c.items.length} items included</p>
                </article>
              ))}
            </div>
          </div></section>

          {/* ---------------------------------------------------------- numbers */}
          <section id="numbers" className="reveal scroll-mt-20 bg-neutral-900"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow className="text-brand-400">By design</Eyebrow>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Careful with your numbers</h2>
              </div>
              <p className="max-w-sm text-sm text-neutral-400">Money software should be boring and exact. These are not marketing claims, they are how it is built.</p>
            </div>
            <div className="mt-10 grid overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] text-white md:grid-cols-3">
              {[
                { icon: "M5 4h14v16H5zM8 8h8M8 12h3M8 16h3", title: "Rounding drift", value: "₱0.00", body: "Every amount is whole centavos, so totals always add up exactly." },
                { icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z", title: "Prices written by AI", value: "0", body: "AI picks items from your list. You set every price." },
                { icon: "M13 3 5 14h6l-1 7 8-11h-6z", title: "Taps to approve", value: "1", body: "Customers approve from a private link, with no account." },
              ].map((s, i) => (
                <div key={s.title} className={cn("p-7 sm:p-9", i && "border-t border-white/10 md:border-l md:border-t-0")}>
                  <div className="flex items-center gap-3 text-sm font-medium text-neutral-300">
                    <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-brand-400"><Icon d={s.icon} /></span>{s.title}
                  </div>
                  <p className="mt-6 text-5xl font-semibold tracking-tight text-brand-400 sm:text-6xl">{s.value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div></section>

          {/* ---------------------------------------------------------- trust */}
          <section className="reveal bg-white"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <SectionHead eyebrow="Built to be trusted" title="Your quotes, your customers, your numbers" sub="Security and accuracy are enforced in the database itself, not just in the screens." />
            <ul className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {TRUST.map((t) => (
                <li key={t.title} className="flex gap-4">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-brand-400 text-neutral-900"><Icon d="m5 12.5 4.5 4.5L19 7.5" className="size-4" /></span>
                  <div><h3 className="font-semibold">{t.title}</h3><p className="mt-1 text-sm leading-relaxed text-neutral-600">{t.body}</p></div>
                </li>
              ))}
            </ul>
          </div></section>

          {/* ---------------------------------------------------------- faq */}
          <section id="faq" className="reveal scroll-mt-20 bg-brand-50/70 border-y border-neutral-200/60"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 py-16 sm:py-24">
            <SectionHead eyebrow="FAQ" title="Questions, answered" />
            <div className="mx-auto mt-10 max-w-3xl space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-neutral-200/80 bg-white shadow-soft transition-colors open:border-brand-300 open:bg-brand-50/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-neutral-900 text-brand-400 transition-transform duration-300 group-open:rotate-45">
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-neutral-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div></section>

          {/* ---------------------------------------------------------- final CTA */}
          <section className="reveal bg-brand-400"><div className="px-5 sm:px-10 lg:px-14 xl:px-20 flex flex-col items-start justify-between gap-8 py-16 sm:py-20 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">Ready to quote like a pro?</h2>
                <p className="text-neutral-800 sm:text-lg">Start with a sample price list and send your first quote today. Or look around the demo first.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg" arrow>Get started</ButtonLink>
                <ButtonLink href="/demo" variant="secondary" size="lg">See the demo</ButtonLink>
              </div>
            </div></section>

          {/* ---------------------------------------------------------- footer */}
          <footer className="flex flex-col items-center justify-between gap-5 bg-neutral-900 px-5 sm:px-10 lg:px-14 xl:px-20 py-8 text-sm text-neutral-400 md:flex-row">
            <Logo className="text-white" />
            <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-7 gap-y-2 font-medium">
              {NAV.map((n) => <a key={n.href} href={n.href} className="hover:text-white">{n.label}</a>)}
            </nav>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 hover:border-brand-400 hover:text-brand-400">{l.label}</Link>
              ))}
            </div>
          </footer>
          <p className="bg-neutral-900 pb-8 text-center text-xs text-neutral-500">© {new Date().getFullYear()} Quotely</p>
        </div>
      </div>
    </div>
  );
}
