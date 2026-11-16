import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-7 px-4 py-10">
      <div className="animate-enter space-y-5 text-center">
        <Link href="/" className="inline-block"><Logo className="justify-center" /></Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-neutral-600">{subtitle}</p>}
        </div>
      </div>
      <Card className="animate-enter p-6 shadow-lift [animation-delay:80ms] sm:p-8">{children}</Card>
      {footer && <p className="text-center text-sm text-neutral-600 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline-offset-4 hover:[&_a]:underline">{footer}</p>}
    </main>
  );
}
