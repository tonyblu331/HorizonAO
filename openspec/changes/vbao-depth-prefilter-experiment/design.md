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

Phase 3.1 wired the labels through the internal harness without emitting fake
`prefilter` rows. Phase 3.2 adds the actual candidate path: the demo owns a
TSL `rtt(...)` depth prefilter node and a second internal `VBAONode` wired to
that prefiltered depth texture. Baseline rows keep the original `VBAONode`, so
baseline timings do not pay the prefilter pass cost.

The candidate prefilter is intentionally narrow:

- 2x2 taps around the current UV;
- convert perspective depth to positive view depth;
- choose the farthest-supported samples within `0.1` view-depth tolerance;
- convert the representative view depth back to perspective depth;
- preserve sky/background by returning the center depth when the center is not
  valid geometry.

## Acceptance

- Public package exports stay unchanged.
- Reference tests prove representative depth ignores thin foreground outliers.
- Future screenshot rows must compare baseline vs prefilter for the existing
  radius-stress captures.
- Any promotion needs lower `scale-mismatch` without worse p95 or edge failures.
