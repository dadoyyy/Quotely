import { AppShell } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { requireContext } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

// Everything under /app depends on who is signed in.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, user, role } = await requireContext();
  const initial = (org.name.trim()[0] ?? "Q").toUpperCase();
  return (
    <AppShell
      account={
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-sm font-semibold text-brand-400">{initial}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{org.name}</p>
            <p className="truncate text-xs text-neutral-500">{user.email} · {role}</p>
          </div>
        </div>
      }
      footer={
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">Sign out</Button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
