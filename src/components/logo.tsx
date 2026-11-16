import { cn } from "@/lib/cn";

/**
 * The mark: a quote ring (the Q) that a check breaks out of, because a quote is only done when it is approved.
 * Deep green tile, lime ring, white check.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-neutral-900 ring-1 ring-brand-400/30", className)}>
      <svg viewBox="0 0 24 24" className="size-[78%]" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.25 11.06A7.5 7.5 0 1 1 12.3 5.61" stroke="#a2d44a" strokeWidth="2.6" />
        <path d="M7.9 13.3 10.4 15.8 20 5.6" stroke="#fff" strokeWidth="2.6" />
        <circle cx="19.6" cy="19.2" r="1.5" fill="#a2d44a" stroke="none" />
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
