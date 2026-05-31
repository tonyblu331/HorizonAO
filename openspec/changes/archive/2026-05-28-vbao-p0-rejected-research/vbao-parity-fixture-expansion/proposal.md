# Proposal: VBAO Parity Fixture Expansion

## Summary

Expand the passing flat-plane GPU readback parity gate into a small fixture
matrix that covers the two failure modes we actually care about next:
two-wall corners and thin occluders.

## Motivation

Flat-plane parity proves the route can compare GPU bytes against a scalar
reference, but it does not prove the visibility-bitmask shader handles contact
geometry, wall corners, or thin blockers. Those are exactly where current VBAO
evidence still shows `noise`, `edge-bleed`, `thin-gap`, and `false-curvature`.

## Goals

- Add semantic fixture definitions for:
  - `flat-plane`;
  - `two-wall-corner`;
  - `thin-occluder`.
- Use one fixture vocabulary across scalar reference, Three/WebGPU render scene,
  E2E assertions, and evidence rows.
- Keep fixture helpers internal; no public `@horizonao/core` exports.
- Preserve the passing flat-plane fixture while adding RED tests for the new
  fixture contracts before implementation.

## Non-Goals

- No production build.
- No public `VBAONodeOptions` changes.
- No quality promotion from fixture parity alone.
- No generic scene parser; fixtures stay deliberately tiny and analytic.
