# Apply Progress: VBAO Depth Hierarchy Evidence Gate

## Status

Started. Phase 1 and Phase 2 are complete for the first reference-only vertical
slice. No production shader path, public API, render target, denoise, or temporal
behavior was added.

## Completed Tasks

| Task | Status | Evidence |
| --- | --- | --- |
| 1.1 Add proposal and design artifacts | Complete | `proposal.md`, `design.md`, and spec delta added under this change. |
| 1.2 Add RED tests for deterministic footprint-to-level selection | Complete | Targeted Vitest first failed because `../vbaoDepthHierarchy` did not exist. |
| 1.3 Add contract assertions that no public API exposes depth hierarchy | Complete | Test asserts `index.ts` and `VBAONodeOptions` do not expose depth hierarchy names. |
| 2.1 Implement the minimal reference selector | Complete | `packages/horizon-ao/src/vbaoDepthHierarchy.ts`. |
| 2.2 Clamp invalid, subpixel, and overlarge footprints deterministically | Complete | Second RED failed on `Infinity`; GREEN now clamps it to `maxLevel`. |
| 2.3 Keep all inputs frame/time/history-free | Complete | Selector input is only `sampleFootprintPixels` and `maxLevel`. |
| 3.1 Add spec delta for radius stress evidence rows | Complete | Spec now requires radius stress rows with `vbaoRadiusStressPreset`, `vbaoRadius`, and `vbaoExpectedDepthHierarchyLevel`. |
| 3.2 Add benchmark labels for future radius stress captures without public API | Complete | Museum benchmark API and collector now support `AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1` and row labels. |

## TDD Cycle Evidence

| Cycle | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 1 | `vbaoDepthHierarchy.test.ts` failed with missing `../vbaoDepthHierarchy`. | Added `chooseVbaoDepthHierarchyLevel` with deterministic log2 footprint selection. | None needed. |
| 2 | Overlarge footprint test failed: `Infinity` returned `0` instead of `maxLevel`. | Treated positive infinity as an overlarge footprint and returned the clamped `maxLevel`. | None needed. |
| 3 | Radius stress label test failed because spec/collector/Museum lacked the evidence fields. | Added spec row contract, internal Museum benchmark setter, collector matrix expansion, and row fields. | Narrowed the assertion so `scale-mismatch` stays a review label, not an auto-assigned collector label. |

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Targeted Vitest | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 4 tests |
| Core TypeScript | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/horizon-ao` | Pass |
| Collector syntax | `node --check apps/demo/scripts/collect-ao-benchmark.mjs` | Pass |
| Demo TypeScript | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `apps/demo` | Pass |

## Remaining Work

- Capture screenshots and median/p95 timing rows before any production depth
  hierarchy path is proposed.
- Decide whether depth hierarchy or bitmask confidence is the next implementation
  gate after radius stress evidence exists.
