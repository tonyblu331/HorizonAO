# Apply Progress: VBAO Depth Prefilter Experiment

## Status

Complete. Phase 1, Phase 2, and Phase 3 are complete. The demo-only prefilter
candidate was captured and rejected in `EVIDENCE.md`; no public API was added.

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
| 3.1 Add internal benchmark label for baseline vs prefilter | Complete | Demo stats and collector rows now carry `vbaoDepthPrefilterPreset`; matrix flag is recorded, and the demo clamps `prefilter` back to `baseline` until a real candidate path exists. |
| 3.2 Prototype depth prefilter behind the internal harness only | Complete | Museum demo now builds a TSL `rtt` 2x2 farthest-supported depth prefilter and routes `prefilter` rows through a second internal `VBAONode`; baseline rows stay on the original node. |
| 3.3 Capture baseline vs prefilter radius-stress rows | Complete | Ran screenshot-enabled WebGPU matrix to `artifacts/benchmarks/ao-vbao-depth-prefilter-matrix-latest.json`; generated prefilter screenshots for 1920x1080 and 1280x720, beauty and AO-only, single and compose. |
| 3.4 Accept/reject in `EVIDENCE.md` | Complete | Rejected the 2x2 farthest-supported prefilter because it preserved `noise,mud,edge-bleed,scale-mismatch` and introduced visible staircase / false-curvature artifacts. |

## TDD Cycle Evidence

| Cycle | RED | GREEN | REFACTOR |
| --- | --- | --- | --- |
| 1 | `vbaoDepthHierarchy.test.ts` failed with `chooseVbaoRepresentativeDepth is not a function`. | Implemented farthest-supported representative depth selection. | Kept it reference-only and outside the public index. |
| 2 | `vbaoDepthHierarchy.test.ts` failed because the prefilter spec/design did not define the benchmark-only label schema. | Added explicit `AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX`, `vbaoDepthPrefilterPreset`, `baseline`, and `prefilter` contract text. | Kept labels benchmark-only and explicitly outside `VBAONodeOptions`. |
| 3 | `vbaoDepthHierarchy.test.ts` failed because the demo harness and collector did not expose the prefilter labels. | Added `vbaoDepthPrefilterPreset` to stats/rows and `setVbaoDepthPrefilterPreset` to the internal benchmark API. | Left `prefilter` row emission and even manual prefilter labeling blocked until the real shader path lands to avoid fake evidence. |
| 4 | `vbaoDepthHierarchy.test.ts` failed because the harness had labels but no real prefilter candidate. | Added `createVbaoDepthPrefilterNode`, TSL `rtt(...)`, `perspectiveDepthToViewZ`, and prefilter row enumeration. | Used a second internal `VBAONode` so baseline timings do not include the prefilter pass. |

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Targeted Vitest | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 6 tests |
| Targeted Vitest after label schema | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 7 tests |
| Targeted Vitest after harness labels | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts` | Pass, 8 tests |
| Combined contract Vitest | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts packages/horizon-ao/src/__tests__/vbaoEvidenceContract.test.ts` | Pass, 11 tests |
| Demo TypeScript | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `apps/demo` | Pass |
| Combined contract Vitest after candidate | `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts packages/horizon-ao/src/__tests__/vbaoEvidenceContract.test.ts` | Pass, 12 tests |
| Core and demo TypeScript after candidate | `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/horizon-ao` and `apps/demo` | Pass |
| WebGPU collector smoke | `AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=0 node apps/demo/scripts/collect-ao-benchmark.mjs` | Pass, WebGPU `status: ok`, emitted baseline and prefilter rows; temporary JSON was not committed because screenshots/failure labels are still pending. |
| WebGPU prefilter evidence capture | `AO_BENCHMARK_PORT=41764 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-depth-prefilter-matrix-latest.json node scripts/collect-ao-benchmark.mjs` from `apps/demo` | Pass, WebGPU `status: ok`, 56 rows, prefilter screenshots captured; manual review rejected the candidate. |

## Remaining Work

- Do not promote the 2x2 prefilter candidate.
- Next candidate should be a real footprint-selected depth hierarchy with edge
  metadata, or a bitmask-aware sampling/denoise path with confidence metadata.
- Any successor still needs screenshots, timings, and a ground-truth or analytic
  reference comparison before promotion.
