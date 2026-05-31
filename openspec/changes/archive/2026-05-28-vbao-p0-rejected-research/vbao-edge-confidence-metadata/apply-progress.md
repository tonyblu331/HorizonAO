# Apply Progress: VBAO Edge Confidence Metadata

Status: internal reference implementation and GPU/debug view harness complete;
metadata-aware GPU filter candidate still future.

## Completed

- Added `packages/horizon-ao/src/vbaoEdgeConfidence.ts` with deterministic
  `edgeDepth`, `edgeNormal`, and confidence metadata.
- Added tests proving:
  - tangent-plane depth and normal discontinuity metrics are reported;
  - same-surface, well-sampled neighborhoods stay high-confidence;
  - depth/normal discontinuities drop confidence;
  - metadata suppresses geometrically suspicious denoise neighbors.
- Updated `packages/horizon-ao/src/vbaoSpatialDenoise.ts` so internal metadata
  can drive `edgeDepth`, `edgeNormal`, and confidence weighting.
- Added an internal Museum route metadata debug selector for `edge-depth`,
  `edge-normal`, and `confidence`.
- Added `AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1` support to the benchmark
  collector and captured WebGPU screenshots plus contact sheet evidence.

## Decision

This is not a visual promotion. It is the missing reference contract that future
filters must satisfy before any screenshot/timing gate can claim improvement.
Public `VBAONodeOptions` and `@horizonao/core` exports remain unchanged.

The GPU debug harness is accepted as internal tooling only. `edge-normal` and
`confidence` are useful enough to guide the next filter candidate. `edge-depth`
is diagnostic, not production-ready metadata: the Museum contact sheet shows
broad bright fields that could become `false-curvature` if used blindly.

## Remaining

- Build a metadata-aware GPU denoise/filter candidate that consumes the visible
  edge/confidence signals.
- Compare raw VBAO, high-sample raw, metadata-filtered VBAO, GTAO, and N8AO with
  screenshots and p95 timings before promotion.
