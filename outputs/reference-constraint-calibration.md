# Reference constraint calibration

Calibration date: 27 August 2026

## Verified reference measurements

The original hosted flipbook was recorded at a 1280 x 720 viewport.

- Logical page: 464 x 655 px.
- Page diagonal and inactive mask: 803 px (`ceil(hypot(464, 655))`).
- Interior spread: x=176 through x=1104, width 928 px, spine x=640.
- Cover page: x=408 through x=872, width 464 px.
- A held bottom-right fold used equal/opposite face rotations of about 36.3
  degrees. The active mask matrix was approximately
  `matrix(0.8061, 0.5918, -0.5918, 0.8061, 502.6, 198.7)`.
- Top- and bottom-corner recordings retained the sheet at the spine and used a
  diagonal mask; middle-edge travel required the full spread width.

## Applied calibration

- Corner pointer travel is capped at exactly one page diagonal, changed from
  the previous 1.05 diagonal allowance.
- Middle-edge travel keeps its separate full-book-width allowance so a complete
  horizontal drag reaches the exact spine.
- Vertical pointer overshoot stays bounded at 25% of page height. This prevents
  runaway masks outside the viewport while retaining forgiving corner input.
- Top, middle, and bottom grabs continue to share reflection mathematics; only
  their origin and distance constraints differ.

## Verification

Unit tests protect diagonal and full-spread limits. Chromium and WebKit browser
tests cover top/bottom corner folds, middle-edge centering, reverse turns,
cancellation, and live layer composition.
