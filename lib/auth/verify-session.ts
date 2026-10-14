import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "./is-admin";

type SessionResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

// The single place the admin check lives. Call from every admin page and Server Action.
// Requires the Clerk session token to include the role: Dashboard > Sessions >
// Customize session token > { "metadata": "{{user.public_metadata}}" }.
// Without that claim every user, including the admin, is reported as forbidden.
export async function verifySession(): Promise<SessionResult> {
  const { userId, sessionClaims } = await auth();

  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!isAdmin(sessionClaims)) return { ok: false, reason: "forbidden" };

  return { ok: true, userId };
}
