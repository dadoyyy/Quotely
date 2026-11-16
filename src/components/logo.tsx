import { cn } from "@/lib/cn";

/** The mark: a document with a check, on lime. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-brand-400 text-neutral-900 shadow-glow", className)}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h8l4 4v14H6z" /><path d="m9.5 14 2 2 3.5-4" />
      </svg>
    </span>
  );
}

export function Logo({ className, name = "Quotely" }: { className?: string; name?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight text-neutral-900", className)}>
      <LogoMark />
      <span className="text-lg">{name}</span>
    </span>
  );
}
