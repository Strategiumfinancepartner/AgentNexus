import { expect, it } from "vitest";
import { quotaWarning, QUOTA_LIMITS } from "./quota.server";

it("warns a free key at 90 percent, not before", () => {
  expect(QUOTA_LIMITS.free).toBe(1000);
  expect(quotaWarning("free", 899, 1000)).toBeNull();
  expect(quotaWarning("free", 900, 1000)).not.toBeNull();
});
it("provides the Pro offer link at the free warning threshold", () => {
  expect(quotaWarning("free", 900, 1000)).toContain("https://agentnexus.app/pricing");
  expect(QUOTA_LIMITS.pro).toBe(50000);
});