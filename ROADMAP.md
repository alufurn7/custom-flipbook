# Paperfold Flipbook Engine Roadmap

This roadmap translates the approved reconstruction plan into executable milestones. The engine is an original implementation based on observed behavior and standard page-fold geometry; it does not copy private Yunzhan365 source.

## Success criteria

- [x] Pages track corner and side-edge pointer drags continuously.
- [x] Fast flicks, slow commits, and pull-back cancellation feel consistent.
- [x] Forward/backward turns are symmetric and never expose invalid content.
- [x] Desktop spreads and mobile single pages preserve logical position.
- [x] Nearby pages preload while the mounted DOM remains bounded.
- [x] Zoom, navigation, autoplay, sound, contents, and fullscreen work.
- [x] Keyboard navigation, focus states, announcements, and reduced motion work.
- [x] Geometry/state tests pass and representative interactions maintain smooth animation.

## Milestone 1 — Specification and architecture

- [x] Record the reference dimensions, diagonal-mask construction, timing, loading window, and interaction rules.
- [x] Define a framework-independent TypeScript engine with a small public API.
- [x] Separate geometry, state, rendering, input, animation, and page loading.
- [x] Establish Pointer Events, DOM/CSS transforms, and `requestAnimationFrame` as the implementation baseline.

## Milestone 2 — Static book and page registry

- [x] Create the reader viewport, book, page slots, spine, shadows, and controls.
- [x] Support centered covers, interior spreads, and mobile single pages.
- [x] Fit the book to its container without changing the page aspect ratio.
- [x] Support rich HTML page factories and page lifecycle mounting.

## Milestone 3 — Fold mathematics

- [x] Implement vector operations, half-plane polygon clipping, crease calculation, and reflection matrices.
- [x] Size the rotating logical mask from the page diagonal.
- [x] Support top, middle, and bottom grabs on both sides.
- [x] Constrain pointer coordinates and guard all degenerate cases.
- [x] Calibrate additional spine/top/bottom constraints against more reference recordings.

## Milestone 4 — Input and state machine

- [x] Implement pointer capture and mouse/touch/pen input through Pointer Events.
- [x] Classify corner and side-edge gesture zones.
- [x] Track recent pointer samples and directional release velocity.
- [x] Implement idle, dragging, committing, cancelling, and resizing phases.
- [x] Resolve distance/velocity commits and pull-back cancellations.
- [x] Recover from pointer cancellation and lost capture.

## Milestone 5 — Rendering and animation

- [x] Render stationary, revealed, and reflected page faces with clipping polygons.
- [x] Animate a virtual pointer so interactive and programmatic turns share geometry.
- [x] Add crease, face, spine, outer, and stack shadows.
- [x] Add page thickness that changes with reading progress.
- [x] Normalize page state atomically after commit/cancel.
- [x] Add an optional multi-band curvature shader for a closer high-end paper curl.

## Milestone 6 — Loading and responsiveness

- [x] Maintain a nearby-page mount window instead of mounting the whole book.
- [x] Preload adjacent pages and expose loading placeholders.
- [x] Switch between spread and single-page modes from available container width.
- [x] Preserve the relevant logical page across mode changes.
- [x] Handle resize and orientation changes.
- [x] Add configurable LRU cache eviction for very large publications.

## Milestone 7 — Reader features

- [x] First, previous, next, last, and direct page navigation.
- [x] Searchable table of contents.
- [x] Zoom, drag-to-pan constraints, and reset.
- [x] Autoplay with visibility and interaction pausing.
- [x] Turn sound with browser-safe lazy audio initialization.
- [x] Fullscreen with expanded-view fallback styling.

## Milestone 8 — Accessibility

- [x] Native buttons, page input, visible focus rings, and accessible labels.
- [x] Arrow/Home/End keyboard navigation and Escape cancellation/closure.
- [x] Polite page-change announcements.
- [x] Reduced-motion support.
- [ ] Complete screen-reader testing with NVDA, VoiceOver, and TalkBack. External prerequisite: those assistive-technology targets are not available on this host; the manual matrix is ready.

## Milestone 9 — Verification and calibration

- [x] Unit tests for fold geometry, reflection, clipping, and release decisions.
- [x] Regression tests for front-cover, interior, back-cover, and mobile turn-layer composition.
- [x] Build-time strict TypeScript verification.
- [x] Automated browser interaction tests for corners, side edges, flicks, cancellation, reverse turns, and mobile layout.
- [x] Cross-browser visual regression snapshots for Chromium and WebKit.
- [ ] Execute the opt-in Firefox visual suite on a host where Playwright Firefox can initialize. Retried locally on 27 August 2026; the managed-host compositor stalled before test 1.
- [x] Automated mobile performance profile with 4× CPU-throttled Chromium and WebKit.
- [ ] Performance profiling on physical low-power Android and iOS Safari devices. No physical device target is connected; the capture protocol is ready.
- [x] Final local reference calibration of easing, shadows, constraints, and gesture thresholds.

## Milestone 10 — Packaging

- [x] Extract the demo-independent engine into a publishable package entry.
- [x] Add React adapter and integration examples.
- [x] Add structured JSON and PDF-rendered page adapters.
- [x] Publish API, theming, accessibility, and troubleshooting documentation.

## Delivery order

1. Working geometric prototype
2. Gesture and state reliability
3. Visual paper effects
4. Responsive/lazy page system
5. Reader features and accessibility
6. Automated interaction and visual calibration
7. Package extraction and framework adapters
