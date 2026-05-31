# Tasks: VBAO Sampling v2

- [x] Add RED test proving same-pixel step gaps are not constant.
- [x] Update reference sampling to use per-slice/per-step jitter.
- [x] Update `VBAONode` TSL source to use `stepJitter`.
- [x] Update source-contract tests.
- [x] Run targeted Vitest for sampling and source contracts.
- [x] Capture screenshot/timing matrix before promoting a schedule.
  - Evidence gate result: screenshots/timings captured, but no schedule or public
    quality-tier change is promoted. Sampling v2 remains internal because Museum
    rows still show `noise`, `mud`, `edge-bleed`, and Hilbert-style
    `false-curvature`/grid artifacts.
