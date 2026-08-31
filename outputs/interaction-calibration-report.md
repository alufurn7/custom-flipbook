# Paperfold Interaction Calibration

Calibration date: 25 August 2026

## Outcome

The local engine is calibrated against the recorded reference observations for
timing, release behavior, edge zones, fold constraints, easing, and shadows.
The values are centralized in `src/calibration.ts` so future device testing can
adjust them without scattering constants through the renderer.

## Calibrated values

| Parameter | Value | Basis |
| --- | ---: | --- |
| Automatic turn duration | 285 ms | Directly measured reference control turn |
| Commit progress | 0.50 page | Observed slow inward commit and reproduction target |
| Release velocity window | 90 ms | Recorded 60–100 ms reconstruction range |
| Flick velocity threshold | 0.18 px/ms | Reproduces the observed very-short fast commit |
| Return-to-origin radius | max(18 px, 5.5% page width) | Reliable pull-back cancellation |
| Edge interaction zone | 28–48 px, responsive | Recorded 24–48 px reference range |
| Pointer travel envelope | 1.05× page diagonal | Diagonal-mask geometry and physical sheet bound |
| Vertical overshoot | 25% page height | Allows corner arcs while preventing extreme folds |
| Commit easing | cubic ease-out | Reference-like smooth deceleration |
| Cancellation easing | quintic ease-out | Faster reference-like snap-back |

The crease-shadow width and opacity response remain sinusoidal, peaking near
the middle of the turn. Its orientation and paint boundary are regression
tested to prevent the previously observed viewport seam.

## Verification

- 22 unit, calibration, and cache tests pass.
- 14 interaction tests pass across Chromium and WebKit.
- 8 cross-browser visual snapshots pass.
- 2 mobile performance profiles pass.
- The strict TypeScript production build passes.

## Confidence boundary

The 285 ms timing is verified from direct observation. The exact proprietary
easing coefficients and internal clamp equations were not readable, so the
cubic/quintic curves, velocity threshold, and overshoot bounds are informed
reproduction choices. Physical Android/iOS testing and additional reference
recordings may justify small future adjustments.
