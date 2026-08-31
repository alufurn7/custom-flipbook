# Remaining external validation status

Status date: 27 August 2026

## Completed in this pass

- Additional top-, bottom-, middle-edge, and spine calibration against new live
  recordings of the original hosted flipbook.
- Corner travel corrected to the verified 803 px page diagonal for a 464 x 655
  reference page.
- Automated Chromium and WebKit checks for keyboard navigation, accessible
  labels, focus indication, live announcements, and reduced motion.
- A repeatable manual matrix for assistive technology, physical mobile devices,
  and Firefox visuals.

## External prerequisites still unavailable

### Screen readers

NVDA is not installed on this Windows host. VoiceOver requires Apple hardware,
and TalkBack requires Android. Windows Narrator is installed but does not satisfy
the explicit three-screen-reader acceptance matrix.

### Firefox

`npm run test:firefox` was retried. Firefox started no test cases and produced no
progress for 90 seconds, matching the known graphics-compositor initialization
hang on this managed Windows environment. The run was stopped rather than
reported as a pass.

### Physical performance

No Android or iOS device target is connected. The only available controlled
browser is the desktop in-app browser. Existing 4x CPU-throttled Chromium and
WebKit simulations remain passing but are not represented as physical-device
results.

## Completion rule

The remaining boxes may be checked only after the runs in
`docs/MANUAL_VALIDATION.md` are performed on the named platforms and their
results are retained. No software change inside this repository can create
those external environments.
