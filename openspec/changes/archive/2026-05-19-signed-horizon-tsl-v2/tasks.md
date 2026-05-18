# Tasks: signed-horizon-tsl-v2

## Phase 1: RED Tests

- [x] 1.1 Add CPU parity tests in `packages/horizon-ao/src/horizonAoMath.test.ts` for current cos-horizon slice behavior.
- [x] 1.2 Add invalid/reversed horizon guard tests for signed-horizon reference helpers.

## Phase 2: GREEN Implementation

- [x] 2.1 Add `resolveSignedHorizonCosineSliceAccessibility` to `packages/horizon-ao/src/horizonAoMath.ts` and export it.
- [x] 2.2 Refactor `packages/horizon-ao/src/horizonAoNode.ts` helper names from occlusion/cosine-delta wording to signed-horizon wording.
- [x] 2.3 Keep scalar accessibility output and public API unchanged.

## Phase 3: Documentation

- [x] 3.1 Update `openspec/horizonao-current-shape-roadmap.md` for signed-horizon TSL v2 progress.
- [x] 3.2 Update `openspec/horizonao-math-revision-2025.md` only if the math contract changes.

## Phase 4: Verification

- [x] 4.1 Run core unit tests, core/demo typechecks, tsgo checks, lint, and targeted scalar AO E2E.
- [x] 4.2 Write `verify-report.md` and archive the SDD change only if verification has no critical issues.
