import { describe, expect, it } from "vitest";
import { checkoutSyncState } from "./checkout-sync";

describe("paid checkout confirmation", () => {
  it("does not present Free as final while paid confirmation is pending", () => {
    expect(checkoutSyncState(true, "free", 0)).toBe("pending");
    expect(checkoutSyncState(true, undefined, 10_000)).toBe("pending");
  });
  it("only finishes when server quota confirms paid access", () => {
    expect(checkoutSyncState(true, "pro", 10_000)).toBe("ready");
    expect(checkoutSyncState(true, "free", 10_000)).not.toBe("ready");
  });
  it("offers retry instead of waiting indefinitely", () => {
    expect(checkoutSyncState(true, "free", 120_000)).toBe("delayed");
  });
});