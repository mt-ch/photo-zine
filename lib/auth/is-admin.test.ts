import { describe, expect, it } from "vitest";
import { isAdmin } from "./is-admin";

describe("isAdmin", () => {
  it("is true when the session metadata role is admin", () => {
    expect(isAdmin({ metadata: { role: "admin" } })).toBe(true);
  });

  it("is false for any other role", () => {
    expect(isAdmin({ metadata: { role: "photographer" } })).toBe(false);
  });

  it("is false when metadata or role is missing", () => {
    expect(isAdmin({})).toBe(false);
    expect(isAdmin({ metadata: {} })).toBe(false);
  });

  it("is false when there are no claims", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
