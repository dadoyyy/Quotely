import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-500">Smart Quotation</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>}
      </div>
      <Card className="p-6">{children}</Card>
      {footer && <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">{footer}</p>}
    </main>
  );
}
