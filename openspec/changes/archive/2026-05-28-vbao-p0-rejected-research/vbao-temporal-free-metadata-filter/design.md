# Design: VBAO Temporal-Free Metadata-Aware Filter

## Candidate

The candidate is a spatial-only pass in the Museum benchmark route. It consumes:

- raw VBAO accessibility;
- scene depth;
- view-space normal;
- edge-depth metadata;
- edge-normal metadata;
- confidence metadata.

Each tap is rejected before weighting when it crosses a depth/normal edge or its
metadata confidence is too low. Accepted taps use the same bilateral shape as
the previous custom filter, multiplied by metadata-derived confidence.

## Boundaries

- No temporal accumulation, frame index, history buffer, velocity buffer, or TAA
  dependency.
- No public API expansion.
- No claim of bitmask-aware filtering yet; GPU-visible mask coverage/popcount is
  a later gate.
- Depth prefilter remains a diagnostic variant, not part of filter promotion.

## Evidence

Promotion requires WebGPU screenshots/timings at 1920×1080 and 1280×720 with
named failure labels. The candidate is rejected if it reduces `noise` by adding
`mud`, `edge-bleed`, `halo`, `thin-gap`, `false-curvature`, or worse
`scale-mismatch`.
