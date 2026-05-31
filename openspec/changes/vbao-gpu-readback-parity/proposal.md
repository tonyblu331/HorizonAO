# Proposal: VBAO GPU Readback Parity Gate

## Summary

Promote the old `/vbao-parity` route from a plausibility smoke test to a fixed
fixture readback comparison. The route now exposes GPU AO pixels plus a scalar
reference comparison for named flat-plane fixture pixels.

## Motivation

The production-readiness audit identified quantitative GPU/scalar parity as the
missing correctness gate. "Pixels are finite" is not enough. If the TSL shader
and scalar reference disagree on known fixtures, later screenshot tuning is just
guesswork.

## Goals

- Add named fixed pixels for the WebGPU flat-plane parity scene.
- Compute scalar expected values with the current VBAO reference math.
- Compare GPU readback values against quantized scalar values.
- Keep parity helpers internal and out of public `@horizonao/core` exports.
- Make the Playwright E2E fail loudly when `E2E_WEBGPU_PARITY=1` and readback
  drifts from scalar reference.

## Non-Goals

- No production build.
- No visual quality promotion.
- No public API change.
- No attempt to hide parity failure behind broad tolerances.
