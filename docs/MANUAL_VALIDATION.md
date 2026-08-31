# Manual validation matrix

These checks cover platforms that desktop automation cannot truthfully certify.
Record browser, operating-system, assistive-technology version, device model,
refresh rate, and result for every run.

## Current host audit - 27 August 2026

- NVDA is not installed. Windows Narrator is present, but it cannot substitute
  for the roadmap's explicit NVDA, VoiceOver, and TalkBack matrix.
- No macOS, iOS, Android, or physical-device browser target is connected.
- The available controlled browser inventory contains only the desktop in-app
  browser.
- The Playwright Firefox suite was retried and stalled before the first test for
  90 seconds, reproducing the managed-host compositor startup limitation.

These are external execution prerequisites, not passing results.

## Screen readers

Use the packaged demo or an application integration with representative page
content. Do not test only the control bar.

### NVDA with Firefox and Chrome on Windows

1. Start NVDA and enter browse mode at the reader.
2. Confirm the reader is announced as `Interactive flipbook`.
3. Navigate buttons and page input; verify every accessible name.
4. Turn forward/backward with buttons and arrows.
5. Confirm one polite visible-page announcement per settled turn.
6. Open, search, select, and close contents without losing a logical focus path.
7. Zoom to 2x and reset; confirm controls remain reachable.
8. Cancel a drag with Escape and confirm no stale announcement.

### VoiceOver with Safari on macOS and iOS

Repeat the control, contents, announcement, zoom, and cancellation checks using
VoiceOver navigation and touch exploration. On iOS, verify page-turn edge
gestures do not prevent VoiceOver users from reaching the native controls.

### TalkBack with Chrome on Android

Repeat the same checks using swipe navigation and Explore by Touch. Confirm the
edge drag surface does not trap focus and that double-tap activation operates
every control.

For each platform, record exact announcement text, focus order defects,
duplicate announcements, unlabeled controls, and whether raster PDF content
needs a separate accessible reading route.

## Physical mobile performance

Test at least one low-power Android device and one currently supported iPhone.

1. Close background applications and record battery/thermal state.
2. Load cold, turn once, then make eight steady turns.
3. Exercise corner and middle-edge drags, cancellation, zoom/pan, and PDF pages.
4. Record refresh rate, long frames, visible checkerboarding, memory warnings,
   cache size, and device temperature before/after.
5. Repeat after ten minutes of continuous interaction to expose throttling.
6. Pass when interaction remains responsive, no page is blank, cache remains
   bounded, and steady turns do not develop recurring visible stalls.

Safari Web Inspector and Chrome remote debugging may be used for timelines, but
also record perceived responsiveness because compositor stalls may not appear
as JavaScript long tasks.

## Firefox visual suite

On a host where Playwright Firefox can create a graphics compositor:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "work/playwright-browsers"
npm run test:firefox
```

Retain the HTML report and any image diffs. The current managed Windows host is
known to fail during Firefox compositor initialization before application code
runs; that host failure is not an engine pass or fail.
