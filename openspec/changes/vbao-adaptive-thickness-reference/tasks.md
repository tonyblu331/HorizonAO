# Tasks: VBAO Adaptive Thickness Reference

## Phase 1: Reference Continuity Helpers

- [x] 1.1 RED: Add Vitest cases for same-surface continuity and discontinuity in `vbaoReference.test.ts`.
- [x] 1.2 GREEN: Add reference-only continuity helpers in `vbaoReference.ts`.
- [x] 1.3 REFACTOR: Keep vector helpers private unless tests need public behavior through exported reference helpers.

## Phase 2: Adaptive Thickness Estimate

- [x] 2.1 RED: Add tests showing isolated thin occluders clamp near minimum thickness.
- [x] 2.2 RED: Add tests showing continuous thick walls estimate thicker blockers than isolated thin occluders.
- [x] 2.3 RED: Add tests showing a depth/normal gap behind an object does not merge into one blocker.
- [x] 2.4 GREEN: Implement deterministic adaptive thickness estimation with internal clamp defaults.
- [x] 2.5 REFACTOR: Keep existing `buildSampleMask` constant-thickness tests unchanged.

## Phase 3: Mask Integration In Reference Only

- [x] 3.1 RED: Add tests comparing adaptive-mask sector counts for thin, thick, and gap cases.
- [x] 3.2 GREEN: Add a reference-only helper that builds a mask using estimated adaptive thickness.
- [x] 3.3 REFACTOR: Ensure helper naming clearly signals reference-only status and does not imply public `VBAONode` API support.

## Phase 4: Verification

- [x] 4.1 Run targeted Vitest for `vbaoReference.test.ts`.
- [x] 4.2 Run package typecheck and tsgo typecheck.
- [x] 4.3 Update apply-progress with TDD cycle evidence.
