import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { getUser } from "@/lib/auth";

export default async function Home() {
  if (await getUser()) redirect("/app");
  return (
    <main>
      <Landing />
    </main>
  );
}
