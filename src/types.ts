export type Point = { x: number; y: number };
export type Side = "left" | "right";
export type GrabBand = "top" | "middle" | "bottom";
export type DisplayMode = "single" | "spread";
export type TurnPhase = "idle" | "dragging" | "panning" | "committing" | "cancelling" | "resizing";
export type CurvatureEffect = "none" | "multi-band";

export interface PageDefinition {
  title: string;
  section: string;
  render: () => HTMLElement;
  /** Create a mounted copy when cloneNode is insufficient, such as async PDF images. */
  clone?: (cached: HTMLElement) => HTMLElement;
  /** Release resources owned by the cached page when it is evicted or the engine is destroyed. */
  dispose?: (cached: HTMLElement) => void;
}

export interface FlipbookOptions {
  pages: PageDefinition[];
  initialPage?: number;
  pageWidth?: number;
  pageHeight?: number;
  turnDuration?: number;
  autoplayInterval?: number;
  spreadBreakpoint?: number;
  preloadRadius?: number;
  maxCachedPages?: number;
  curvature?: CurvatureEffect;
}

export interface FoldGeometry {
  creasePoint: Point;
  normal: Point;
  angle: number;
  progress: number;
  maskSize: number;
  stationaryPolygon: Point[];
  foldedPolygon: Point[];
  reflection: [number, number, number, number, number, number];
  shadowWidth: number;
  shadowOpacity: number;
}

export interface FlipbookSnapshot {
  currentPage: number;
  displayMode: DisplayMode;
  phase: TurnPhase;
  zoom: number;
}
