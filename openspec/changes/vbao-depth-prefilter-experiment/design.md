# Design: VBAO Depth Prefilter Experiment

## Current Hypothesis

Large projected sample footprints should not always read one full-resolution
depth texel. At silhouettes and thin foreground objects, a single near sample can
act like an oversized blocker. A conservative coarse-depth representative should
prefer the farthest stable surface support, not the nearest outlier.

## Reference Representative Rule

For a coarse 2x2/4x4 block:

1. Drop invalid, non-finite, and non-positive view depths.
2. Find the farthest positive view depth in the block.
3. Keep samples within `farthestDepthTolerance` of that farthest depth.
4. Return the average of the kept samples.
5. If no samples are valid, return the caller-provided fallback depth.

This mirrors the pressure model from XeGTAO without copying its shader path:
use a farthest-surface bias to avoid letting one thin foreground depth dominate
large-radius sampling.

## Experiment Path

| Choice | Decision | Why |
| --- | --- | --- |
| First implementation | Reference-only helper | TDD before shader plumbing. |
| Production API | Forbidden | Evidence gate has not passed. |
| Initial shader route | TSL render target chain preferred | It matches the existing `RenderPipeline`/TSL style and avoids introducing WebGPU compute first. |
| Compute route | Deferred | Use only if TSL render-target MIPs cannot express the representative-depth pass cleanly. |

## Benchmark-Only Label Schema

The capture harness must keep baseline rows and prefilter rows separated before
any shader work is promoted:

- `AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX`: opt-in env flag for the internal
  matrix; it must not affect normal demo behavior.
- `vbaoDepthPrefilterPreset`: per-row label, not a public `VBAONodeOptions`
  field.
- `baseline`: existing full-resolution depth reads, used as the comparison
  control.
- `prefilter`: experimental coarse representative-depth candidate, allowed only
  inside evidence capture.

These labels are intentionally boring. The point is traceability: every
screenshot/timing row must say whether it came from the current path or the
candidate path, otherwise we cannot honestly judge scale-mismatch, mud, or p95.

## Acceptance

- Public package exports stay unchanged.
- Reference tests prove representative depth ignores thin foreground outliers.
- Future screenshot rows must compare baseline vs prefilter for the existing
  radius-stress captures.
- Any promotion needs lower `scale-mismatch` without worse p95 or edge failures.
