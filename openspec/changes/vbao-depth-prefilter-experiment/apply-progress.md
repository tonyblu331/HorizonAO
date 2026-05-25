# Apply Progress: VBAO Depth Prefilter Experiment

## Status

Started. Phase 1 and Phase 2 are complete. No shader path, render target,
benchmark prefilter toggle, or public API was added.

## Completed Tasks

| Task | Status | Evidence |
| --- | --- | --- |
| 1.1 Add proposal/design/spec artifacts | Complete | Added OpenSpec proposal, design, tasks, and `vbao-node` spec delta. |
| 1.2 Add RED tests for representative-depth selection | Complete | Targeted Vitest failed because `chooseVbaoRepresentativeDepth` was not implemented. |
| 1.3 Implement the minimal representative-depth helper | Complete | Added `chooseVbaoRepresentativeDepth` to `packages/horizon-ao/src/vbaoDepthHierarchy.ts`. |
| 1.4 Keep the helper deterministic and history-free | Complete | Helper inputs are only `viewDepths`, `farthestDepthTolerance`, and `fallbackViewDepth`; no frame/time/history input. |
| 2.1 Add source/docs contract tests proving no public API changes | Complete | Test asserts no `vbaoDepthPrefilter`, `depthPrefilter`, `depthHierarchy`, or `depthMip` public API. |
| 2.2 Record the TSL render-target vs WebGPU compute decision | Complete | Design prefers a TSL render-target chain first and defers WebGPU compute. |
| 2.3 Define benchmark-only prefilter label schema | Complete | RED test required `AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX`, `vbaoDepthPrefilterPreset`, `baseline`, and `prefilter` in spec/design before capture work. |

## TDD Cycle Evidence

| Cycle | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 1 | `vbaoDepthHierarchy.test.ts` failed with `chooseVbaoRepresentativeDepth is not a function`. | Implemented farthest-supported representative depth selection. | Kept it reference-only and outside the public index. |
| 2 | `vbaoDepthHierarchy.test.ts` failed because the prefilter spec/design did not define the benchmark-only label schema. | Added explicit `AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX`, `vbaoDepthPrefilterPreset`, `baseline`, and `prefilter` contract text. | Kept labels benchmark-only and explicitly outside `VBAONodeOptions`. |

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Targeted Vitest | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 6 tests |
| Targeted Vitest after label schema | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 7 tests |

## Remaining Work

- Prototype the internal prefilter path.
- Capture baseline vs prefilter radius-stress rows before any production claim.
