import { expect, it } from "vitest";
import { readAuthIntent, safeAuthPath } from "./auth-intent";

for (const path of ["/keys?welcome=1", "/pricing?plan=agent_pro_monthly", "/pricing?plan=publisher_monthly"]) {
  it(`preserves the selected destination ${path} across an OAuth return without query`, () => {
    expect(readAuthIntent({ getItem: () => JSON.stringify({ path, at: 100 }) }, 200)).toBe(path);
  });
}
it("rejects external destinations and expired intents", () => {
  expect(safeAuthPath("//evil.test")).toBeUndefined();
  expect(safeAuthPath("/\\evil.test")).toBeUndefined();
  expect(readAuthIntent({ getItem: () => JSON.stringify({ path: "/keys", at: 0 }) }, 3600001)).toBeUndefined();
});