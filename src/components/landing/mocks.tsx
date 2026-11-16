import { cn } from "@/lib/cn";

/* Miniature, non-interactive copies of the real screens, built from the same sample numbers as /demo. */

const Dot = ({ className }: { className?: string }) => <span className={cn("size-2.5 rounded-full", className)} />;

function Window({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lift", className)} aria-hidden>
      <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
        <Dot className="bg-neutral-300" /><Dot className="bg-neutral-300" /><Dot className="bg-brand-400" />
        <span className="ml-3 truncate text-xs font-medium text-neutral-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

const ROWS = [
  { n: "Floor tile installation", q: "12.5 sqm", p: "₱455.00", t: "₱5,687.50", ai: true },
  { n: "Porcelain tile 60x60", q: "13.5 sqm", p: "₱687.50", t: "₱9,281.25", ai: true },
  { n: "Interior repaint", q: "42 sqm", p: "₱243.00", t: "₱10,206.00" },
  { n: "Permit processing", q: "1 lot", p: "₱4,200.00", t: "₱4,200.00" },
];

export function BuilderMock({ className }: { className?: string }) {
  return (
    <Window title="Edit quote · QT-2026-0042" className={className}>
      <div className="grid gap-0 sm:grid-cols-[1.5fr_1fr]">
        <div className="p-4 sm:p-5">
          <div className="space-y-2">
            {ROWS.map((r) => (
              <div key={r.n} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium text-neutral-800">
                    {r.n}
                    {r.ai && <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">AI</span>}
                  </p>
                  <p className="text-xs text-neutral-500">{r.q} × {r.p}</p>
                </div>
                <p className="font-semibold tabular-nums">{r.t}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t border-neutral-200 bg-neutral-50/70 p-4 text-sm sm:border-l sm:border-t-0 sm:p-5">
          {[["Subtotal", "₱29,374.75"], ["Discount (5%)", "−₱1,468.74"], ["VAT (12%)", "₱3,349.52"]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-neutral-600"><span>{k}</span><span className="tabular-nums">{v}</span></div>
          ))}
          <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold"><span>Total</span><span className="tabular-nums">₱31,255.53</span></div>
          <div className="rounded-2xl bg-neutral-900 p-3 text-white">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-brand-400">
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              Only you see this
            </p>
            <div className="mt-2 flex items-end justify-between">
              <div><p className="text-xs text-neutral-400">Margin</p><p className="text-lg font-semibold tabular-nums text-brand-400">₱6,420.10</p></div>
              <span className="rounded-full bg-brand-400 px-2 py-0.5 text-xs font-bold text-neutral-900">21.9%</span>
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}

export function PhoneMock({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[290px] rounded-[2.4rem] border-[7px] border-neutral-900 bg-white shadow-lift", className)} aria-hidden>
      <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-neutral-200" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-700">Sample Renovations</p>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800">Quotation</span>
        </div>
        <div>
          <p className="text-xs text-neutral-500">Bathroom and living room refresh</p>
          <p className="text-2xl font-semibold tabular-nums">₱51,987.84</p>
          <p className="text-xs text-neutral-500">50% deposit · ₱25,993.92</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 text-center text-[10px] font-medium">
          <span className="rounded-lg bg-white py-1.5 shadow-sm">Approve</span>
          <span className="py-1.5 text-neutral-500">Changes</span>
          <span className="py-1.5 text-neutral-500">Decline</span>
        </div>
        <div className="rounded-xl border border-neutral-200 px-3 py-2 text-xs text-neutral-400">Type your full name</div>
        <div className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white">
          Approve this quote
          <span className="grid size-5 place-items-center rounded-full bg-brand-400 text-neutral-900">
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </span>
        </div>
      </div>
    </div>
  );
}
