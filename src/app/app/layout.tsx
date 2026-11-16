import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { requireContext } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

// Everything under /app depends on who is signed in.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, user, role } = await requireContext();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-neutral-200 p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r dark:border-neutral-800">
        <div>
          <p className="truncate text-sm font-semibold">{org.name}</p>
          <p className="truncate text-xs text-neutral-500">{user.email} · {role}</p>
        </div>
        <Nav />
        <form action={signOut} className="md:mt-auto">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">Sign out</Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
