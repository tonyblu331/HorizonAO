# Apply Progress: VBAO Adaptive Thickness Reference

## Status

14/14 tasks complete. Phase 1 continuity helpers, Phase 2 deterministic
adaptive thickness estimation, and Phase 3 reference-only adaptive mask
integration are implemented in the scalar reference only. No TSL shader, public
API, quality-tier, denoise, or render target changes were made.

## Completed Tasks

- [x] 1.1 Added RED Vitest cases for same-surface continuity and discontinuity.
- [x] 1.2 Added `areSameSurfaceSamples` plus reference-only sample/options types.
- [x] 1.3 Kept existing vector helpers private; only the behavior-level reference
  helper is exported for tests and future adaptive thickness helpers.
- [x] 2.1 Added RED tests proving isolated thin occluders clamp to the minimum thickness.
- [x] 2.2 Added RED tests proving continuous same-surface runs estimate thicker blockers.
- [x] 2.3 Added RED tests proving depth and normal gaps do not merge into one blocker.
- [x] 2.4 Added deterministic `estimateAdaptiveThickness` with internal clamp options.
- [x] 2.5 Preserved existing constant-thickness `buildSampleMask` tests unchanged.
- [x] 3.1 Added RED tests comparing adaptive mask sector counts for isolated thin,
  continuous thick, and gap-behind-object cases against constant thickness masks.
- [x] 3.2 Added `buildAdaptiveThicknessReferenceMask`, which estimates thickness
  and feeds it into the existing `buildSampleMask` interval logic.
- [x] 3.3 Kept helper naming explicitly reference-only and avoided public
  `VBAONode` option, uniform, quality-tier, shader, denoise, or render-target changes.
- [x] 4.1 Ran targeted Vitest for `vbaoReference.test.ts`.
- [x] 4.2 Ran package TypeScript and tsgo typechecks.
- [x] 4.3 Updated this apply-progress file with TDD cycle evidence.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | 51/51 passing before edits | Added 4 tests referencing missing `areSameSurfaceSamples`; failed as expected | Passed after 1.2 | 4 cases: continuous, depth break, normal break, invalid sample | Clean |
| 1.2 | `packages/horizon-ao/src/vbaoReference.ts` | Unit | Covered by 1.1 safety net | Helper did not exist | `vbaoReference.test.ts` passed 55/55 | Same 4 cases force non-trivial branching | Minimal pure helper |
| 1.3 | `packages/horizon-ao/src/vbaoReference.ts` | Unit | 55/55 after helper | N/A structural refactor task | Tests still passed | Triangulation covered by 1.1 | Vector helpers remain private |
| 2.1 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | 55/55 passing before Phase 2 | Added test referencing missing `estimateAdaptiveThickness`; failed as expected | Passed after 2.4 | Thin isolated sample clamps exactly to `minThickness` | Clean |
| 2.2 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | Covered by Phase 2 safety net | Added continuous-wall test before implementation | Passed after 2.4 | Compares isolated vs three-sample same-surface run and exact scaled span | Clean |
| 2.3 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | Covered by Phase 2 safety net | Added depth-gap and normal-gap tests before implementation | Passed after 2.4 | Two discontinuity paths: depth break and normal break | Clean |
| 2.4 | `packages/horizon-ao/src/vbaoReference.ts` | Unit | Covered by Phase 2 safety net | Estimator did not exist | `vbaoReference.test.ts` passed 60/60 | Clamp-max case prevents trivial min-only implementation | Pure deterministic helper |
| 2.5 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | Existing constant-thickness tests stayed in file | No production changes to `buildSampleMask` | `vbaoReference.test.ts` passed 60/60 | Existing thin/thick constant mask tests still execute | No refactor needed |
| 3.1 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | 60/60 passing before Phase 3 edits | Added 3 tests referencing missing `buildAdaptiveThicknessReferenceMask`; failed as expected | Passed after 3.2 | Thin equals min constant mask, thick equals max constant mask, gap equals min constant mask | Clean |
| 3.2 | `packages/horizon-ao/src/vbaoReference.ts` | Unit | Covered by 3.1 RED tests | Helper did not exist | `vbaoReference.test.ts` passed 63/63 | Reuses `estimateAdaptiveThickness` plus existing `buildSampleMask` instead of duplicating interval math | Minimal reference-only bridge |
| 3.3 | `packages/horizon-ao/src/vbaoReference.ts` | Unit/API shape | Existing public `VBAONode` API untouched | N/A structural refactor task | Tests and typechecks passed | Helper name includes `Reference`; no shader or public option changes | No further refactor needed |
| 4.1 | `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Unit | 63 tests after Phase 3 implementation | N/A verification task | Targeted Vitest passed 63/63 | Includes prior 60 reference tests plus 3 adaptive mask tests | Clean |
| 4.2 | `packages/horizon-ao/tsconfig.json` | Typecheck | Phase 3 implementation complete | N/A verification task | `tsc --noEmit` and `tsgo --noEmit` passed | Both TypeScript engines accept the new exports and tests | Clean |
| 4.3 | `openspec/changes/vbao-adaptive-thickness-reference/apply-progress.md` | Documentation | Verification complete | N/A documentation task | Progress updated | Captures RED/GREEN evidence for next-session recovery | Clean |

## Verification

- RED confirmed: `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoReference.test.ts` failed with 3 expected missing-helper failures after adding Phase 3 tests.
- Passed: `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoReference.test.ts` (63 tests)
- Passed: `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json`
- Passed: `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p packages/horizon-ao/tsconfig.json`

## Remaining

- None for `vbao-adaptive-thickness-reference`.

## Next

- Archive this OpenSpec change when ready.
- Use this scalar reference behavior as the gate for any later TSL adaptive
  thickness port.
