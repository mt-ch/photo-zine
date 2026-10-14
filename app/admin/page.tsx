import { requireAdmin } from "@/lib/auth/require-admin";
import { PingButton } from "./ping-button";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Admin</h1>
      <PingButton />
    </main>
  );
}
