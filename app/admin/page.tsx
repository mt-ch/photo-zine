import { forbidden, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/verify-session";
import { PingButton } from "./ping-button";

export default async function AdminPage() {
  const session = await verifySession();
  if (!session.ok) {
    if (session.reason === "unauthenticated") redirect("/sign-in");
    forbidden();
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Admin</h1>
      <PingButton />
    </main>
  );
}
