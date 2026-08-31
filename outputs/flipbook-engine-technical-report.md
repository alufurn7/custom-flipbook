# Technical investigation: Yunzhan365 flipbook engine

Inspected live on 24 August 2026: <https://book.yunzhan365.com/kykh/cnef/mobile/index.html>

## Executive conclusion

This publication uses a proprietary/first-party Yunzhan365 HTML5 reader rather than an identifiable stock `turn.js`, StPageFlip, or Hammer.js integration. The reader is a hybrid DOM renderer:

- the flip itself is performed with nested, oversized DOM clipping masks and per-frame CSS `translate3d(...) rotate(...)` transforms;
- page art is composed from responsive WebP/JPEG/PNG images, live text, inline SVG, and positioned DOM objects;
- two small canvases render only the accumulated page-edge/thickness effect, not the page faces;
- Vue-compiled page components render the publication's editable/searchable content, while a separate older-style reader shell owns flipping, controls, shadows, preloading, and navigation;
- the apparent paper curvature is primarily a straight geometric fold plus carefully transformed gradient/raster shadow layers, not a WebGL or deformable-mesh simulation.

The most decisive geometric evidence is the clipping-mask size. At a 464 × 655 page size, the live fold mask is 803 × 803. At 696 × 983 it is 1205 × 1205. Those values equal the page diagonal (`sqrt(width² + height²)`) to rounding. This is the classic oversized-square clipping construction used to rotate a fold line without exposing the page outside the clip.

## What was exercised

Verified interactions:

- lower-right and lower-left corner drags;
- middle right and middle left edge drags;
- a fast two-point flick (about 23 ms input path);
- a dense slow path (241 points, about 382 ms);
- a dense slow pull and return to the originating edge (401 points, about 596 ms), which cancelled;
- very short edge movement (about four CSS pixels), which committed when released as a fast outward gesture;
- forward and backward turns;
- next/previous, first/last, direct page entry, contents panel, zoom, autoplay, sound, and fullscreen controls;
- 1280 × 720 desktop layout, expanded 1936 × 1048 layout, and 390 × 844 phone layout;
- asset inventory before and after moving deep into the publication;
- DOM/CSS structure and a mid-animation frame.

The in-app browser's phone-size fullscreen prompt could not establish a real Fullscreen API element, so touch-style drags were blocked by that prompt in the phone layout. Mobile next/previous controls did work and advanced one page at a time. Desktop pointer gestures fully exercised the same fold surface.

## Verified findings

### 1. Runtime and asset graph

The HTML shell loads these important resources:

- `jquery-3.7.1.min.js`
- `book.min.js` — the flip engine
- `main.pc.min.js` — desktop reader/controller
- `Browser.js`
- publication-specific `pageEditor.js` and `textSvgConfig.js`
- `app.js` and `chunk-vendors.js` under `resourceFiles/yzReader/templates/Slide/`
- `config.js`, `bookinfo.js`, and publication/brand JSON
- `flipbook.min.css`, `style.pc.css`, `app.css`, and `chunk-vendors.css`

The page-content DOM contains Vue single-file-component scope markers such as `data-v-e4c3f386`, `data-v-4a8cfe66`, and component-like structures named `.app`, `.pageInner`, `.scalePage`, `.itemContainer`, and `.ItemLayout`. The vendor CSS contains Element-style `.el-*` rules and OverlayScrollbars `.os-*` rules. This verifies a Vue-compiled content layer; the exact Vue version was not exposed to the isolated inspection context.

No loaded URL, DOM class, or callable fingerprint identified `turn.js`, StPageFlip, or Hammer.js. The flip-specific names—`.mask`, `.right-mask-side`, `.left-mask-side`, `.flip-side`, `.flip-shadowB`, `.flip-topshadow`, `.thickness`—come from Yunzhan365's own `book.min.js`/`flipbook.min.css` package. The safest identification is therefore **Yunzhan365's proprietary reader engine**, possibly sharing ancestry with the company's wider FlipHTML5 codebase, but not provably the public FlipHTML5 product/library from this inspection alone.

### 2. Page-face rendering is DOM, not canvas

At the initial 1280 × 720 viewport:

- page size: 464 × 655 CSS px;
- two-page spread: 928 × 655;
- cover: a single 464 × 655 page centered in the viewport;
- fold mask: 803 × 803;
- total live document nodes at initial load: about 1,227;
- live canvases: 2;
- inline SVGs: 21 initially;
- images: 24 initially.

