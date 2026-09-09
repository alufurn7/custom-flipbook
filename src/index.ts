export { FlipbookEngine } from "./core/FlipbookEngine";

export {
  ANIMATION_CALIBRATION,
  INTERACTION_CALIBRATION,
  SHADOW_CALIBRATION,
  easeInOutCubic,
  easeOutCubic,
  easeOutQuint,
  easeOutSine
} from "./calibration";

export {
  calculateFold,
  clamp,
  constrainPointer,
  distance,
  dot,
  normalize,
  polygonCss,
  reflectPoint,
  shouldCommitTurn
} from "./geometry/foldGeometry";

export type { FoldInput } from "./geometry/foldGeometry";
export type {
  CurvatureEffect,
  DisplayMode,
  FlipbookOptions,
  FlipbookSnapshot,
  FoldGeometry,
  GrabBand,
  PageDefinition,
  Point,
  Side,
  TurnPhase
} from "./types";
