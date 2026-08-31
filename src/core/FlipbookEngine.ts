import {
  calculateFold,
  clamp,
  distance,
  polygonCss,
  shouldCommitTurn
} from "../geometry/foldGeometry";
import {
  ANIMATION_CALIBRATION,
  easeOutCubic,
  easeOutQuint,
  INTERACTION_CALIBRATION
} from "../calibration";
import type {
  DisplayMode,
  FlipbookOptions,
  FlipbookSnapshot,
  GrabBand,
  PageDefinition,
  Point,
  Side,
  TurnPhase
} from "../types";
import { planTurnBaseIndices } from "./turnLayers";
import { planCacheEvictions } from "./pageCache";

type Listener = (snapshot: FlipbookSnapshot) => void;
type PointerSample = Point & { time: number };

const create = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
};

export class FlipbookEngine {
  private readonly root: HTMLElement;
  private readonly pages: PageDefinition[];
  private readonly options: Required<Omit<FlipbookOptions, "pages">>;
  private readonly listeners = new Set<Listener>();
  private readonly pageCache = new Map<number, HTMLElement>();
  private readonly resizeObserver: ResizeObserver;
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  private viewport = create("section", "flipbook-viewport");
  private stage = create("div", "flipbook-stage");
  private book = create("div", "flipbook-book");
  private baseLayer = create("div", "flipbook-base-layer");
  private overlayLayer = create("div", "flipbook-overlay-layer");
  private thicknessLeft = create("div", "flipbook-thickness flipbook-thickness-left");
  private thicknessRight = create("div", "flipbook-thickness flipbook-thickness-right");
  private spine = create("div", "flipbook-spine");
  private controls = create("nav", "flipbook-controls");
  private toc = create("aside", "flipbook-toc");
  private live = create("div", "flipbook-live");
  private pageInput = create("input", "flipbook-page-input");
  private progress = create("div", "flipbook-progress-fill");

  private currentPage: number;
  private displayMode: DisplayMode = "spread";
  private phase: TurnPhase = "idle";
  private zoom = 1;
  private pan = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  private pointerStart = { x: 0, y: 0 };
  private pageWidth = 1;
  private pageHeight = 1;
  private bookWidth = 1;
  private fitScale = 1;
  private activePointer: number | null = null;
  private activeSide: Side = "right";
  private activeBand: GrabBand = "middle";
  private origin: Point = { x: 0, y: 0 };
  private pointer: Point = { x: 0, y: 0 };
  private samples: PointerSample[] = [];
  private autoplayTimer: number | null = null;
  private animationFrame: number | null = null;
  private soundEnabled = true;
  private audioContext: AudioContext | null = null;

  constructor(root: HTMLElement, input: FlipbookOptions) {
    this.root = root;
    this.pages = input.pages;
    const preloadRadius = Math.max(0, Math.floor(input.preloadRadius ?? 3));
    const minimumCacheSize = preloadRadius * 2 + 2;
    this.options = {
      initialPage: input.initialPage ?? 0,
      pageWidth: input.pageWidth ?? 720,
      pageHeight: input.pageHeight ?? 1016,
      turnDuration: input.turnDuration ?? ANIMATION_CALIBRATION.turnDurationMs,
      autoplayInterval: input.autoplayInterval ?? 3000,
      spreadBreakpoint: input.spreadBreakpoint ?? 760,
      preloadRadius,
      curvature: input.curvature ?? "none",
      maxCachedPages: Math.max(
        minimumCacheSize,
        Math.floor(input.maxCachedPages ?? 10)
      )
    };
    this.currentPage = clamp(this.options.initialPage, 0, this.pages.length - 1);
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.mount();
  }

