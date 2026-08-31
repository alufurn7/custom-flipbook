# Troubleshooting

## The reader is blank or tiny

- Import `paperfold-flipbook/styles.css`.
- Give the mount a definite width and height.
- Supply at least one page and return an `HTMLElement` from every `render()`.
- Construct the engine after the mount connects to the DOM.
- Check for an exception thrown by page rendering.

## A drag does not start

Dragging begins only in the outer 28-48 px edge zone. Above 1x zoom, dragging
pans instead of turning; reset zoom. Navigation is ignored while another drag,
release, pan, or resize is active. Inspect `engine.snapshot.phase`.

Do not override `.flipbook-book { touch-action: none }` or disable its pointer
events.

## The wrong page or spread opens

JavaScript indices are zero-based. Interior spreads normalize to their left
page, while first and last covers display alone. Read `snapshot.currentPage`
instead of assuming each command advances one index.

## A page is blank during a fold

`cloneNode(true)` does not copy canvas pixels, framework roots, playback state,
or asynchronous listeners. Supply `PageDefinition.clone` for those resources
and `dispose` to release them. The PDF adapter implements both hooks.

## React repeatedly recreates the reader

Keep `pages` stable with `useMemo`. Callback changes are safe. React Strict Mode
intentionally runs a development setup/cleanup cycle; the adapter handles it.

## PDF pages do not render

- Install patched `pdfjs-dist >=6.2.108 <7`.
- Set `workerSrc`; its URL must return worker JavaScript, not HTML.
- Serve PDFs from the same origin or with valid CORS headers.
- Pass PDF.js parameters for protected documents.
- Reduce `scale` or `maxPixelRatio` under mobile memory pressure.
- Teardown with `engine.destroy()` before `publication.destroy()`.

## JSON content looks unstyled

The adapter provides conservative defaults. Add `pageClassName` and scope
typography beneath it. Text is intentionally not interpreted as HTML; model
rich content with blocks or custom page DOM.

## Autoplay or sound does not start

Browsers may require user activation before Web Audio starts. Interact with the
reader, then enable sound. Autoplay pauses work while the document is hidden and
stops on the final page.

## Fullscreen does not open

Iframe permissions, policy, or lack of a user gesture can block fullscreen. The
engine falls back to expanded view. Allow fullscreen on embedding iframes when
native fullscreen is required.

## Shadows, clipping, or the crease are misplaced

- Remove transforms from ancestors while diagnosing.
- Do not override internal fold-layer transforms, clipping, or overflow.
- Reproduce at 1x and record root size, page index, drag endpoints, and browser.

## Cache memory is high

The cache cannot be smaller than its protected preload window. Lower
`preloadRadius` before `maxCachedPages`. PDF raster memory also depends on scale,
device ratio, and dimensions; `maxPixelRatio` caps density.

## Firefox automation does not start on managed Windows

Some managed Windows hosts cannot initialize Playwright Firefox's software
graphics compositor. Run the optional Firefox project on compatible Windows,
macOS, or Linux while retaining Chromium/WebKit CI coverage.

## Diagnostics

```ts
console.table(engine.snapshot);
const unsubscribe = engine.onChange((snapshot) => console.log(snapshot));
unsubscribe();
engine.destroy();
```

Failed browser runs write traces and screenshots to `test-results/` and
`playwright-report/`.
