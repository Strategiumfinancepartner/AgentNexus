import { describe, expect, it } from "vitest";
import { purchaseIdentity, purchasePrice, purchaseReturnPath } from "./purchase-intent";

describe("subscription purchase flow", () => {
  it("requires an identified account before checkout", () => {
    expect(() => purchaseIdentity(null)).toThrow();
    expect(purchaseIdentity({ id: "test-account", email: "test@example.com" }).customData).toEqual({ userId: "test-account" });
  });
  it("resumes the chosen Pro plan after account creation", () => {
    expect(purchaseReturnPath("agent_pro_monthly")).toBe("/pricing?plan=agent_pro_monthly");
  });
  it("resumes Publisher without accepting arbitrary prices", () => {
    expect(purchaseReturnPath("publisher_monthly")).toBe("/pricing?plan=publisher_monthly");
    expect(purchasePrice("untrusted-price")).toBeUndefined();
    expect(() => purchaseReturnPath("untrusted-price")).toThrow();
  });
});