import { describe, expect, it } from "vitest";

import { getFormStepSectionIndexes } from "./StepRouter";

describe("StepRouter section allocation", () => {
  it("keeps every schema section reachable in the fixed four-step wizard", () => {
    expect(getFormStepSectionIndexes(2, 5)).toEqual([0]);
    expect(getFormStepSectionIndexes(3, 5)).toEqual([1, 2, 3, 4]);
  });

  it("does not emit invalid indexes for one-section forms", () => {
    expect(getFormStepSectionIndexes(2, 1)).toEqual([0]);
    expect(getFormStepSectionIndexes(3, 1)).toEqual([]);
  });
});
