import { describe, expect, it } from "vitest";
import { FAILED_RECHECK_MAX, mergeRecheckQueue } from "./recheck-queue";
const r = (id: string) => ({ id });
describe("failed-first recheck queue", () => {
  it("puts failed services before the rotation without duplicates", () => {
    expect(mergeRecheckQueue([r("f")], [r("a"), r("f"), r("b")], 3).map((x) => x.id)).toEqual(["f", "a", "b"]);
  });
  it("caps failed services so the rotation keeps moving", () => {
    const failing = Array.from({ length: 30 }, (_, i) => r(`f${i}`));
    const out = mergeRecheckQueue(failing, [r("a")], 40);
    expect(out.filter((x) => x.id.startsWith("f")).length).toBe(FAILED_RECHECK_MAX);
    expect(out.at(-1)?.id).toBe("a");
  });
});
