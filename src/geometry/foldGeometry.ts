import type { FoldGeometry, Point } from "../types";
import { INTERACTION_CALIBRATION, SHADOW_CALIBRATION } from "../calibration";

const EPSILON = 0.0001;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (point: Point): Point => {
  const length = Math.hypot(point.x, point.y);
  return length < EPSILON ? { x: 1, y: 0 } : { x: point.x / length, y: point.y / length };
};

export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;

export const reflectPoint = (point: Point, creasePoint: Point, normal: Point): Point => {
  const offset = { x: point.x - creasePoint.x, y: point.y - creasePoint.y };
  const signed = dot(normal, offset);
  return { x: point.x - 2 * normal.x * signed, y: point.y - 2 * normal.y * signed };
};

const clipHalfPlane = (
  polygon: Point[],
  creasePoint: Point,
  normal: Point,
  keepPositive: boolean
): Point[] => {
  const signedDistance = (point: Point) => dot(normal, {
    x: point.x - creasePoint.x,
    y: point.y - creasePoint.y
  });
  const inside = (value: number) => keepPositive ? value >= -EPSILON : value <= EPSILON;
  const result: Point[] = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentDistance = signedDistance(current);
    const previousDistance = signedDistance(previous);
    const currentInside = inside(currentDistance);
    const previousInside = inside(previousDistance);

    if (currentInside !== previousInside) {
      const denominator = previousDistance - currentDistance;
      const ratio = Math.abs(denominator) < EPSILON ? 0 : previousDistance / denominator;
      result.push({
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio
      });
    }
    if (currentInside) result.push(current);
  }

  return result;
};

export interface FoldInput {
  width: number;
  height: number;
  pageLeft: number;
  origin: Point;
  pointer: Point;
  maximumPointerDistance?: number;
}

export const constrainPointer = (
  pointer: Point,
  origin: Point,
  width: number,
  height: number,
  maximumDistance = Math.hypot(width, height) * INTERACTION_CALIBRATION.pointerRadiusRatio
): Point => {
  const delta = { x: pointer.x - origin.x, y: pointer.y - origin.y };
  const length = Math.hypot(delta.x, delta.y);
  const scale = length > maximumDistance ? maximumDistance / length : 1;
  return {
    x: origin.x + delta.x * scale,
    y: clamp(
      origin.y + delta.y * scale,
      -height * INTERACTION_CALIBRATION.verticalOvershootRatio,
      height * (1 + INTERACTION_CALIBRATION.verticalOvershootRatio)
    )
  };
};

export const calculateFold = ({
  width,
  height,
  pageLeft,
  origin,
  pointer,
  maximumPointerDistance
}: FoldInput): FoldGeometry => {
  const safePointer = constrainPointer(pointer, origin, width, height, maximumPointerDistance);
  const creasePoint = {
    x: (origin.x + safePointer.x) / 2,
    y: (origin.y + safePointer.y) / 2
  };
  const normal = normalize({ x: origin.x - safePointer.x, y: origin.y - safePointer.y });
  const pageRectangle = [
    { x: pageLeft, y: 0 },
    { x: pageLeft + width, y: 0 },
    { x: pageLeft + width, y: height },
    { x: pageLeft, y: height }
  ];
  const foldedSource = clipHalfPlane(pageRectangle, creasePoint, normal, true);
  const stationaryPolygon = clipHalfPlane(pageRectangle, creasePoint, normal, false);
  const foldedPolygon = foldedSource.map((point) => reflectPoint(point, creasePoint, normal));
  const reflectedA = 1 - 2 * normal.x * normal.x;
  const reflectedB = -2 * normal.x * normal.y;
  const reflectedD = 1 - 2 * normal.y * normal.y;
  const projection = dot(normal, creasePoint);
  const translationX = 2 * projection * normal.x;
  const translationY = 2 * projection * normal.y;
  const travel = distance(origin, safePointer);
  const progress = clamp(travel / width, 0, 1);

  return {
    creasePoint,
    normal,
    angle: Math.atan2(normal.y, normal.x),
    progress,
    maskSize: Math.ceil(Math.hypot(width, height)),
    stationaryPolygon,
    foldedPolygon,
    reflection: [reflectedA, reflectedB, reflectedB, reflectedD, translationX, translationY],
    shadowWidth: SHADOW_CALIBRATION.widthBase + SHADOW_CALIBRATION.widthRange * Math.sin(progress * Math.PI),
    shadowOpacity: SHADOW_CALIBRATION.opacityBase + SHADOW_CALIBRATION.opacityRange * Math.sin(progress * Math.PI)
  };
};

export const polygonCss = (polygon: Point[], bookWidth: number, bookHeight: number): string => {
  if (polygon.length < 3) return "polygon(0 0, 0 0, 0 0)";
  return `polygon(${polygon.map((point) =>
    `${(point.x / bookWidth) * 100}% ${(point.y / bookHeight) * 100}%`
  ).join(",")})`;
};

export const shouldCommitTurn = (
  progress: number,
  directionalVelocity: number,
  returnedToOrigin: boolean,
  reducedMotion = false
): boolean => {
  if (returnedToOrigin) return false;
  const progressThreshold = reducedMotion
    ? INTERACTION_CALIBRATION.reducedMotionCommitProgress
    : INTERACTION_CALIBRATION.commitProgress;
  return progress >= progressThreshold
    || directionalVelocity >= INTERACTION_CALIBRATION.flickVelocityPxPerMs;
};
