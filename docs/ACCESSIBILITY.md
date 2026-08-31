# Accessibility

Paperfold provides keyboard-operated native controls and a non-gesture route to
every page. Publication content remains the integrator's responsibility.

## Included behavior

- Native buttons and a labeled page-number input.
- A focusable reader region labeled `Interactive flipbook`.
- Searchable contents with titles and sections.
- Page shells labeled with page number and title.
- Polite live announcements after visible-page changes.
- Visible `:focus-visible` outlines.
- Reduced-motion release animations.
- Pointer cancellation and lost-capture recovery.
- Controls that do not require dragging, sound, or fullscreen.

## Keyboard map

| Key | Action |
| --- | --- |
| Right Arrow | Next page or spread |
| Left Arrow | Previous page or spread |
| Home | First page |
| End | Last page |
| `+` or `=` | Zoom in |
| `-` | Zoom out |
| Escape | Cancel drag, close contents, or reset zoom |
| Tab / Shift+Tab | Move through native controls |
| Enter | Activate a control or commit page input |

Shortcuts apply while focus is in the reader. Host shortcuts should not
intercept these keys from the reader.

## Publication requirements

- Give every page a concise, unique `title` and meaningful `section`.
- Use semantic headings, paragraphs, lists, and landmarks.
- Supply useful image `alt` text; use empty alt only for decoration.
- Preserve contrast in content and custom theme variables.
- Do not convey essential meaning only through position, color, animation,
  sound, or the fold.
- Avoid duplicate IDs inside page DOM because live clones briefly coexist.
- Ensure cloned focusable content remains usable.
- Provide alternatives for embedded audio and video.

The JSON adapter creates semantic elements and requires image alt text. The PDF
adapter creates raster images with generated page-number alt text. A raster PDF
is not equivalent to accessible document structure; provide extracted semantic
content or an accessible PDF viewer alongside it when required.

## Motion, zoom, and sound

`prefers-reduced-motion: reduce` shortens animations. Zoom ranges from 1x to 4x
and enables panning above 1x. Turn sound is optional and muteable. Do not disable
browser zoom or operating-system magnification in the host page.

## Verification status

Automated tests cover labels, keyboard paths, focus styling, reduced-motion
logic, cancellation, and responsive controls. Manual testing with NVDA,
VoiceOver, and TalkBack remains a roadmap item and must be completed before
claiming product-specific conformance. Physical Android and iOS testing also
remains pending.

Use the [manual validation matrix](./MANUAL_VALIDATION.md) to record those runs.
