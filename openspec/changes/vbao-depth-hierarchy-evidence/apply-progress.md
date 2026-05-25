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

## TDD Cycle Evidence

| Cycle | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 1 | `vbaoDepthHierarchy.test.ts` failed with missing `../vbaoDepthHierarchy`. | Added `chooseVbaoDepthHierarchyLevel` with deterministic log2 footprint selection. | None needed. |
| 2 | Overlarge footprint test failed: `Infinity` returned `0` instead of `maxLevel`. | Treated positive infinity as an overlarge footprint and returned the clamped `maxLevel`. | None needed. |

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Targeted Vitest | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 3 tests |
| Core TypeScript | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/horizon-ao` | Pass |

## Remaining Work

- Add radius stress evidence row schema and benchmark labels.
- Capture screenshots and median/p95 timing rows before any production depth
  hierarchy path is proposed.
- Decide whether depth hierarchy or bitmask confidence is the next implementation
  gate after radius stress evidence exists.
