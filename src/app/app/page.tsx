import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

async function count(table: "customers" | "catalog_items") {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function DashboardPage() {
  const { org } = await requireContext();
  const [customers, items] = await Promise.all([count("customers"), count("catalog_items")]);

  const steps = [
    { done: true, label: "Create your business", href: "/app/settings", note: org.name },
    { done: customers > 0, label: "Add your customers", href: "/app/customers/new", note: `${customers} so far` },
    { done: items > 0, label: "Build your price list", href: "/app/catalog/new", note: `${items} items so far` },
    { done: false, label: "Create your first quotation", href: "", note: "Coming next" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome to ${org.name}.`} />
      <Card className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.done ? "bg-green-600 text-white" : "border border-neutral-300 text-neutral-400 dark:border-neutral-700"}`}
              >
                {s.done ? "✓" : ""}
              </span>
              {s.href ? <Link href={s.href} className="font-medium hover:underline">{s.label}</Link> : <span className="font-medium text-neutral-400">{s.label}</span>}
            </div>
            {s.href ? <span className="text-sm text-neutral-500">{s.note}</span> : <Badge>{s.note}</Badge>}
          </div>
        ))}
      </Card>
    </>
  );
}
