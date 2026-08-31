# Paperfold API

Paperfold is an ESM-only, framework-independent DOM/CSS flipbook. JavaScript
page indices are zero-based; labels in the reader interface are one-based.

## Package entry points

| Import | Purpose | Peer dependency |
| --- | --- | --- |
| `paperfold-flipbook` | Core engine, types, geometry, calibration | None |
| `paperfold-flipbook/styles.css` | Engine and adapter styles | None |
| `paperfold-flipbook/react` | React lifecycle component and ref | React 18.2+ |
| `paperfold-flipbook/json` | Structured JSON block adapter | None |
| `paperfold-flipbook/pdf` | Lazy PDF.js raster adapter | PDF.js 6.2.108+ |

## Core setup

```ts
import { FlipbookEngine, type PageDefinition } from "paperfold-flipbook";
import "paperfold-flipbook/styles.css";

const pages: PageDefinition[] = [{
  title: "Cover",
  section: "Opening",
  render() {
    const page = document.createElement("article");
    page.textContent = "Cover";
    return page;
  }
}];

const root = document.querySelector<HTMLElement>("#reader");
if (!root) throw new Error("Missing reader root");
const engine = new FlipbookEngine(root, { pages });
```

The root must have measurable width and height. Supply at least one page. Call
`destroy()` when removing the reader.

## `FlipbookOptions`

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `pages` | `PageDefinition[]` | required | Ordered publication pages |
| `initialPage` | `number` | `0` | Initial zero-based page index |
| `pageWidth` | `number` | `720` | Logical page width used for aspect ratio |
| `pageHeight` | `number` | `1016` | Logical page height used for aspect ratio |
| `turnDuration` | `number` | `285` | Maximum release animation duration in ms |
| `autoplayInterval` | `number` | `3000` | Delay between automatic turns in ms |
| `spreadBreakpoint` | `number` | `760` | Root width where two-page mode begins |
| `preloadRadius` | `number` | `3` | Pages prepared on each side of the current page |
| `maxCachedPages` | `number` | `10` | Retained content cap; raised if smaller than the protected preload window |
| `curvature` | `"none" \| "multi-band"` | `"none"` | Optional crease-following highlight/compression shader |

In spread mode, navigation to an interior right-hand index is normalized to the
containing spread. Covers remain single pages.

## `PageDefinition`

```ts
interface PageDefinition {
  title: string;
  section: string;
  render: () => HTMLElement;
  clone?: (cached: HTMLElement) => HTMLElement;
  dispose?: (cached: HTMLElement) => void;
}
```

- `title` supplies page and contents labels.
- `section` groups entries in the searchable contents panel.
- `render` creates the cache-owned DOM source.
- `clone` is optional. Paperfold normally uses `cloneNode(true)`. Provide it
  for non-cloneable runtime state such as canvases or asynchronous media.
- `dispose` runs when a cached page is evicted and during `destroy()`. Revoke
  URLs, cancel work, or release framework roots here.

The PDF adapter demonstrates the clone/dispose contract.

## Engine state and methods

`engine.snapshot` returns:

```ts
interface FlipbookSnapshot {
  currentPage: number;
  displayMode: "single" | "spread";
  phase: "idle" | "dragging" | "panning" | "committing" | "cancelling" | "resizing";
  zoom: number;
}
```

| Method | Behavior |
| --- | --- |
| `onChange(listener)` | Subscribes to snapshots and returns an unsubscribe function |
| `next()` / `previous()` | Starts an animated turn when idle and available |
| `first()` / `last()` | Navigates immediately when idle |
| `goToPage(index)` | Navigates to a clamped, zero-based page when idle |
| `setZoom(value)` | Sets zoom, clamped from 1 to 4 |
| `startAutoplay()` | Starts visibility-aware autoplay |
| `stopAutoplay()` | Stops autoplay |
| `destroy()` | Stops work, disposes cached resources, disconnects observation, and clears DOM/listeners |

Commands issued during a drag, release animation, or resize are intentionally
ignored. Use `onChange` when application state must follow the reader.

## React adapter

```tsx
import { useMemo, useRef } from "react";
import { Paperfold, type PaperfoldHandle } from "paperfold-flipbook/react";

const pages = useMemo(() => createPages(), []);
const reader = useRef<PaperfoldHandle>(null);

<Paperfold
  ref={reader}
  pages={pages}
  options={{ preloadRadius: 3 }}
  onChange={(snapshot) => console.log(snapshot.currentPage)}
  containerProps={{ "aria-label": "Annual report" }}
/>;
```

The component owns setup and cleanup. Changing `pages` or an engine option
recreates the engine; keep stable values memoized. Callback identity changes do
not recreate it. `PaperfoldHandle` forwards navigation, zoom, and autoplay and
exposes `getEngine()` and `getSnapshot()`.

## Structured JSON adapter

`createPagesFromJson(document, options?)` supports:

- `heading`: `text`, optional `level` 1-3;
- `paragraph`: `text`;
- `quote`: `text`, optional `attribution`;
- `image`: `src`, `alt`, optional `caption`;
- `list`: `items`, optional `ordered`;
- `divider`.

Text uses `textContent`, never `innerHTML`. Image URLs are loaded by the browser
and remain subject to the host application's content policy.

## PDF adapter

```ts
import { createPagesFromPdf } from "paperfold-flipbook/pdf";

const publication = await createPagesFromPdf("/publication.pdf", {
  workerSrc: new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(),
  scale: 1.5,
  maxPixelRatio: 2,
  titlePrefix: "Report"
});

const engine = new FlipbookEngine(root, { pages: publication.pages });
engine.destroy();
await publication.destroy();
```

Accepted sources are a URL string, `URL`, `Uint8Array`, `ArrayBuffer`, or PDF.js
document parameters. Pages rasterize lazily and share blob URLs across mounted
clones. Configure the PDF.js worker and serve remote PDFs with valid CORS
headers. During teardown, destroy the engine before the publication.

## Geometry exports

The root exports `calculateFold`, `constrainPointer`, `reflectPoint`,
`polygonCss`, `shouldCommitTurn`, `clamp`, `distance`, `dot`, and `normalize`,
plus interaction, animation, and shadow calibration constants. These support
custom renderers and deterministic testing; the DOM engine already applies them.

## Browser requirements

The core expects modern Pointer Events, CSS `clip-path`, transforms,
`ResizeObserver`, `requestAnimationFrame`, and `matchMedia`. Fullscreen and Web
Audio are enhanced controls with fallbacks. The package is ESM and engine
construction requires a DOM mount; do not construct it during server rendering.
