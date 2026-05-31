# Proposal: HorizonAO Math Audit, Kernel Correction, And Spatial Denoise

## Summary

Prove and tighten the current HorizonAO raw kernel before tuning appearance. This change keeps HorizonAO TSL-first, scalar AO-first, and AA-agnostic. It adds deterministic math policy tests, per-pixel sample rotation, a spatial depth/normal-aware denoise pass, rendered `denoised-ao` debug output, and SDD audit artifacts.

## Capabilities

### New Capabilities

- `horizonao-math-denoise` - math policy checks, raw kernel rotation, and spatial denoise rendering.

### Modified Capabilities

- None.

## Scope

In scope:

- Compare implementation logic against Three `GTAONode`, Activision GTAO, XeGTAO, CACAO, and Wu 2025 as future stereo research.
- Preserve `horizonAO(depthNode, normalNode, camera, options)`.
- Add isolated scalar helpers for clamp, sample splitting, falloff, center bias, and no-occluder accessibility expectations.
- Add magic-square sample rotation and radius jitter to the raw kernel.
- Add a separate HorizonAO denoise node/pass with depth and normal awareness.
- Mark `denoised-ao` as rendered and cover it in the demo harness.

Out of scope:

- Temporal AO, TRAA dependency, bent normals, bitmask AO, layered depth, tile routing, XR/stereo implementation, renderer fallback, and N8AO integration.

## Rollback Plan

If the denoise pass breaks renderer execution, revert the denoise node wiring and keep the math helper tests plus raw kernel rotation. If raw rotation causes shader compilation failure, revert the noise texture changes and leave the audit artifact identifying fixed-orientation banding as unresolved.
