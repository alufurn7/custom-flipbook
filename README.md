# Paperfold Flipbook Engine

An original DOM/CSS flipbook prototype reconstructed from observed interaction principles: live edge/corner dragging, geometric folds, reflected page backs, velocity-aware releases, responsive spreads, lazy page mounting, zoom, autoplay, sound, contents, fullscreen, and accessible controls.

## Run

```bash
npm install
npm run dev
```

Open the local URL, then drag from any outer corner or side edge. The engine instance is also exposed as `window.paperfold` for demo inspection.

## Install as a library

Build the installable ESM package and its TypeScript declarations:

```bash
npm run build:package
```

Consumer entry point:

```ts
import { FlipbookEngine, type PageDefinition } from "paperfold-flipbook";
import "paperfold-flipbook/styles.css";

const engine = new FlipbookEngine(document.querySelector("#app")!, {
  pages: [] satisfies PageDefinition[]
});
```

The public entry exports the engine, its option and snapshot types, calibrated
timing constants, and the pure fold-geometry helpers. See
[`examples/vanilla`](./examples/vanilla) for a complete mounting example.

### React

The optional React adapter owns engine setup and cleanup while preserving the
imperative controls through a ref. Keep the page definitions stable with
`useMemo` so React does not intentionally rebuild the engine.

```tsx
import { useMemo, useRef } from "react";
import { Paperfold, type PaperfoldHandle } from "paperfold-flipbook/react";
import "paperfold-flipbook/styles.css";

const flipbook = useRef<PaperfoldHandle>(null);
const pages = useMemo(() => createPages(), []);

<Paperfold
  ref={flipbook}
  pages={pages}
  onChange={(snapshot) => console.log(snapshot.currentPage)}
/>;
```

See [`examples/react`](./examples/react) for a complete React mount.

### Structured JSON

The JSON adapter accepts a safe block schema—headings, paragraphs, quotes,
images, lists, and dividers—and produces regular `PageDefinition` objects.
Text is assigned with `textContent`; it is never interpreted as HTML.

```ts
import { createPagesFromJson } from "paperfold-flipbook/json";

const pages = createPagesFromJson({
  title: "Journal",
  pages: [{
    title: "Opening",
    blocks: [{ type: "heading", level: 1, text: "Journal" }]
  }]
});
```

### PDF.js

The PDF adapter loads a PDF with PDF.js, lazily rasterizes each required page,
shares one rendered image between live clones, and revokes object URLs during
cache eviction. Configure the PDF.js worker through your bundler:

```ts
import { createPagesFromPdf } from "paperfold-flipbook/pdf";

const publication = await createPagesFromPdf("/publication.pdf", {
  workerSrc: new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString(),
  scale: 1.5,
  maxPixelRatio: 2
});

const engine = new FlipbookEngine(root, { pages: publication.pages });
// On application teardown:
engine.destroy();
await publication.destroy();
```

Complete sources are in [`examples/adapters`](./examples/adapters).

## Documentation

- [API and adapters](./docs/API.md)
- [Theming](./docs/THEMING.md)
- [Accessibility](./docs/ACCESSIBILITY.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Manual platform validation](./docs/MANUAL_VALIDATION.md)

## Verify

```bash
npm run check
```

The deterministic browser suite covers live corner and side-edge dragging,
short fast flicks, pull-back cancellation, symmetric previous turns, turn-layer
composition, and the responsive single-page layout:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "work/playwright-browsers"
npx playwright install chromium webkit
npm run test:browser
npm run test:visual
npm run test:performance
```

The performance profile runs one cold and eight steady mobile turns, applies 4× CPU throttling in
Chromium, and records frame intervals, long frames, mounted pages, and cache
bounds. WebKit runs the same mobile scenario without synthetic CPU throttling.

Firefox is available as an opt-in project with `npm run test:firefox`. Some
managed Windows environments cannot initialize Playwright Firefox's software
graphics compositor; run that project on a compatible Windows, macOS, or Linux
host when Firefox coverage is required.

Failure traces, screenshots, and the HTML report are written to the ignored
`test-results/` and `playwright-report/` directories.

## Core API

```ts
engine.next();
engine.previous();
engine.goToPage(7);
engine.setZoom(2);
engine.startAutoplay();
engine.stopAutoplay();
engine.destroy();
```

Large publications can bound retained page content while preserving the active
preload window:

```ts
new FlipbookEngine(element, {
  pages,
  preloadRadius: 3,
  maxCachedPages: 10
});
```

See [ROADMAP.md](./ROADMAP.md) for completed and remaining milestones.
