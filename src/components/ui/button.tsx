import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LinkPending } from "@/components/ui/link-pending";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-neutral-900 text-white shadow-sm hover:-translate-y-px hover:bg-neutral-800 hover:shadow-lift active:translate-y-0 active:scale-[0.96]",
  accent:
    "bg-brand-400 text-neutral-900 shadow-glow hover:-translate-y-px hover:bg-brand-300 active:translate-y-0 active:scale-[0.96]",
  secondary:
    "border border-neutral-200 bg-white text-neutral-900 shadow-sm hover:-translate-y-px hover:border-brand-400 hover:bg-brand-50 active:translate-y-0 active:scale-[0.96]",
  danger:
    "bg-red-600 text-white shadow-sm hover:-translate-y-px hover:bg-red-700 active:translate-y-0 active:scale-[0.96]",
  ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.96]",
};

const sizes: Record<Size, string> = {
  sm: "rounded-2xl px-3 py-1.5 text-xs",
  md: "rounded-xl px-4 py-2.5 text-sm",
  lg: "rounded-xl px-5 py-3 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "group/btn inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 font-medium whitespace-nowrap select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
    "disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60",
    variants[variant],
    sizes[size],
    extra,
  );
}

/** The small lime circle with an arrow that finishes the main calls to action. */
export function ArrowBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full bg-brand-400 text-neutral-900 transition-transform duration-300 group-hover/btn:translate-x-0.5",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </span>
  );
}

type Extras = { variant?: Variant; size?: Size; arrow?: boolean };

const withArrow = (children: ReactNode, arrow?: boolean) =>
  arrow ? (
    <>
      {children}
      <ArrowBadge />
    </>
  ) : (
    children
  );

export function Button({ variant, size, arrow, className, children, ...props }: ComponentProps<"button"> & Extras) {
  return (
    <button className={buttonClass(variant, size, cn(arrow && "pr-2", className))} {...props}>
      {withArrow(children, arrow)}
    </button>
  );
}

export function ButtonLink({ variant, size, arrow, className, children, ...props }: ComponentProps<typeof Link> & Extras) {
  return (
    <Link className={buttonClass(variant, size, cn(arrow && "pr-2", className))} {...props}>
      <LinkPending />
      {withArrow(children, arrow)}
    </Link>
  );
}

/** A link that downloads a file. It is not a page, so a plain anchor is right (no client-side navigation). */
export function DownloadLink({ className, ...props }: ComponentProps<"a">) {
  return <a className={buttonClass("secondary", "md", className)} {...props} />;
}
