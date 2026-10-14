import { forbidden, redirect } from "next/navigation";
import { verifySession } from "./verify-session";

// For admin pages: redirects signed-out visitors, 403s non-admins.
// Server Actions call verifySession() directly and return an error instead.
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await verifySession();
  if (session.ok) return { userId: session.userId };

  if (session.reason === "unauthenticated") redirect("/sign-in");
  forbidden();
}
