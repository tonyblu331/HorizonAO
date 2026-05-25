# Apply Progress: VBAO Directional Visibility Reference

## Status

10/10 tasks complete.

## Completed

| Task | Evidence | Notes |
| --- | --- | --- |
| 1.1 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Added full-open and full-blocked directional-mask tests. Full-open reconstructs accessibility `1` and a non-zero bent direction; full-blocked reconstructs accessibility `0`, zero directional weight, and zero bent normal. |
| 1.2 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Added a symmetric open-sector window test proving the bent direction remains stable around the slice direction instead of drifting toward view-space `V`. |
| 1.3 | `packages/horizon-ao/src/vbaoReference.ts` | Added `reconstructDirectionalVisibility`, a pure reference function that derives accessibility, directional weight, and bent normal from open sectors in the VBAO mask. |
| 2.1 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Added a separated-lobe test proving two non-contiguous open sector windows return two visibility buckets. |
| 2.2 | `packages/horizon-ao/src/vbaoReference.ts` | Implemented per-slice contiguous open-lobe extraction that converts each open sector run into a weighted direction, aperture, and bucket weight. |
| 2.3 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts`, `packages/horizon-ao/src/vbaoReference.ts` | Added cross-slice merge coverage and implemented similar-direction bucket merging with weighted direction accumulation. |
| 2.4 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts`, `packages/horizon-ao/src/vbaoReference.ts` | Added a three-lobe cap test and limited the first reference pass to the two strongest buckets. |
| 3.1 | `packages/horizon-ao/src/vbaoDirectionalFixtures.ts`, `packages/horizon-ao/src/__tests__/vbaoDirectionalEvidence.test.ts` | Added internal debug fixtures for full-open, full-blocked, and two-lobe masks with scalar accessibility, bent normal, and bucket output. |
| 3.2 | `openspec/changes/vbao-directional-visibility-reference/design.md` | Documented uncertainty and failure cases for bucket count, merge threshold, bent-normal compression, unresolved scalar failures, and API restraint. |
| 3.3 | `packages/horizon-ao/src/__tests__/vbaoDirectionalEvidence.test.ts`, `packages/horizon-ao/src/index.ts` | Added a source/docs guard proving directional reference helpers and fixtures are not exported from `@horizonao/core`. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | `vbaoReference.test.ts` passed 63/63 before editing reference code. | New tests failed with `TypeError: reconstructDirectionalVisibility is not a function`. | Implemented the pure reference function; targeted directional test passed 3/3. | Full-open and full-blocked cases exercise non-zero and zero output paths. | Kept implementation in the reference module only; no public package export. |
| 1.2 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | Same safety net as 1.1. | Symmetric open-window test failed before the function existed. | The same implementation passed the symmetric bent-direction case. | The open-window case has partial accessibility (`0 < A < 1`) and non-zero direction, distinct from full-open. | None needed. |
| 1.3 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | Same safety net as 1.1. | Covered by the missing-function RED from tasks 1.1 and 1.2. | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` passed 3/3. | Multiple masks force real weight accumulation rather than a hardcoded return. | Pure helper uses existing vector utilities and sector trig tables. |
| 2.1 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | Directional tests passed 3/3 before the lobe test. | New separated-lobe test failed because `result.buckets` was undefined. | Added bucket extraction; targeted directional test passed 4/4. | The test asserts two non-empty buckets with opposite view-axis signs while the bent normal stays averaged. | Removed premature merge/cap logic so later tasks keep their own RED/GREEN cycles. |
| 2.2 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | Same safety net as 2.1. | The separated-lobe test failed before lobe extraction existed. | Implemented contiguous per-slice open-run extraction; targeted directional test passed 4/4. | Two lobe windows force more than a single open-run path. | Kept extraction private until later evidence proves a public reference helper is useful. |
| 2.3 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | Directional tests passed 4/4 before merge. | Cross-slice merge test failed because duplicate similar buckets produced length 2 instead of 1. | Added weighted similar-direction merge; targeted directional test passed 5/5. | The merged bucket doubles the single-slice weight and keeps direction stable. | Merge threshold is private reference logic; no public API added. |
| 2.4 | `packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` | Unit/reference math | Directional tests passed 5/5 before cap. | Three-lobe test failed because all 3 buckets were returned. | Capped merged buckets with `.slice(0, 2)`; targeted directional test passed 6/6. | Test also asserts descending weight order so the cap keeps strongest buckets first. | None needed. |
| 3.1 | `packages/horizon-ao/src/__tests__/vbaoDirectionalEvidence.test.ts` | Unit/docs contract | Directional reference tests passed 6/6 before fixture work. | Evidence test failed because `../vbaoDirectionalFixtures` did not exist. | Added internal fixture module; evidence test moved to the docs-guard failure. | Fixture assertions cover full-open scalar/bent output and two-lobe bucket output. | Kept fixtures out of `index.ts`. |
| 3.2 | `packages/horizon-ao/src/__tests__/vbaoDirectionalEvidence.test.ts` | Unit/docs contract | Same safety net as 3.1. | Test failed because the design did not contain `## Uncertainty And Failure Cases`. | Added the design section; evidence test passed 2/2. | The section names concrete failure cases rather than a generic warning. | None needed. |
| 3.3 | `packages/horizon-ao/src/__tests__/vbaoDirectionalEvidence.test.ts` | Unit/source contract | Same safety net as 3.1. | Directional API guard was written before any export change; no public API change was made. | Test passes while `index.ts` remains scalar-only. | Guard checks both `DirectionalVisibility` and `VBAO_DIRECTIONAL_DEBUG_FIXTURES` are absent from public exports. | No export refactor needed. |

## Verification

- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoReference.test.ts` — passing, 63/63 before edits.
- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` — passing, 3/3.
- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` — passing, 4/4 after Phase 2 lobe extraction.
- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDirectionalVisibility.test.ts` — passing, 6/6 after merge and cap.
- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDirectionalEvidence.test.ts` — passing, 2/2.

## Remaining Work

All planned tasks are complete.

## Issues Found

- None yet.
