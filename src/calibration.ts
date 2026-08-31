export const INTERACTION_CALIBRATION = Object.freeze({
  edgeZoneRatio: 0.08,
  edgeZoneMin: 28,
  edgeZoneMax: 48,
  velocityWindowMs: 90,
  flickVelocityPxPerMs: 0.18,
  commitProgress: 0.5,
  reducedMotionCommitProgress: 0.42,
  returnRadiusMin: 18,
  returnRadiusRatio: 0.055,
  pointerRadiusRatio: 1,
  verticalOvershootRatio: 0.25
});

export const ANIMATION_CALIBRATION = Object.freeze({
  turnDurationMs: 285,
  minimumRemainingRatio: 0.35
});

export const SHADOW_CALIBRATION = Object.freeze({
  widthBase: 18,
  widthRange: 82,
  opacityBase: 0.08,
  opacityRange: 0.34
});

export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - value, 3);
export const easeOutQuint = (value: number): number => 1 - Math.pow(1 - value, 5);
