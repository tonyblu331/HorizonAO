# Change: VBAO Adaptive Thickness TSL Port

## Summary

Port the scalar adaptive-thickness reference into `VBAONode`'s TSL kernel without changing the public API. The public `thickness` uniform remains the maximum blocker thickness cap; the shader estimates a per-sample blocker thickness from same-surface continuity along the marched slice before constructing the visibility bitmask.

## Problem

The scalar reference now proves that a constant blocker thickness over-darkens isolated thin occluders and can close thin gaps. The production shader still uses `this.thickness` for every sample, so the implementation has diverged from the reference math.

## Goals

- Use a per-sample adaptive thickness in the TSL mask contribution.
- Keep `VBAONodeOptions` unchanged.
- Preserve the existing 32-sector bitmask and cosine-weighted reduction.
- Keep background depth non-occluding.
- Keep the constant-thickness formula available in docs/tests as the comparison baseline, not as a public runtime knob.

## Non-Goals

- No sampling-pattern changes.
- No denoise pass.
- No bent normals or directional visibility outputs.
- No temporal accumulation.
- No new public quality knob.

## Evidence Gate

This change only claims mathematical parity with the scalar reference for the adaptive-thickness estimator. Quality or performance wins against GTAO/N8AO remain blocked until benchmark rows and screenshots are recorded in `EVIDENCE.md`.
