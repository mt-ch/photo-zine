"use server";

import { verifySession } from "@/lib/auth/verify-session";

// Stub action demonstrating the Server Action auth pattern later admin actions copy.
export async function pingAdmin(): Promise<{ ok: true } | { error: string }> {
  const session = await verifySession();
  if (!session.ok) return { error: session.reason };

  return { ok: true };
}
