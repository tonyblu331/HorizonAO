# Apply Progress: VBAO Sampling v2

Status: implemented as an internal/reference slice; not promoted to public API.

## Completed

- Added RED/GREEN reference tests for per-step/per-slice decorrelation.
- Updated CPU/reference sampling so same-pixel radial gaps are no longer
  constant.
- Updated `VBAONode` TSL source to use `stepJitter` instead of the old global
  per-pixel `radialScale` step compression.
- Ran targeted and full core Vitest, package TypeScript check, WebGPU smoke,
  and screenshot-enabled sample/schedule matrices.

## Evidence

- Sample matrix:
  `artifacts/benchmarks/ao-vbao-sampling-v2-sample-matrix-latest.json`
- Schedule matrix:
  `artifacts/benchmarks/ao-vbao-sampling-v2-schedule-matrix-latest.json`
- Contact sheets:
  - `artifacts/analysis/vbao_sampling_v2_sample_matrix_contact_sheet.png`
  - `artifacts/analysis/vbao_sampling_v2_schedule_matrix_1920_contact_sheet.png`
  - `artifacts/analysis/vbao_sampling_v2_schedule_matrix_1280_contact_sheet.png`

## Decision

Sampling v2 is a real implementation improvement over the previous one-global
`radialScale` scheme, but it is not sufficient for a quality promotion. The
screenshots still show structured `noise`, broad `mud`, `edge-bleed`, and a
severe Hilbert/checker artifact that can read as `false-curvature`.

Next dependency: build the edge/confidence metadata and ground-truth oracle
gates before accepting another filter or sampling candidate.
