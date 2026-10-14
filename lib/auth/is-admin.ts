type SessionClaims = { metadata?: { role?: string } } | null | undefined;

export function isAdmin(claims: SessionClaims): boolean {
  return claims?.metadata?.role === "admin";
}
