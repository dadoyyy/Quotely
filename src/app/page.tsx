import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

const FEATURES = [
  { title: "Quote from your own price list", body: "Labor, materials and fees with your markup. Totals, VAT, discounts and deposits are calculated for you, to the centavo." },
  { title: "Describe the job, get a draft", body: "Paste the customer's message or a photo. AI suggests items from your price list. It never invents a price." },
  { title: "One link to approve", body: "Customers read, approve, decline or ask for changes on a private page. No account needed. A sent quote can't be altered." },
  { title: "Invoice and export", body: "Turn an approved quote into an invoice, record payments, and export everything to CSV." },
];

export default async function Home() {
  if (await getUser()) redirect("/app");
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-6">
        <p className="text-sm font-medium text-neutral-500">Smart Quotation &amp; Proposal Generator</p>
        <h1 className="text-4xl font-semibold tracking-tight">Professional quotes your customers can approve in one tap.</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Built for freelancers, contractors and small shops: renovation, events, aircon repair and anything quoted by the job.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/signup">Get started</ButtonLink>
          <ButtonLink href="/demo" variant="secondary">See a demo</ButtonLink>
          <ButtonLink href="/login" variant="ghost">Sign in</ButtonLink>
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{f.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
