import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type ReactElement
} from "react";
import { FlipbookEngine } from "./core/FlipbookEngine";
import type { FlipbookOptions, FlipbookSnapshot, PageDefinition } from "./types";

export interface PaperfoldHandle {
  getEngine(): FlipbookEngine | null;
  getSnapshot(): FlipbookSnapshot | null;
  next(): void;
  previous(): void;
  first(): void;
  last(): void;
  goToPage(page: number): void;
  setZoom(value: number): void;
  startAutoplay(): void;
  stopAutoplay(): void;
}

export interface PaperfoldProps {
  pages: PageDefinition[];
  options?: Omit<FlipbookOptions, "pages">;
  containerProps?: Omit<HTMLAttributes<HTMLDivElement>, "children">;
  onReady?: (engine: FlipbookEngine) => void;
  onChange?: (snapshot: FlipbookSnapshot) => void;
}

/**
 * React lifecycle adapter for the framework-independent Paperfold engine.
 * Keep `pages` stable with useMemo when their contents have not changed.
 */
export const Paperfold = forwardRef<PaperfoldHandle, PaperfoldProps>(function Paperfold(
  { pages, options = {}, containerProps, onReady, onChange },
  forwardedRef
): ReactElement {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FlipbookEngine | null>(null);
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onChange);
  onReadyRef.current = onReady;
  onChangeRef.current = onChange;

  useImperativeHandle(forwardedRef, () => ({
    getEngine: () => engineRef.current,
    getSnapshot: () => engineRef.current?.snapshot ?? null,
    next: () => engineRef.current?.next(),
    previous: () => engineRef.current?.previous(),
    first: () => engineRef.current?.first(),
    last: () => engineRef.current?.last(),
    goToPage: (page) => engineRef.current?.goToPage(page),
    setZoom: (value) => engineRef.current?.setZoom(value),
    startAutoplay: () => engineRef.current?.startAutoplay(),
    stopAutoplay: () => engineRef.current?.stopAutoplay()
  }), []);

  const {
    initialPage,
    pageWidth,
    pageHeight,
    turnDuration,
    autoplayInterval,
    spreadBreakpoint,
    preloadRadius,
    maxCachedPages,
    curvature
  } = options;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const engine = new FlipbookEngine(mount, {
      pages,
      initialPage,
      pageWidth,
      pageHeight,
      turnDuration,
      autoplayInterval,
      spreadBreakpoint,
      preloadRadius,
      maxCachedPages,
      curvature
    });
    engineRef.current = engine;
    const unsubscribe = engine.onChange((snapshot) => onChangeRef.current?.(snapshot));
    onReadyRef.current?.(engine);
    onChangeRef.current?.(engine.snapshot);

    return () => {
      unsubscribe();
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [
    pages,
    initialPage,
    pageWidth,
    pageHeight,
    turnDuration,
    autoplayInterval,
    spreadBreakpoint,
    preloadRadius,
    maxCachedPages,
    curvature
  ]);

  return createElement("div", { ...containerProps, ref: mountRef });
});

Paperfold.displayName = "Paperfold";
