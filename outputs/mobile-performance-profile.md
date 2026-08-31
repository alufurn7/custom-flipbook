# Paperfold Mobile Performance Profile

Profile date: 25 August 2026

## Scope

The automated profile runs nine consecutive programmatic page turns at a
390×844 viewport. It measures animation duration, synchronous setup time,
requestAnimationFrame intervals, long frames, mounted page elements, and page
cache size.

- Chromium runs with 4× CPU throttling as a low-power Android approximation.
- WebKit runs without synthetic CPU throttling as a Safari-engine proxy.
- These results are repeatable desktop simulations, not physical-device results.

## Results

| Metric | Chromium, 4× CPU | WebKit |
| --- | ---: | ---: |
| Cold-turn duration | 325.8 ms | 293 ms |
| Cold synchronous setup | 3.4 ms | 1 ms |
| Cold worst frame | 33.4 ms | 143 ms |
| Steady average duration | 298.4 ms | 309.6 ms |
| Steady worst p95 frame | 16.8 ms | 37 ms |
| Steady worst frame | 16.8 ms | 37 ms |
| Steady long frames over 34 ms | 0 | 1 |
| Maximum mounted page elements | 3 | 3 |
| Cache size after nine turns | 10 | 10 |
| Idle mounted page elements | 1 | 1 |

## Assessment

The steady-state animation meets the automated frame budget in both engines.
Chromium remains smooth under 4× CPU throttling. WebKit has a single 143 ms
cold compositor frame on its first turn, but its synchronous engine setup is
only 1 ms. One subsequent 37 ms frame occurred during the following eight
turns, while all other steady frames stayed within the target budget. This
points to first-use browser raster/compositor initialization rather than a
recurring fold-geometry or DOM cost.

The DOM remains bounded and the page cache stays within the configured window.

## Remaining validation

Run the same interaction set on physical low-power Android hardware and iOS
Safari. Capture device refresh rate, frame pacing, thermal state, and memory
pressure before signing off the hardware-performance roadmap item.
