import Link from "next/link";
import { ActionForm, Field, FormMessage, SelectInput, SubmitButton, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui/card";
import { requireContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createQuote } from "../actions";

export const metadata = { title: "New quote" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const { canWrite } = await requireContext();
  if (!canWrite) return <p className="text-sm text-neutral-600">Your role can view quotes but not create them.</p>;

  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id, name, company").order("name").limit(500);
  const customers = data ?? [];

  return (
    <>
      <PageHeader title="New quote" description="Pick who it's for. You'll add the items next." />
      {customers.length === 0 ? (
        <Card className="p-6 text-sm">
          You need a customer first. <Link href="/app/customers/new" className="font-medium underline">Add a customer</Link>, then come back.
        </Card>
      ) : (
        <Card className="max-w-xl p-6">
          <ActionForm action={createQuote} className="space-y-4">
            <Field label="Customer" name="customerId" required>
              <SelectInput name="customerId" defaultValue={customers.some((c) => c.id === customer) ? customer : ""}>
                <option value="">Choose a customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
              </SelectInput>
            </Field>
            <Field label="Title" name="title" required hint="What the job is, e.g. “Kitchen renovation”.">
              <TextInput name="title" maxLength={200} autoFocus />
            </Field>
            <FormMessage />
            <SubmitButton pendingText="Creating…">Create quote</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
