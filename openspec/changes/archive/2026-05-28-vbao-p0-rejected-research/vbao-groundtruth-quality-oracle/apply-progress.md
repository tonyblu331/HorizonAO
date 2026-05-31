# Apply Progress: VBAO Ground-Truth Quality Oracle

Status: internal reference and candidate gate implemented; benchmark matrix
integration remains future.

## Completed

- Added deterministic Fibonacci-hemisphere accessibility estimation.
- Added normalized accessibility quality scoring.
- Added failure classification, including first-class `false-curvature`.
- Added raw-vs-candidate oracle evaluation so denoise/filter candidates can be
  rejected when they regress objective quality or introduce `mud`/`edge-bleed`.
- Added `packages/horizon-ao/src/vbaoOracleFixtures.ts` with the first
  deterministic fixture matrix: flat-open, full-blocked, two-wall corner, thin
  occluder, stair-step negative control, and museum-scale.
- Wrote fixture evidence to
  `artifacts/benchmarks/ao-vbao-oracle-fixture-matrix-latest.json`.

## Decision

The oracle is an internal evidence tool, not public API. It should be used to
guard future screenshot/timing candidates so a smoother or faster image cannot
be promoted when it is less correct.

## Remaining

- Add more geometric detail to each fixture if future candidates overfit this
  first matrix.
- Connect candidate screenshots/timings to the same fixture IDs once GPU debug
  views exist.
