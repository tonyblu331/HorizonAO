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
| 3.3 Update `EVIDENCE.md` only after screenshots and median/p95 rows exist | Complete | Captured `artifacts/benchmarks/ao-vbao-radius-stress-latest.json` plus screenshots, then added the labeled radius-stress table and decision. |

## TDD Cycle Evidence

| Cycle | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 1 | `vbaoDepthHierarchy.test.ts` failed with missing `../vbaoDepthHierarchy`. | Added `chooseVbaoDepthHierarchyLevel` with deterministic log2 footprint selection. | None needed. |
| 2 | Overlarge footprint test failed: `Infinity` returned `0` instead of `maxLevel`. | Treated positive infinity as an overlarge footprint and returned the clamped `maxLevel`. | None needed. |
| 3 | Radius stress label test failed because spec/collector/Museum lacked the evidence fields. | Added spec row contract, internal Museum benchmark setter, collector matrix expansion, and row fields. | Narrowed the assertion so `scale-mismatch` stays a review label, not an auto-assigned collector label. |
| 4 | Evidence stayed pending until the WebGPU radius-stress run produced screenshots and median/p95 rows. | Captured the matrix, assigned review labels, and updated `EVIDENCE.md`. | No production depth path was added. |

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Targeted Vitest | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 4 tests |
| Core TypeScript | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/horizon-ao` | Pass |
| Collector syntax | `node --check apps/demo/scripts/collect-ao-benchmark.mjs` | Pass |
| Demo TypeScript | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `apps/demo` | Pass |
| Radius stress capture | `AO_BENCHMARK_PORT=41763 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-radius-stress-latest.json node scripts/collect-ao-benchmark.mjs` from `apps/demo` | Pass, 40 WebGPU rows |

## Remaining Work

- Design an internal depth prefilter experiment and compare it against the
  large-radius rows before any production path is promoted.
- Keep bitmask confidence as the parallel denoise-enabling path; do not add
  more blur without new metadata.
