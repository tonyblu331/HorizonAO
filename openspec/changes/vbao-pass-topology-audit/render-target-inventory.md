# VBAO Render-Target Inventory

This inventory is a static Phase 1 baseline from the current runtime source.
It records allocation ownership and intended lifetime before any topology
experiment deletes, fuses, or abstracts passes.

## Targets

| Owner | Texture name | Format/type | Filters | Size | Lifetime | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `VBAONode` | `VBAO.Raw` | `RedFormat` / `HalfFloatType` | `NearestFilter` min/mag | `drawingBuffer * resolutionScale` | Owned for node lifetime | Raw stochastic visibility-bitmask AO. `getRawTextureNode()` exposes this for debug/readback. |
| `VBAOHalfResCleanupNode` | `VBAO.HalfResCleanup` | `RedFormat` / `HalfFloatType` | `NearestFilter` min/mag | `drawingBuffer * resolutionScale` | Lazily allocated when low-res cleanup is needed; disposed when graph changes | Optional 3x3 edge-aware low-resolution cleanup before JBU resolve. |
| `VBAOResolveNode` | `VBAO.Resolve` | `RedFormat` / `HalfFloatType` | `NearestFilter` min/mag | Full drawing buffer | Lazily allocated when `resolutionScale < 0.99`; disposed when graph changes | Temporal-free JBU4 resolve/upsample from low-resolution AO to product resolution. |
| `VBAOFullResPolishNode` | `VBAO.FullResPolish` | `RedFormat` / `HalfFloatType` | `NearestFilter` min/mag | Full drawing buffer | Lazily allocated when `softness` funds polish; disposed when graph changes | Optional 8-tap rotated full-resolution scalar AO polish. |

All listed targets disable depth buffers, mipmap generation, and color space
conversion (`NoColorSpace`). Filtering stays nearest because interpolation and
edge rejection are shader-owned.

## Graph Shapes

| Condition | Product path |
| --- | --- |
| `resolutionScale >= 0.99`, `softness <= 0` | raw only |
| `resolutionScale >= 0.99`, `softness > 0` | raw -> full-res polish |
| `resolutionScale < 0.99`, `softness <= 0` | raw -> resolve |
| `resolutionScale < 0.99`, `0 < softness <= 0.5` | raw -> half-res cleanup -> resolve |
| `resolutionScale < 0.99`, `softness > 0.5` | raw -> half-res cleanup -> resolve -> full-res polish |

## Implications

- The current worst-case product graph owns four AO targets.
- Half-resolution cleanup and resolve are separate by ADR, not accidental
  duplication.
- A pass-base refactor can reduce boilerplate but should not change target names,
  formats, sizing, pass labels, or shader-owned interpolation.
- A topology experiment must compare target count, timing, and visual labels
  against this inventory.
