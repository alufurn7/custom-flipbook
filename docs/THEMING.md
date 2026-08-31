# Theming Paperfold

Import `paperfold-flipbook/styles.css` once, then set supported custom
properties on the mount element or an ancestor. Scope a theme to the mount so
multiple readers can use different palettes.

```css
#catalogue {
  --paperfold-viewport-background: linear-gradient(145deg, #181a20, #343946);
  --paperfold-page-background: #fffdf7;
  --paperfold-page-color: #20252b;
  --paperfold-page-border: rgba(0, 0, 0, .16);
  --paperfold-accent: #d45d48;
  --paperfold-focus: #167d96;
  --paperfold-controls-background: rgba(24, 27, 33, .88);
  --paperfold-controls-color: #fff;
  --paperfold-toc-background: rgba(13, 47, 57, .96);
  --paperfold-toc-color: #fff;
}
```

## Supported variables

| Variable | Controls |
| --- | --- |
| `--paperfold-viewport-background` | Reader surround |
| `--paperfold-page-background` | Default page and adapter background |
| `--paperfold-page-color` | Default page and adapter text |
| `--paperfold-page-border` | Sheet edge |
| `--paperfold-accent` | Progress indicator |
| `--paperfold-focus` | Keyboard focus outline |
| `--paperfold-controls-background` | Floating control bar |
| `--paperfold-controls-color` | Control labels and symbols |
| `--paperfold-toc-background` | Contents drawer |
| `--paperfold-toc-color` | Contents drawer text |

`--page-width` and `--page-height` are internal live geometry values. Do not
override them; use `pageWidth` and `pageHeight` options.

## Page content

Paperfold owns sheet layers, controls, contents, and shadows. DOM returned by
`PageDefinition.render()` is application-owned and can use scoped classes.
Avoid fixed viewport dimensions inside pages; size content to the page box.

The JSON adapter exposes `.paperfold-json-page`; the PDF adapter exposes
`.paperfold-pdf-page`. Both accept a custom `pageClassName`.

## Stable and internal selectors

Supported structural integration selectors are `.paperfold-app`,
`.flipbook-viewport`, `.flipbook-book`, `.flipbook-page`,
`.flipbook-controls`, `.flipbook-toc`, `.paperfold-json-page`, and
`.paperfold-pdf-page`.

Fold masks, reflected surfaces, shadows, and layer z-indexes are internals.
Overriding their transforms, clipping, overflow, containment, or positioning
can break geometry.

Set `curvature: "multi-band"` in engine options to enable the enhanced paper
curl. Its bands follow the live crease and are intentionally treated as a
rendering effect rather than a theme selector contract.

## Responsive layout

The `spreadBreakpoint` option controls single versus spread mode. The package
stylesheet's 760 px media query compacts controls. Add a matching application
media query if a custom breakpoint should change control density too.

The mount needs a definite height. A full-screen reader commonly uses:

```css
html, body, #app { width: 100%; height: 100%; margin: 0; }
```

The package stylesheet deliberately does not apply that global reset.
