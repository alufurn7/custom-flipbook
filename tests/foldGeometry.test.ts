import { describe, expect, it } from "vitest";
import {
  calculateFold,
  constrainPointer,
  polygonCss,
  reflectPoint,
  shouldCommitTurn
} from "../src/geometry/foldGeometry";

describe("fold geometry", () => {
  it("fades the shadow at both ends of a full turn, symmetrically", () => {
    for (const direction of [-1, 1]) {
      const opacity = (travel: number) => calculateFold({
        width: 400, height: 600, pageLeft: direction === -1 ? 400 : 0,
        origin: { x: direction === -1 ? 800 : 0, y: 300 },
        pointer: { x: (direction === -1 ? 800 : 0) + direction * travel, y: 300 },
        maximumPointerDistance: 800
      }).shadowOpacity;
      expect(opacity(0)).toBeCloseTo(0);
      expect(opacity(800)).toBeCloseTo(0);
      expect(opacity(400)).toBeGreaterThan(opacity(200));
      expect(opacity(200)).toBeCloseTo(opacity(600));
    }
  });
  it("uses the page diagonal as mask size", () => {
    const fold = calculateFold({
      width: 464,
      height: 655,
      pageLeft: 464,
      origin: { x: 928, y: 655 },
      pointer: { x: 700, y: 500 }
    });
    expect(fold.maskSize).toBe(803);
  });

  it("reflects a point across a vertical crease", () => {
    const reflected = reflectPoint({ x: 10, y: 5 }, { x: 4, y: 0 }, { x: 1, y: 0 });
    expect(reflected.x).toBeCloseTo(-2);
    expect(reflected.y).toBeCloseTo(5);
  });

  it("splits a page into stationary and folded polygons", () => {
    const fold = calculateFold({
      width: 400,
      height: 600,
      pageLeft: 400,
      origin: { x: 800, y: 600 },
      pointer: { x: 570, y: 470 }
    });
    expect(fold.stationaryPolygon.length).toBeGreaterThanOrEqual(3);
    expect(fold.foldedPolygon.length).toBeGreaterThanOrEqual(3);
    expect(fold.progress).toBeGreaterThan(0);
    expect(fold.progress).toBeLessThanOrEqual(1);
  });

  it("emits a valid clipping polygon", () => {
    expect(polygonCss([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }], 100, 100))
      .toBe("polygon(0% 0%,100% 0%,0% 100%)");
  });
});

describe("middle-edge pointer constraint", () => {
  it("keeps a bottom corner attached to both ends of the spine", () => {
    const width = 400;
    const height = 600;
    const origin = { x: 800, y: 600 };
    const constrained = constrainPointer(
      { x: -600, y: -300 }, origin, width, height, 800, 400
    );
    expect(Math.hypot(constrained.x - 400, constrained.y - 600)).toBeLessThanOrEqual(width + 0.001);
    expect(Math.hypot(constrained.x - 400, constrained.y)).toBeLessThanOrEqual(Math.hypot(width, height) + 0.001);
  });

  it("preserves the symmetric binding constraint for a left page", () => {
    const constrained = constrainPointer(
      { x: 1400, y: -300 }, { x: 0, y: 600 }, 400, 600, 800, 400
    );
    expect(Math.hypot(constrained.x - 400, constrained.y - 600)).toBeLessThanOrEqual(400.001);
    expect(Math.hypot(constrained.x - 400, constrained.y)).toBeLessThanOrEqual(Math.hypot(400, 600) + 0.001);
  });

  it("allows a full-width right drag to reach the centered spine", () => {
    const fold = calculateFold({
      width: 400,
      height: 600,
      pageLeft: 400,
      origin: { x: 800, y: 300 },
      pointer: { x: 0, y: 300 },
      maximumPointerDistance: 800
    });
    expect(fold.creasePoint.x).toBeCloseTo(400);
  });

  it("allows the symmetric left drag to reach the centered spine", () => {
    const fold = calculateFold({
      width: 400,
      height: 600,
      pageLeft: 0,
      origin: { x: 0, y: 300 },
      pointer: { x: 800, y: 300 },
      maximumPointerDistance: 800
    });
    expect(fold.creasePoint.x).toBeCloseTo(400);
  });
});

describe("release decision", () => {
  it("commits a slow drag beyond halfway", () => {
    expect(shouldCommitTurn(0.62, 0.05, false)).toBe(true);
  });

  it("commits a short fast flick", () => {
    expect(shouldCommitTurn(0.08, 0.9, false)).toBe(true);
  });

  it("cancels when the pointer returns to its origin", () => {
    expect(shouldCommitTurn(0.9, 1.2, true)).toBe(false);
  });

  it("cancels a short slow release", () => {
    expect(shouldCommitTurn(0.2, 0.1, false)).toBe(false);
  });
});
