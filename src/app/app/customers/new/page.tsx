import { ActionForm } from "@/components/form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { createCustomer } from "../actions";
import { CustomerFields } from "../customer-form";

export const metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  const { canWrite } = await requireContext();
  return (
    <>
      <PageHeader title="Add customer" />
      {canWrite ? (
        <Card className="p-6">
          <ActionForm action={createCustomer} className="space-y-4">
            <CustomerFields />
          </ActionForm>
        </Card>
      ) : (
        <p className="text-sm text-neutral-600">Your role can view customers but not add them.</p>
      )}
    </>
  );
}
