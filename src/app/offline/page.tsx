import { Logo } from "@/components/logo";
import { ReloadButton } from "./reload-button";

export const metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-6">
      <div className="max-w-sm text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div aria-hidden className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-700">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M8.5 8.8A9.5 9.5 0 0 0 2.5 12M5.6 15.4a6.5 6.5 0 0 1 3.5-2.3M12 19h.01M15.3 13.2A6.5 6.5 0 0 1 18.4 15.4M13.6 6.2A9.5 9.5 0 0 1 21.5 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">You&apos;re offline</h1>
        <p className="mt-2 text-neutral-600">Quotely needs a connection to load your quotes and invoices. Nothing is lost. Reconnect and try again.</p>
        <div className="mt-6"><ReloadButton /></div>
      </div>
    </main>
  );
}
