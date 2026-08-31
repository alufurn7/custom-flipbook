import { describe, expect, it } from "vitest";
import { planCacheEvictions } from "../src/core/pageCache";

describe("page cache eviction", () => {
  it("evicts the oldest unprotected pages first", () => {
    expect(planCacheEvictions({
      cacheOrder: [0, 1, 2, 3, 4, 5],
      protectedIndices: new Set([3, 4, 5]),
      maximumSize: 4
    })).toEqual([0, 1]);
  });

  it("never evicts pages in the protected preload window", () => {
    expect(planCacheEvictions({
      cacheOrder: [4, 0, 1, 2, 3],
      protectedIndices: new Set([0, 1, 2, 3]),
      maximumSize: 3
    })).toEqual([4]);
  });

  it("does nothing while the cache is within its bound", () => {
    expect(planCacheEvictions({
      cacheOrder: [1, 2, 3],
      protectedIndices: new Set([2, 3]),
      maximumSize: 4
    })).toEqual([]);
  });

  it("allows the protected window to define the effective minimum size", () => {
    expect(planCacheEvictions({
      cacheOrder: [0, 1, 2, 3],
      protectedIndices: new Set([0, 1, 2, 3]),
      maximumSize: 2
    })).toEqual([]);
  });
});
