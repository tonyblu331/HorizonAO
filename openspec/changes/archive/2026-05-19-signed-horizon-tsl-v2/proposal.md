# Proposal: signed-horizon-tsl-v2

## Summary

Port HorizonAO raw-kernel terminology and slice resolve toward explicit signed-horizon accessibility while preserving the public API, scalar AO output, and Three.js TSL/WebGPU-first pass shape.

## Motivation

The merged CPU reference defines signed-horizon accessibility as an integral of `max(0, cos(theta - normalAngle))` over a visible horizon arc, normalized by `2`. The TSL kernel still uses ambiguous cosine-delta naming and a GTAO-shaped resolve that is hard to audit against that reference.

## Capabilities

### Modified Capabilities

- `horizonao-raw-kernel` — raw AO slice resolve and naming become signed-horizon aligned without changing public API.
- `horizonao-proof-harness` — tests prove scalar debug stability and CPU reference behavior remains intact.

## Scope

In scope:

- raw kernel helper rename/refactor
- signed-horizon slice resolve terminology
- CPU parity tests for the slice formula
- scalar debug E2E guard remains active
- roadmap/spec alignment

Out of scope:

- temporal AO
- bitmask AO
- bent normals
- XR/stereo AO
- blue-noise/sample-pattern ablation
- custom renderer fallback
- production build

## Success Criteria

- Core tests pass with signed-horizon CPU/reference cases.
- Targeted Playwright scalar AO debug test passes with no feedback-loop or `INVALID_OPERATION` errors.
- Public API remains stable.
- `@ts-nocheck` remains isolated to the TSL node file.
