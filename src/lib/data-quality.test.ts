import { expect, it } from "vitest";
import { assessNovaData } from "./data-quality";

it("Nova flags generated_at older than six hours, not exactly six hours", () => {
  expect(assessNovaData(1000, 100000, 22600).fresh).toBe(true);
  expect(assessNovaData(1000, 100000, 22601).fresh).toBe(false);
});
it("Nova flags fewer than 100000 live offers including zero", () => {
  expect(assessNovaData(1000, 100000, 1000).volume).toBe(true);
  expect(assessNovaData(1000, 99999, 1000).volume).toBe(false);
  expect(assessNovaData(1000, 0, 1000).volume).toBe(false);
});
it("missing or malformed observations remain unknown, not a fabricated outage", () => {
  expect(assessNovaData("1000", undefined, 1000)).toMatchObject({ fresh: null, volume: null });
});