import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({ auth }));

import { verifySession } from "./verify-session";

describe("verifySession", () => {
  beforeEach(() => auth.mockReset());

  it("reports unauthenticated when there is no signed-in user", async () => {
    auth.mockResolvedValue({ userId: null, sessionClaims: null });

    expect(await verifySession()).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });

  it("reports forbidden for a signed-in non-admin", async () => {
    auth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { metadata: {} },
    });

    expect(await verifySession()).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns the user id for a signed-in admin", async () => {
    auth.mockResolvedValue({
      userId: "user_1",
      sessionClaims: { metadata: { role: "admin" } },
    });

    expect(await verifySession()).toEqual({ ok: true, userId: "user_1" });
  });
});
