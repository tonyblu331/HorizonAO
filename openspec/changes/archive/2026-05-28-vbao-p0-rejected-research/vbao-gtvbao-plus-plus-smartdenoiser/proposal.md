# Proposal: GTVBAO++ SmartFilter

## Summary

Implement a clean internal VBAO resolve candidate named `gtvbao++`: a single-frame SmartFilter pass that runs after raw VBAO and before final AO/beauty composition. It uses SSILVB-derived bitmask metadata instead of layering another generic blur over legacy filtered output.

## Goals

- Add demo-only `gtvbao++` filter selection for evidence capture.
- Use raw VBAO, depth, normals, edge confidence, mask coverage, production mask-popcount, and paper-popcount metadata.
- Keep it temporal-free: no history, velocity, frame index, or accumulation.
- Keep public `@horizonao/core` API unchanged.

## Non-Goals

- No production promotion.
- No public `VBAONodeOptions` expansion.
- No production build.
- No blind replacement of the current cosine shader formula.
