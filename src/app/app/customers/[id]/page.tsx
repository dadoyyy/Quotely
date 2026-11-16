import { notFound } from "next/navigation";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import type { CustomerRow } from "@/lib/rows";
import { isUuid } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { deleteCustomer, updateCustomer } from "../actions";
import { CustomerFields } from "../customer-form";

export const metadata = { title: "Customer" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { canWrite } = await requireContext();

  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const customer = data as CustomerRow;

  return (
    <>
      <PageHeader title={customer.name} description={customer.company ?? undefined} />
      {canWrite ? (
        <div className="space-y-6">
          <Card className="p-6">
            <ActionForm action={updateCustomer} className="space-y-4">
              <CustomerFields customer={customer} />
            </ActionForm>
          </Card>
          <Card className="p-6">
            <h2 className="font-medium">Delete customer</h2>
            <p className="mt-1 text-sm text-neutral-600">
              This can&apos;t be undone. A customer who has quotes can&apos;t be deleted.
            </p>
            <ActionForm action={deleteCustomer} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={customer.id} />
              <FormMessage />
              <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete ${customer.name}? This can't be undone.`}>
                Delete customer
              </SubmitButton>
            </ActionForm>
          </Card>
        </div>
      ) : (
        <Card className="p-6 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            {([["Email", customer.email], ["Phone", customer.phone], ["TIN", customer.tin], ["Address", customer.address]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-neutral-500">{k}</dt><dd>{v ?? "—"}</dd></div>
            ))}
          </dl>
        </Card>
      )}
    </>
  );
}
