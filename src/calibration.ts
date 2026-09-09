export const INTERACTION_CALIBRATION = Object.freeze({
  edgeZoneRatio: 0.08,
  edgeZoneMin: 28,
  edgeZoneMax: 48,
  dragLagMs: 54,
  velocityWindowMs: 90,
  flickVelocityPxPerMs: 0.9,
  commitProgress: 0.5,
  reducedMotionCommitProgress: 0.42,
  returnRadiusMin: 18,
  returnRadiusRatio: 0.055,
  pointerRadiusRatio: 1,
  verticalOvershootRatio: 0.25
});

export const ANIMATION_CALIBRATION = Object.freeze({
  turnDurationMs: 600,
  minimumRemainingRatio: 0.72
});

export const SHADOW_CALIBRATION = Object.freeze({
  widthBase: 18,
  widthRange: 82,
  opacityBase: 0.08,
  opacityRange: 0.34
});

export const easeOutCubic = (value: number): number => 1 - Math.pow(1 - value, 3);
export const easeOutQuint = (value: number): number => 1 - Math.pow(1 - value, 5);
export const easeOutSine = (value: number): number => Math.sin((value * Math.PI) / 2);
export const easeInOutCubic = (value: number): number => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;
