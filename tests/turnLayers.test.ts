import { describe, expect, it } from "vitest";
import { planTurnBaseIndices } from "../src/core/turnLayers";

describe("turn layer planning", () => {
  it("keeps the front cover's back face off the flat left slot", () => {
    expect(planTurnBaseIndices({
      displayMode: "spread",
      targetIndices: [1, 2],
      foldedBackIndex: 1
    })).toEqual([2]);
  });

  it("keeps an interior sheet's back face on the moving fold", () => {
    expect(planTurnBaseIndices({
      displayMode: "spread",
      targetIndices: [3, 4],
      foldedBackIndex: 3
    })).toEqual([4]);
  });

  it("handles the reverse back-cover transition symmetrically", () => {
    expect(planTurnBaseIndices({
      displayMode: "spread",
      targetIndices: [13, 14],
      foldedBackIndex: 14
    })).toEqual([13]);
  });

  it("retains the destination page underneath in single-page mode", () => {
    expect(planTurnBaseIndices({
      displayMode: "single",
      targetIndices: [1],
      foldedBackIndex: 1
    })).toEqual([1]);
  });
});