Each face is a `.left-side` or `.right-side`, nested inside a corresponding mask. A typical face contains:

1. `.side-content`;
2. `.side-image` with a low/fallback background and/or responsive `<img>`;
3. an animation panel containing the Vue-rendered `.pageInner` tree;
4. positioned text, image, link, vector, and decorative elements.

Text is live DOM text, often broken into small positioned runs or individual SVG text glyphs for exact design fidelity. It remains visible to the accessibility tree and is potentially searchable/selectable. Decorative vectors remain inline SVG. Large photos arrive as separate image assets with OSS transforms such as `image/resize,h_655,w_464` or `format,webp/.../resize,l_*`.

The two canvases live inside `.left_thickness` and `.right_thickness`. At the cover, the right stack was 9 px wide and the left stack 0 px; both canvases were exactly the stack width by page height. This confines canvas use to page-edge rendering.

### 3. Fold DOM and geometry

The main transformable layers are:

- `.book` — global spread position and scale;
- `.mask`, `.left-mask-side`, `.right-mask-side` — rotating/translated clipping squares;
- `.left-side`, `.right-side`, `.flip-side` — the page face/back inside those masks;
- z-index-swapped previous/current/next pages;
- shadow/highlight elements attached to both stationary and moving layers.

The CSS explicitly applies `will-change: transform`, `translate3d`, `rotate`, and `backface-visibility`. During a captured mid-frame turn, two active masks had:

```text
translate3d(775.695px, 118.485px, 0px) rotate(15.4844deg)
```

with temporary z-indices 16 and 59. At the same frame, moving shadow layers used the same translation/angle and an independent `scaleX(0.0813475)` with opacity about `0.0488`. The screenshot showed a diagonal fold at the outer lower corner while both exposed page faces stayed sharp.

The mask square is centered vertically by `top: 50%` plus negative half-height margin. Its side length equals the page diagonal. At rest, the mask and page return to zero translation/rotation, then z-order is normalized.

### 4. Shadows, curvature, and thickness

The convincing paper effect is layered rather than physically curved:

- `.bookShadow`: fixed outer shadow, `0 0 5px rgba(40,40,40,.7)`;
- `.leftShadow` and `.rightShadow`: wide linear gradients around the spine;
- `.grayShadow`: overlay on the covered/revealed sheet;
- `.edgeShadow`: a rotated linear gradient aligned to the moving crease;
- `.flip-shadowB` and `.flip-topshadow`: embedded raster gradient strips whose translation, rotation, horizontal scale, and opacity change during the fold;
- `.side-highlight`: highlight layer at opacity up to `.8`;
- thickness shadows: 3 px × 6 px blur, with `rotateY(±20deg)`;
- canvas-rendered page-stack edges.

This is a 2D fold/reflection model with lighting cues. The fold boundary is straight; the shadows broaden and darken in a way that creates the perception of curl. There was no WebGL canvas, SVG mesh deformation, or canvas-rasterized page face.

### 5. Gesture behavior and state transition

Observed behavior:

- dragging from a right edge turns forward; dragging from a left edge turns backward;
- corner drags create a diagonal fold; middle-edge drags create a more vertical fold;
- fast outward release commits even after only a few pixels of movement;
- a slow 382 ms inward path committed when released well inside the page;
- pulling inward and returning to the originating edge before release cancelled and restored all transforms;
- forward and backward behavior is symmetric;
- first and last pages use a single-page centered state; interior pages use a centered spread;
- a control-triggered turn settled in roughly 0.28–0.30 s;
- fast input took about 23 ms, while the visual completion continued under the engine's own animation;
- page number changed by a spread on desktop (`2-3`, `4-5`, etc.) and by one page in phone layout (`4`, `5`, etc.).

The commit decision is therefore not a distance-only threshold. It responds to release position and/or release velocity. A practical reproduction should commit when either progress crosses roughly half a page **or** outward velocity exceeds a flick threshold; otherwise animate back. Returning the pointer close to the origin before release must dominate and cancel.

### 6. Animation timing and easing

The measured automatic/control turn duration was approximately 285 ms. A sample near completion still showed a mask at `translate3d(35.3554px, -2.63149px) rotate(0.766685deg)`; roughly 17 ms later the transforms were reset and z-order normalized.

