import { describe, expect, it } from "vitest";
import {
  ANIMATION_CALIBRATION,
  easeOutCubic,
  easeOutQuint,
  INTERACTION_CALIBRATION
} from "../src/calibration";
import { constrainPointer, shouldCommitTurn } from "../src/geometry/foldGeometry";

describe("reference calibration", () => {
  it("matches the measured automatic turn duration", () => {
    expect(ANIMATION_CALIBRATION.turnDurationMs).toBe(285);
  });

  it("uses a 90ms release velocity sample window", () => {
    expect(INTERACTION_CALIBRATION.velocityWindowMs).toBe(90);
  });

  it("commits at half-page progress", () => {
    expect(shouldCommitTurn(0.5, 0, false)).toBe(true);
    expect(shouldCommitTurn(0.499, 0, false)).toBe(false);
  });

  it("commits a short directional flick at the calibrated boundary", () => {
    expect(shouldCommitTurn(0.01, 0.18, false)).toBe(true);
    expect(shouldCommitTurn(0.01, 0.179, false)).toBe(false);
  });

  it("keeps the pointer within a diagonal-radius physical envelope", () => {
    const width = 400;
    const height = 600;
    const origin = { x: 800, y: 600 };
    const constrained = constrainPointer({ x: -5000, y: -5000 }, origin, width, height);
    expect(Math.hypot(constrained.x - origin.x, constrained.y - origin.y))
      .toBeLessThanOrEqual(Math.hypot(width, height) * INTERACTION_CALIBRATION.pointerRadiusRatio + 0.001);
    expect(constrained.y).toBeGreaterThanOrEqual(-height * INTERACTION_CALIBRATION.verticalOvershootRatio);
  });

  it("uses a faster snap-back curve than the commit curve", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutQuint(0)).toBe(0);
    expect(easeOutQuint(1)).toBe(1);
    expect(easeOutQuint(0.5)).toBeGreaterThan(easeOutCubic(0.5));
  });
});
