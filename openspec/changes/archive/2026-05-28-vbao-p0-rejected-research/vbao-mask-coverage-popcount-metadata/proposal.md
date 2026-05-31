# Proposal: VBAO Mask Coverage / Popcount Metadata Gate

## Summary

The `metadata-aware` filter was wired and captured, but visual review rejected
promotion: it still preserves raw VBAO hatch noise and broad
`false-curvature` / `scale-mismatch` bands. The next gate is therefore not more
blur tuning. It is an internal GPU-visible mask metadata channel.

## Problem

Current GPU-visible metadata is geometric only:

- edge-depth;
- edge-normal;
- confidence.

That is useful for silhouette rejection, but it does not tell the filter whether
the VBAO bitmask itself is sparse, saturated, unstable, or directionally
ambiguous. Without mask coverage/popcount, the filter cannot distinguish a true
contact shadow from broad false curvature caused by overbroad sector masks.

## Goals

- Add an internal-only mask coverage / popcount metadata design.
- Preserve public API boundaries:
  - no `VBAONodeOptions` expansion;
  - no new `@horizonao/core` package export;
  - no promotion claim.
- Define acceptance evidence before shader promotion.

## Non-Goals

- No production filter promotion.
- No temporal accumulation.
- No public debug API.
- No production build.