The exact JavaScript easing function could not be read from the protected minified response, so its identity is not verified. Visually and numerically it behaves like a smooth decelerating ease-out, with no overshoot or spring bounce. A close reproduction can use a cubic ease-out for commits and an ease-out/quintic snap-back for cancellations, both around 260–320 ms and shortened according to remaining distance.

### 7. Lazy loading and preloading

The reader does not mount all 32 rich pages at once.

At spread 14–15, the live `data-pageindex` values were 11, 12, 13, 14, 15, and 16: approximately three spreads/six content pages around the current position. The active DOM contained six `.pageInner` trees and eight page masks (including neighboring/transition masks). This is a sliding prefetch window.

The observed asset inventory grew from:

- initial: 54 assets total, 21 images, 3 fonts, 21 inline SVGs;
- after navigation: 120 assets total, 68 images, 4 fonts, 25 inline SVGs.

Images use `complete`/natural-size loading and responsive server transforms. Cover and thumbnail images can remain cached while the rich page window is replaced. Navigation therefore appears to follow:

1. retain current spread;
2. mount at least two pages behind and two pages ahead (often six page indices total);
3. request page-specific image/font/SVG resources on demand;
4. prepare hidden masks for the next turn;
5. after commit, recycle or unmount pages falling outside the window.

### 8. Responsive behavior

Desktop mode uses a two-page spread when there is enough width. The first/last cover is horizontally shifted by half a page so the single sheet remains centered. Interior spreads reset the `.book` translation to zero.

At 390 × 844:

- the desktop `.book` was `display:none`;
- a separate mobile single-page reader was active;
- page face: 370 × 522 at x=10, y=161;
- page indicator changed from `4-5/32` to `4/32`;
- toolbar controls were simplified to More, Zoom, First, Previous, Next, Last, with the remaining controls hidden or moved behind More;
- large side navigation hit areas remained available;
- `.book` used `touch-action:none` to reserve pointer/touch motion for the reader;
- a “click to view fullscreen” overlay appeared in this environment.

Changing back to desktop caused the spread version to remount and recalculate page/mask sizes. This is more than CSS scaling: the application maintains distinct desktop and mobile flip surfaces and maps the logical page index between them.

### 9. Other controls

- **Contents:** opens a pinned left panel with searchable hierarchical section entries, not merely page thumbnails.
- **Zoom:** first click changed the spread from 1392 × 983 to 2784 × 1966 (2×), added a zoom slider with ARIA min 1, max 10, current 2, and provided Reset View, previous/next, Lens Mode, and Exit controls. The large book is translated to keep the focus area in view.
- **Fullscreen:** in the in-app environment the viewport expanded from 1280 × 720 to about 1936 × 1048, but `document.fullscreenElement` was false in the inspection context. Treat this as an environment limitation/fallback, not proof that the site never uses the Fullscreen API in ordinary Chrome.
- **Autoplay:** changed the control label to “Stop flipping” and advanced roughly every three seconds. Stopping it prevented further advancement.
- **Sound:** toggled its accessible label from “Open sound” to “Close sound”.
- **Direct navigation:** entering `20` mounted indices 17–22 around the target; the input retained the literal `20` while focused/after navigation rather than rewriting immediately as a spread label.

## Informed inference: the fold algorithm

The following model is inferred from the measured transforms and diagonal masks. It is not copied from the minified engine.

Let a page be width `W`, height `H`, with the active grabbed corner `C` and current pointer `P`, all in page-local coordinates.

1. Clamp `P` to a physically plausible region so the folded sheet cannot stretch beyond the spine/top/bottom constraints.
2. Compute the crease midpoint:

   ```text
   M = (C + P) / 2
   ```

3. The vector from pointer to original corner is the crease normal:

   ```text
   d = C - P
   n = normalize(d)
   ```

4. The crease is the perpendicular bisector:

   ```text
   n · (X - M) = 0
   ```

5. Rotate and translate an oversized square clip of side:

   ```text
   D = ceil(sqrt(W*W + H*H))
   ```

   so one edge coincides with the crease. Clip the turning face/back with this square.

6. Reflect the page face across the crease. For a point `X`:

   ```text
   reflect(X) = X - 2 * n * dot(n, X - M)
   ```

   In a DOM implementation, express that reflection as translate → rotate → horizontal mirror/rotate → inverse translate, split between the mask and its inner page so the image remains correctly oriented.