  get snapshot(): FlipbookSnapshot {
    return { currentPage: this.currentPage, displayMode: this.displayMode, phase: this.phase, zoom: this.zoom };
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  next(): void { this.startProgrammaticTurn("right"); }
  previous(): void { this.startProgrammaticTurn("left"); }

  first(): void {
    if (this.phase !== "idle") return;
    this.currentPage = 0;
    this.renderIdle();
  }

  last(): void {
    if (this.phase !== "idle") return;
    this.currentPage = this.pages.length - 1;
    this.renderIdle();
  }

  goToPage(page: number): void {
    if (this.phase !== "idle") return;
    const target = clamp(Math.round(page), 0, this.pages.length - 1);
    this.currentPage = this.displayMode === "spread" && target > 0 && target < this.pages.length - 1
      ? target % 2 === 0 ? target - 1 : target
      : target;
    this.renderIdle();
  }

  setZoom(value: number): void {
    this.zoom = clamp(value, 1, 4);
    if (this.zoom === 1) this.pan = { x: 0, y: 0 };
    this.applyBookTransform();
    this.emit();
  }

  startAutoplay(): void {
    if (this.autoplayTimer !== null) return;
    this.autoplayTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && this.phase === "idle") {
        if (this.canTurn("right")) this.next(); else this.stopAutoplay();
      }
    }, this.options.autoplayInterval);
    this.updateAutoplayButton();
  }

  stopAutoplay(): void {
    if (this.autoplayTimer !== null) window.clearInterval(this.autoplayTimer);
    this.autoplayTimer = null;
    this.updateAutoplayButton();
  }

  destroy(): void {
    this.stopAutoplay();
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    for (const [index, content] of this.pageCache) this.pages[index].dispose?.(content);
    this.pageCache.clear();
    this.listeners.clear();
    this.root.classList.remove("paperfold-app");
    this.root.replaceChildren();
  }

  private mount(): void {
    this.root.classList.add("paperfold-app");
    this.viewport.setAttribute("aria-label", "Interactive flipbook");
    this.viewport.tabIndex = 0;
    this.live.setAttribute("aria-live", "polite");
    this.live.setAttribute("aria-atomic", "true");
    this.live.className = "sr-only flipbook-live";
    this.toc.setAttribute("aria-label", "Table of contents");
    this.toc.setAttribute("aria-hidden", "true");
    this.book.append(this.baseLayer, this.overlayLayer, this.thicknessLeft, this.thicknessRight, this.spine);
    this.stage.append(this.book);
    this.viewport.append(this.stage, this.toc, this.controls, this.live);
    this.root.replaceChildren(this.viewport);
    this.buildControls();
    this.buildToc();
    this.bindEvents();
    this.resizeObserver.observe(this.root);
    this.layout();
  }

  private buildControls(): void {
    const makeButton = (label: string, symbol: string, action: () => void, className = "") => {
      const button = create("button", `flipbook-button ${className}`.trim());
      button.type = "button";
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = `<span aria-hidden="true">${symbol}</span>`;
      button.addEventListener("click", action);
      return button;
    };
    const progressTrack = create("div", "flipbook-progress");
    progressTrack.append(this.progress);
    this.pageInput.type = "text";
    this.pageInput.inputMode = "numeric";
    this.pageInput.setAttribute("aria-label", "Page number");
    const commitPageInput = () => {
      const page = Number.parseInt(this.pageInput.value, 10);
      if (Number.isFinite(page)) this.goToPage(page - 1);
      else this.updateControls();
    };
    this.pageInput.addEventListener("change", commitPageInput);
    this.pageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitPageInput();
        this.pageInput.select();
      }
    });
    this.controls.append(
      makeButton("Table of contents", "☰", () => this.toggleToc(), "toc-button"),
      makeButton("First page", "⇤", () => this.first()),
      makeButton("Previous page", "←", () => this.previous()),
      this.pageInput,
      makeButton("Next page", "→", () => this.next()),
      makeButton("Last page", "⇥", () => this.last()),
      progressTrack,
      makeButton("Zoom out", "−", () => this.setZoom(this.zoom - 0.25)),
      makeButton("Zoom in", "+", () => this.setZoom(this.zoom + 0.25)),
      makeButton("Reset view", "1:1", () => this.setZoom(1), "reset-button"),
      makeButton("Start autoplay", "▶", () => this.autoplayTimer === null ? this.startAutoplay() : this.stopAutoplay(), "autoplay-button"),
      makeButton("Toggle sound", "♪", () => { this.soundEnabled = !this.soundEnabled; this.updateControls(); }, "sound-button"),
      makeButton("Fullscreen", "⛶", () => this.toggleFullscreen())
    );
  }

  private buildToc(): void {
    const header = create("div", "flipbook-toc-header");
    const title = create("h2");
    title.textContent = "Contents";
    const close = create("button", "flipbook-toc-close");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close contents");
    close.addEventListener("click", () => this.toggleToc(false));
    header.append(title, close);
    const search = create("input", "flipbook-toc-search");
    search.type = "search";
    search.placeholder = "Search pages";
    search.setAttribute("aria-label", "Search contents");
    const list = create("ol", "flipbook-toc-list");
    const renderList = (query = "") => {
      list.replaceChildren();
      this.pages.forEach((page, index) => {
        const haystack = `${page.title} ${page.section}`.toLowerCase();
        if (query && !haystack.includes(query.toLowerCase())) return;
        const item = create("li");
        const button = create("button");
        button.type = "button";
        button.innerHTML = `<span>${page.title}</span><small>${index + 1}</small>`;
        button.addEventListener("click", () => { this.goToPage(index); this.toggleToc(false); });
        item.append(button);
        list.append(item);
      });
    };
    search.addEventListener("input", () => renderList(search.value));
    renderList();
    this.toc.append(header, search, list);
  }

  private bindEvents(): void {
    this.book.addEventListener("pointerdown", (event) => this.pointerDown(event));
    this.book.addEventListener("pointermove", (event) => this.pointerMove(event));
    this.book.addEventListener("pointerup", (event) => this.pointerUp(event));
    this.book.addEventListener("pointercancel", () => {
      if (this.phase === "panning") this.endPan();
      else this.cancelGesture();
    });
    this.book.addEventListener("lostpointercapture", () => {
      if (this.phase === "dragging") this.cancelGesture();
      if (this.phase === "panning") this.endPan();
    });
    this.viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); this.next(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); this.previous(); }
      if (event.key === "Home") { event.preventDefault(); this.first(); }
      if (event.key === "End") { event.preventDefault(); this.last(); }
      if (event.key === "+" || event.key === "=") this.setZoom(this.zoom + 0.25);
      if (event.key === "-") this.setZoom(this.zoom - 0.25);
      if (event.key === "Escape") {
        this.toggleToc(false);
        if (this.phase === "dragging") this.cancelGesture();
        else this.setZoom(1);
      }
    });
  }

  private layout(): void {
    const rect = this.root.getBoundingClientRect();
    const nextMode: DisplayMode = rect.width >= this.options.spreadBreakpoint ? "spread" : "single";
    if (nextMode !== this.displayMode) {
      this.displayMode = nextMode;
      if (nextMode === "spread" && this.currentPage > 0 && this.currentPage < this.pages.length - 1) {
        this.currentPage = this.currentPage % 2 === 0 ? this.currentPage - 1 : this.currentPage;
      }
    }
    const availableWidth = Math.max(280, rect.width - 40);
    const availableHeight = Math.max(320, rect.height - 104);
    const spreadFactor = this.displayMode === "spread" ? 2 : 1;
    this.fitScale = Math.min(
      availableWidth / (this.options.pageWidth * spreadFactor),
      availableHeight / this.options.pageHeight,
      1
    );
    this.pageWidth = Math.round(this.options.pageWidth * this.fitScale);
    this.pageHeight = Math.round(this.options.pageHeight * this.fitScale);
    this.bookWidth = this.pageWidth * spreadFactor;
    this.book.style.setProperty("--page-width", `${this.pageWidth}px`);
    this.book.style.setProperty("--page-height", `${this.pageHeight}px`);
    this.book.style.width = `${this.bookWidth}px`;
    this.book.style.height = `${this.pageHeight}px`;
    this.phase = "resizing";
    this.renderIdle();
    this.phase = "idle";
    this.applyBookTransform();
  }

  private renderIdle(): void {
    this.overlayLayer.replaceChildren();
    this.baseLayer.replaceChildren();
    for (const index of this.visibleIndices(this.currentPage)) {
      const slot = this.slotForPage(index);
      if (slot) this.baseLayer.append(this.createPageShell(index, slot));
    }
    this.updatePreloadWindow();
    this.updateThickness();
    this.updateControls();
    this.applyBookTransform();
    this.announce();
    this.emit();
  }

  private visibleIndices(page: number): number[] {
    if (this.displayMode === "single") return [page];
    if (page === 0 || page === this.pages.length - 1) return [page];
    return [page, Math.min(page + 1, this.pages.length - 1)];
  }

  private slotForPage(index: number): "left" | "right" | "single" | null {
    if (this.displayMode === "single") return index === this.currentPage ? "single" : null;
    if (this.currentPage === 0) return index === 0 ? "right" : null;
    if (this.currentPage === this.pages.length - 1) return index === this.currentPage ? "left" : null;
    if (index === this.currentPage) return "left";
    if (index === this.currentPage + 1) return "right";
    return null;
  }

  private createPageShell(index: number, slot: "left" | "right" | "single"): HTMLElement {
    const shell = create("article", `flipbook-page flipbook-page-${slot}`);
    shell.dataset.page = String(index);
    shell.setAttribute("aria-label", `Page ${index + 1}: ${this.pages[index].title}`);
    shell.append(this.getPageContent(index));
    return shell;
  }

  private getPageContent(index: number): HTMLElement {
    const definition = this.pages[index];
    const cached = this.pageCache.get(index);
    if (cached) {
      this.pageCache.delete(index);
      this.pageCache.set(index, cached);
      return definition.clone?.(cached) ?? cached.cloneNode(true) as HTMLElement;
    }
    const content = definition.render();
    content.classList.add("flipbook-page-content");
    this.pageCache.set(index, content);
    return definition.clone?.(content) ?? content.cloneNode(true) as HTMLElement;
  }

  private updatePreloadWindow(): void {
    const minimum = Math.max(0, this.currentPage - this.options.preloadRadius);
    const maximum = Math.min(this.pages.length - 1, this.currentPage + this.options.preloadRadius + 1);
    const protectedIndices = new Set<number>();
    for (let index = minimum; index <= maximum; index += 1) protectedIndices.add(index);
    for (let index = minimum; index <= maximum; index += 1) this.getPageContent(index);
    const evictions = planCacheEvictions({
      cacheOrder: [...this.pageCache.keys()],
      protectedIndices,
      maximumSize: this.options.maxCachedPages
    });
    for (const index of evictions) {
      const content = this.pageCache.get(index);
      if (content) this.pages[index].dispose?.(content);
      this.pageCache.delete(index);
    }
  }

  private pointerDown(event: PointerEvent): void {
    if (this.phase !== "idle") return;
    const local = this.toLocal(event);
    if (this.zoom > 1) {
      this.activePointer = event.pointerId;
      this.pointerStart = { x: event.clientX, y: event.clientY };
      this.panStart = { ...this.pan };
      this.phase = "panning";
      this.book.setPointerCapture(event.pointerId);
      this.book.classList.add("is-panning");
      this.emit();
      return;
    }
    const edgeSize = clamp(
      this.pageWidth * INTERACTION_CALIBRATION.edgeZoneRatio,
      INTERACTION_CALIBRATION.edgeZoneMin,
      INTERACTION_CALIBRATION.edgeZoneMax
    );
    const side: Side | null = local.x <= edgeSize ? "left" : local.x >= this.bookWidth - edgeSize ? "right" : null;
    if (!side || !this.canTurn(side)) return;
    this.stopAutoplay();
    this.activePointer = event.pointerId;
    this.activeSide = side;
    this.activeBand = local.y < this.pageHeight * 0.22 ? "top" : local.y > this.pageHeight * 0.78 ? "bottom" : "middle";
    const pageLeft = this.sourcePageLeft(side);
    this.origin = {
      x: side === "right" ? pageLeft + this.pageWidth : pageLeft,
      y: this.activeBand === "top" ? 0 : this.activeBand === "bottom" ? this.pageHeight : clamp(local.y, 0, this.pageHeight)
    };
    this.pointer = local;
    this.samples = [{ ...local, time: performance.now() }];
    this.phase = "dragging";
    this.book.setPointerCapture(event.pointerId);
    this.prepareTurnLayers(side);
    this.renderFold(local);
    this.emit();
  }

  private pointerMove(event: PointerEvent): void {
    if (this.phase === "panning" && event.pointerId === this.activePointer) {
      this.pan = {
        x: this.panStart.x + event.clientX - this.pointerStart.x,
        y: this.panStart.y + event.clientY - this.pointerStart.y
      };
      this.applyBookTransform();
      return;
    }
    if (this.phase !== "dragging" || event.pointerId !== this.activePointer) return;
    const local = this.toLocal(event);
    this.pointer = local;
    const now = performance.now();
    this.samples.push({ ...local, time: now });
    this.samples = this.samples.filter(
      (sample) => now - sample.time <= INTERACTION_CALIBRATION.velocityWindowMs
    );
    this.renderFold(local);
  }

  private pointerUp(event: PointerEvent): void {
    if (this.phase === "panning" && event.pointerId === this.activePointer) {
      this.book.releasePointerCapture(event.pointerId);
      this.endPan();
      return;
    }
    if (this.phase !== "dragging" || event.pointerId !== this.activePointer) return;
    const local = this.toLocal(event);
    const geometry = this.renderFold(local);
    const velocity = this.releaseVelocity();
    const directionalVelocity = this.activeSide === "right" ? Math.max(0, -velocity.x) : Math.max(0, velocity.x);
    const returned = distance(local, this.origin) < Math.max(
      INTERACTION_CALIBRATION.returnRadiusMin,
      this.pageWidth * INTERACTION_CALIBRATION.returnRadiusRatio
    );
    const commit = shouldCommitTurn(geometry.progress, directionalVelocity, returned, this.reducedMotion.matches);
    this.book.releasePointerCapture(event.pointerId);
    this.activePointer = null;
    this.animateRelease(commit, local);
  }

  private cancelGesture(): void {
    if (this.phase !== "dragging") return;
    this.activePointer = null;
    this.animateRelease(false, this.pointer);
  }

  private endPan(): void {
    this.activePointer = null;
    this.phase = "idle";
    this.book.classList.remove("is-panning");
    this.applyBookTransform();
    this.emit();
  }

  private prepareTurnLayers(side: Side): void {
    this.overlayLayer.replaceChildren();
    const target = this.targetPage(side);
    const currentIndices = this.visibleIndices(this.currentPage);
    const targetIndices = this.visibleIndices(target);
    const foldedBackIndex = this.backPageIndex(side);
    const baseIndices = planTurnBaseIndices({
      displayMode: this.displayMode,
      targetIndices,
      foldedBackIndex
    });
    this.baseLayer.replaceChildren();
    for (const index of baseIndices) {
      const slot = this.slotForPageAt(index, target);
      if (slot) this.baseLayer.append(this.createPageShell(index, slot));
    }
    for (const index of currentIndices) {
      const slot = this.slotForPageAt(index, this.currentPage);
      if (!slot) continue;
      if (this.isTurningPage(index, side)) continue;
      this.overlayLayer.append(this.createPageShell(index, slot));
    }
    const stationaryClip = create("div", "flipbook-stationary-clip");
    const stationaryPage = this.createPageShell(this.turningPageIndex(side), side === "right" ? "right" : "left");
    stationaryClip.append(stationaryPage);
    const foldedClip = create("div", "flipbook-folded-clip");
    const reflectedSurface = create("div", "flipbook-reflected-surface");
    const back = this.createPageShell(foldedBackIndex, side === "right" ? "right" : "left");
    back.classList.add("flipbook-page-back");
    reflectedSurface.append(back);
    foldedClip.append(reflectedSurface);
    const creaseShadow = create("div", "flipbook-crease-shadow");
    const shadowClip = create("div", "flipbook-shadow-clip");
    shadowClip.append(creaseShadow);
    const foldedShade = create("div", "flipbook-folded-shade");
    if (this.options.curvature === "multi-band") {
      foldedClip.append(create("div", "flipbook-curvature-shader"));
    }
    foldedClip.append(foldedShade);
    this.overlayLayer.append(stationaryClip, foldedClip, shadowClip);
  }

  private renderFold(pointer: Point) {
    const pageLeft = this.sourcePageLeft(this.activeSide);
    const geometry = calculateFold({
      width: this.pageWidth,
      height: this.pageHeight,
      pageLeft,
      origin: this.origin,
      pointer,
      maximumPointerDistance: this.bookWidth
    });
    const stationary = this.overlayLayer.querySelector<HTMLElement>(".flipbook-stationary-clip");
    const folded = this.overlayLayer.querySelector<HTMLElement>(".flipbook-folded-clip");
    const reflected = this.overlayLayer.querySelector<HTMLElement>(".flipbook-reflected-surface");
    const shadow = this.overlayLayer.querySelector<HTMLElement>(".flipbook-crease-shadow");
    const shade = this.overlayLayer.querySelector<HTMLElement>(".flipbook-folded-shade");
    const curvature = this.overlayLayer.querySelector<HTMLElement>(".flipbook-curvature-shader");
    if (stationary) stationary.style.clipPath = polygonCss(geometry.stationaryPolygon, this.bookWidth, this.pageHeight);
    if (folded) folded.style.clipPath = polygonCss(geometry.foldedPolygon, this.bookWidth, this.pageHeight);
    if (reflected) reflected.style.transform = `matrix(${geometry.reflection.join(",")})`;
    if (shadow) {
      shadow.style.width = `${geometry.shadowWidth}px`;
      shadow.style.opacity = `${geometry.shadowOpacity}`;
      shadow.style.transform = `translate(${geometry.creasePoint.x}px, ${geometry.creasePoint.y}px) rotate(${geometry.angle}rad) translateX(-50%)`;
    }
    if (shade) shade.style.opacity = `${0.08 + geometry.progress * 0.22}`;
    if (curvature) {
      const wave = Math.sin(geometry.progress * Math.PI);
      curvature.style.width = `${Math.min(this.pageWidth * 0.3, 32 + geometry.progress * 112)}px`;
      curvature.style.opacity = `${0.08 + wave * 0.58}`;
      curvature.style.transform = `translate(${geometry.creasePoint.x}px, ${geometry.creasePoint.y}px) rotate(${geometry.angle}rad) translateX(-42%)`;
    }
    return geometry;
  }

  private animateRelease(commit: boolean, start: Point): void {
    this.phase = commit ? "committing" : "cancelling";
    const destination = commit
      ? { x: this.activeSide === "right" ? -this.pageWidth * 0.35 : this.bookWidth + this.pageWidth * 0.35, y: this.origin.y }
      : this.origin;
    const baseDuration = this.reducedMotion.matches ? 1 : this.options.turnDuration;
    const remaining = clamp(
      distance(start, destination) / (this.pageWidth * 1.35),
      ANIMATION_CALIBRATION.minimumRemainingRatio,
      1
    );
    const duration = Math.max(1, baseDuration * remaining);
    const started = performance.now();

    const frame = (now: number) => {
      const raw = clamp((now - started) / duration, 0, 1);
      const eased = commit ? easeOutCubic(raw) : easeOutQuint(raw);
      const point = {
        x: start.x + (destination.x - start.x) * eased,
        y: start.y + (destination.y - start.y) * eased
      };
      this.renderFold(point);
      if (raw < 1) {
        this.animationFrame = requestAnimationFrame(frame);
        return;
      }
      this.animationFrame = null;
      if (commit) {
        this.currentPage = this.targetPage(this.activeSide);
        this.playTurnSound();
      }
      this.phase = "idle";
      this.renderIdle();
    };
    this.animationFrame = requestAnimationFrame(frame);
  }

  private startProgrammaticTurn(side: Side): void {
    if (this.phase !== "idle" || !this.canTurn(side)) return;
    this.activeSide = side;
    this.activeBand = "bottom";
    const pageLeft = this.sourcePageLeft(side);
    this.origin = { x: side === "right" ? pageLeft + this.pageWidth : pageLeft, y: this.pageHeight };
    const inset = this.pageWidth * 0.08;
    const start = { x: this.origin.x + (side === "right" ? -inset : inset), y: this.pageHeight - inset };
    this.pointer = start;
    this.prepareTurnLayers(side);
    this.renderFold(start);
    this.animateRelease(true, start);
  }

  private canTurn(side: Side): boolean {
    return side === "right" ? this.currentPage < this.pages.length - 1 : this.currentPage > 0;
  }

  private targetPage(side: Side): number {
    if (this.displayMode === "single") return clamp(this.currentPage + (side === "right" ? 1 : -1), 0, this.pages.length - 1);
    if (side === "right") {
      if (this.currentPage === 0) return Math.min(1, this.pages.length - 1);
      return Math.min(this.currentPage + 2, this.pages.length - 1);
    }
    if (this.currentPage === this.pages.length - 1) {
      const candidate = this.currentPage - 2;
      return Math.max(1, candidate % 2 === 0 ? candidate - 1 : candidate);
    }
    if (this.currentPage <= 1) return 0;
    return Math.max(0, this.currentPage - 2);
  }

  private turningPageIndex(side: Side): number {
    const visible = this.visibleIndices(this.currentPage);
    return side === "right" ? visible[visible.length - 1] : visible[0];
  }

  private backPageIndex(side: Side): number {
    return clamp(this.turningPageIndex(side) + (side === "right" ? 1 : -1), 0, this.pages.length - 1);
  }

  private isTurningPage(index: number, side: Side): boolean {
    return index === this.turningPageIndex(side);
  }

  private sourcePageLeft(side: Side): number {
    if (this.displayMode === "single") return 0;
    return side === "right" ? this.pageWidth : 0;
  }

  private slotForPageAt(index: number, anchor: number): "left" | "right" | "single" | null {
    if (this.displayMode === "single") return index === anchor ? "single" : null;
    if (anchor === 0) return index === 0 ? "right" : null;
    if (anchor === this.pages.length - 1) return index === anchor ? "left" : null;
    if (index === anchor) return "left";
    if (index === anchor + 1) return "right";
    return null;
  }

  private toLocal(event: PointerEvent): Point {
    const rect = this.book.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / this.zoom,
      y: (event.clientY - rect.top) / this.zoom
    };
  }

  private releaseVelocity(): Point {
    if (this.samples.length < 2) return { x: 0, y: 0 };
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const elapsed = Math.max(1, last.time - first.time);
    return { x: (last.x - first.x) / elapsed, y: (last.y - first.y) / elapsed };
  }

  private updateThickness(): void {
    const denominator = Math.max(1, this.pages.length - 1);
    const progress = this.currentPage / denominator;
    const leftWidth = this.currentPage === 0 ? 0 : Math.round(3 + 15 * progress);
    const rightWidth = this.currentPage === this.pages.length - 1 ? 0 : Math.round(3 + 15 * (1 - progress));
    this.thicknessLeft.style.width = `${leftWidth}px`;
    this.thicknessRight.style.width = `${rightWidth}px`;
  }

  private updateControls(): void {
    const visible = this.visibleIndices(this.currentPage).map((index) => index + 1);
    this.pageInput.value = visible.length > 1 ? `${visible[0]}–${visible[1]} / ${this.pages.length}` : `${visible[0]} / ${this.pages.length}`;
    this.progress.style.width = `${((this.currentPage + 1) / this.pages.length) * 100}%`;
    const sound = this.controls.querySelector<HTMLButtonElement>(".sound-button");
    if (sound) {
      sound.setAttribute("aria-label", this.soundEnabled ? "Mute turn sound" : "Enable turn sound");
      sound.classList.toggle("is-muted", !this.soundEnabled);
    }
    this.updateAutoplayButton();
  }

  private updateAutoplayButton(): void {
    const autoplay = this.controls.querySelector<HTMLButtonElement>(".autoplay-button");
    if (!autoplay) return;
    const playing = this.autoplayTimer !== null;
    autoplay.setAttribute("aria-label", playing ? "Stop autoplay" : "Start autoplay");
    autoplay.innerHTML = `<span aria-hidden="true">${playing ? "Ⅱ" : "▶"}</span>`;
  }

  private toggleToc(force?: boolean): void {
    const open = force ?? !this.toc.classList.contains("is-open");
    this.toc.classList.toggle("is-open", open);
    this.toc.setAttribute("aria-hidden", String(!open));
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.viewport.requestFullscreen();
    } catch {
      this.viewport.classList.toggle("is-expanded");
      this.layout();
    }
  }

  private applyBookTransform(): void {
    if (this.zoom > 1) {
      const maxX = Math.max(0, (this.bookWidth * (this.zoom - 1)) / 2);
      const maxY = Math.max(0, (this.pageHeight * (this.zoom - 1)) / 2);
      this.pan.x = clamp(this.pan.x, -maxX, maxX);
      this.pan.y = clamp(this.pan.y, -maxY, maxY);
    }
    this.book.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  private playTurnSound(): void {
    if (!this.soundEnabled) return;
    try {
      this.audioContext ??= new AudioContext();
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(170, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(70, context.currentTime + 0.08);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.11);
    } catch {
      this.soundEnabled = false;
    }
  }

  private announce(): void {
    const visible = this.visibleIndices(this.currentPage).map((index) => index + 1);
    this.live.textContent = visible.length > 1
      ? `Pages ${visible[0]} and ${visible[1]} of ${this.pages.length}`
      : `Page ${visible[0]} of ${this.pages.length}`;
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
