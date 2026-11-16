import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink, DownloadLink, buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/styles";
import { requireContext } from "@/lib/auth";
import type { CustomerRow } from "@/lib/rows";
import { sanitizeSearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { canWrite } = await requireContext();
  const term = sanitizeSearch(q);

  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("name").limit(200);
  if (term) query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query;
  const customers = (data ?? []) as CustomerRow[];

  return (
    <>
      <PageHeader
        title="Customers"
        description="The people and companies you quote."
        actions={
          <>
            <DownloadLink href="/app/export/customers">Export CSV</DownloadLink>
            {canWrite && <ButtonLink href="/app/customers/new">Add customer</ButtonLink>}
          </>
        }
      />

      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} placeholder="Search name, company or email" aria-label="Search customers" className={`${controlClass} max-w-sm`} />
        <button type="submit" className={buttonClass("secondary")}>Search</button>
        {term && <Link href="/app/customers" className={buttonClass("ghost")}>Clear</Link>}
      </form>

      {error ? (
        <p role="alert" className="text-sm text-red-600">Couldn&apos;t load customers. Try refreshing.</p>
      ) : customers.length === 0 ? (
        <EmptyState title={term ? "No customers match that search" : "No customers yet"}>
          {!term && (canWrite ? <>Add your first customer to start quoting.</> : <>Ask the owner to add customers.</>)}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/app/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    {c.company && <div className="text-xs text-neutral-500">{c.company}</div>}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3">{c.is_vat_exempt ? <Badge tone="amber">VAT-exempt</Badge> : <span className="text-neutral-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {customers.length === 200 && <p className="mt-3 text-xs text-neutral-500">Showing the first 200. Use search to narrow down.</p>}
    </>
  );
}