7. Use the fold progress `q` (distance from origin normalized by page width) and/or the crease angle to drive:

   - moving-shadow opacity;
   - `scaleX` of gradient strips;
   - spine-shadow width;
   - page-stack thickness;
   - z-index switch once the sheet crosses the spine.

8. On release, estimate horizontal velocity over the last 60–100 ms. Commit if `q > threshold` or `velocity` exceeds the directional flick threshold; otherwise cancel. Animate the pointer proxy to its destination, recomputing geometry every frame.

The middle-edge case can use a synthetic grabbed point at `(W, y)` or `(0, y)`. It should force the crease closer to vertical and suppress some corner-specific vertical displacement. The same reflection math still works.

## Reproduction blueprint

### DOM structure per candidate sheet

```html
<div class="page-mask">
  <div class="page-face">
    <div class="page-content">...</div>
    <div class="fold-highlight"></div>
  </div>
  <div class="crease-shadow"></div>
</div>
```

Keep stationary current, turning front, turning back, and revealed-next surfaces as separate nodes. Maintain three spreads of content but only the masks needed for the current transition.

### Suggested state machine

```text
IDLE
  pointerdown in left/right hot zone -> DRAGGING
DRAGGING
  pointermove -> clamp pointer, solve crease, render transforms/shadows
  pointerup -> COMMITTING or CANCELLING
COMMITTING
  animate pointer proxy to opposite destination -> swap logical spread -> IDLE
CANCELLING
  animate pointer proxy to grabbed origin -> restore z-order -> IDLE
```

Useful extra states are LOADING_TARGET, ZOOMED, AUTOPLAY, and RESIZING. Ignore new turns while a commit/cancel animation is active, but allow queued control navigation if desired.

### Interaction targets

- reserve a full-height side strip, around 24–48 px, for middle-edge drag;
- reserve larger corner zones, around 56–96 px square, for diagonal folds;
- on touch, use `touch-action:none` only on the actual reader surface, not the whole page;
- preserve keyboard-accessible buttons and a page-number input;
- switch to one-page mode below the spread breakpoint and remap display labels accordingly.

### Performance guidance

- apply only `transform` and `opacity` during a drag;
- set `will-change:transform` only on the small active page window;
- avoid recreating rich page content per frame;
- preload the next/previous two pages and recycle nodes outside that range;
- use responsive image URLs sized to the rendered page;
- let text/SVG stay DOM-native for quality and accessibility;
- draw static page-stack edges once per index change, not every animation frame;
- target one geometry solve and a handful of style writes per `requestAnimationFrame`.

## Confidence boundary

High confidence: hybrid DOM architecture, diagonal clipping-mask geometry, separate Vue page-content layer, canvas-only thickness, sliding page window, transform/shadow mechanism, responsive single/spread behavior, measured control timing, and observed gesture outcomes.

Medium confidence: velocity-assisted commit rule, exact number of pages intended in the preload window, and cubic ease-out family. These are strongly supported by behavior but the protected minified function bodies were not available for direct static confirmation.

Not verified: exact private class/function names inside `book.min.js`, exact easing coefficients, precise clamp equations, or any formal relationship to a separately distributed commercial FlipHTML5 library.

## Primary live resources inspected

- [Publication](https://book.yunzhan365.com/kykh/cnef/mobile/index.html)
- [Flipbook CSS](https://book.yunzhan365.com/resourceFiles/html5_templates/template/Clear/style/flipbook.min.css)
- [Reader engine](https://book.yunzhan365.com/resourceFiles/html5_templates/t2026082102/Clear/javascript/book.min.js)
- [Desktop controller](https://book.yunzhan365.com/resourceFiles/html5_templates/t2026082102/Clear/javascript/main.pc.min.js)
- [Publication config](https://book.yunzhan365.com/kykh/cnef/mobile/javascript/config.js)
- [Publication metadata](https://book.yunzhan365.com/kykh/cnef/bookinfo.js)
- [Vue page-content app](https://book.yunzhan365.com/resourceFiles/yzReader/templates/Slide/js/app.js)
- [Vue/vendor bundle](https://book.yunzhan365.com/resourceFiles/yzReader/templates/Slide/js/chunk-vendors.js)
