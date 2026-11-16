import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export default async function Home() {
  if (await getUser()) redirect("/app");
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium text-neutral-500">Smart Quotation &amp; Proposal Generator</p>
      <h1 className="text-4xl font-semibold tracking-tight">Professional quotes your customers can approve in one tap.</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        Build a quotation from your own price list, send it as a link, and turn the approved quote into an invoice.
        Labor, materials, VAT and discounts are calculated for you.
      </p>
      <div className="flex gap-3">
        <ButtonLink href="/signup">Get started</ButtonLink>
        <ButtonLink href="/login" variant="secondary">Sign in</ButtonLink>
      </div>
    </main>
  );
}
