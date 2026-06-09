# Apply Progress: VBAO Receiver Visibility Solver

## Status

Planning artifacts created, product API collapse applied, Phase 2
behavior-preserving receiver ownership refactor applied, and Phase 3
confidence/support gates applied through private confidence-guided
reconstruction plus evidence comparison. Phase 4.1 depth preparation decision
recorded without promoting the rejected depth-prefilter prototype. Phase 4
input-preparation and compute gates are closed, and Phase 5 receiver reuse
keeps temporal private, motion-gated, and public-API-free.

## Completed

| Item | Status | Notes |
| --- | --- | --- |
| Proposal | Done | Defines receiver visibility solver as the product architecture direction. |
| Design | Done | Adds receiver-state model and Mermaid architecture diagram. |
| SDD plan | Done | Defines phase order, guardrails, skill routing, and verification. |
| Ultraplan | Done | Adds gate stack, readiness, implementation slices, and kill criteria. |
| Source shape audit | Done | Lists behavior-preserving refactors and non-refactors. |
| Phase 2 source refactor | Done | Renamed private `VBAONode` ownership fields and graph helpers around raw receiver estimate and product AO. |
| Product API collapse | Done | Added `contact`, `advanced` overrides, and product-shaped preset defaults. |
| Phase 3.1 confidence semantics | Done | Added reference-only support/confidence semantics and tests before runtime metadata. |
| Phase 3.2 metadata representation | Done | Chose private R16F confidence/support sidecar; RG16F deferred until local format support is proven. |
| Phase 3.3 runtime confidence sidecar | Done | Added private `VBAOReceiverConfidenceNode` computing support/agreement confidence from receiver-state terms. |
| Phase 3.4 confidence-guided reconstruction | Done | `VBAONode` owns the private confidence sidecar, cleanup/polish consume it, and the dead fused resolve-polish candidate was removed. |
| Phase 3.5 confidence evidence | Done | Captured scalar-control and confidence-diagnostic rows with screenshots, labels, and pass timings at 1920x1080 and 1280x720. |
| Phase 3.6 confidence decision | Done | Kept confidence private and candidate-only; no public API or product promotion from this evidence. |
| Phase 4.1 depth preparation decision | Done | Historical radius-stress evidence justifies the candidate family, but the rejected 2x2 prefilter stays out and a refreshed current-product gate is required before runtime work. |
| Phase 4.2 edge metadata decision | Done | Edge metadata can replace repeated reconstruction compatibility work, but only as a private sidecar with target inventory and a named edge/cost win. |
| Phase 4.3 compute boundary decision | Done | Compute remains valid for readback/oracle and private StorageTexture integration, but no new product compute path is added without a storage/tiled data win. |
| Phase 4.4 compute inventory evidence | Done | Evidence rows now include target format, lifetime, backend, and dispatch timing; Phase 4.4 capture proves the fields in JSON/Markdown. |
| Phase 4.5 compute rejection gate | Done | Architectural compute is rejected unless it replaces a named limitation and wins evidence without quality regressions. |
| Phase 5 receiver reuse decision | Done | Reframed temporal as receiver-state reuse, kept camera-only temporal rejected, kept velocity-backed temporal private, and deferred confidence-as-history-validation until the base velocity path wins. |
| Phase 6 directional visibility decision | Done | Added reference-only directional reconstruction from open sectors, tests for separated lobes, and a public API/export guard. |
| Phase 7 evidence and claims decision | Done | Kept EVIDENCE unchanged without release-grade rows, corrected README slice-weight wording, and preserved scalar AO as the only public product claim. |
| ADR-016 | Done | Records private confidence-guided reconstruction and removal of the fused wrapper candidate. |
| E2E metaprompt | Done | Adds implementation goal, completion criteria, verification, and reporting shape. |
| Tasks | Done | Phase 0 through Phase 7 items complete. |
| Spec delta | Done | Adds receiver-state boundary requirements for scalar output, metadata, reuse, and directional work. |

## Verification

```sh
Get-ChildItem -File -Recurse 'G:\RWY37\horizon-ao\openspec\changes\vbao-receiver-visibility-solver' | Select-String -Pattern '\s+$'
Get-ChildItem -File -Recurse 'G:\RWY37\horizon-ao\openspec\changes\vbao-receiver-visibility-solver' | Select-String -Pattern '[—“”’]'
Test-Path -LiteralPath 'G:\RWY37\horizon-ao\openspec\changes\vbao-receiver-visibility-solver\specs\vbao-node\spec.md'
Test-Path -LiteralPath 'G:\RWY37\horizon-ao\openspec\changes\vbao-receiver-visibility-solver\e2e-metaprompt.md'
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoReceiverConfidence.test.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts
pnpm --filter @horizonao/core exec vitest run --root ../.. packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts apps/demo/scripts/profiling/productionReport.test.mjs packages/horizon-ao/reference/__tests__/vbaoReceiverConfidence.test.ts
pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
pnpm typecheck
AO_BENCHMARK_MODES=vbao AO_BENCHMARK_VIEWS=ao AO_BENCHMARK_DENOISE_STATES=true AO_BENCHMARK_VBAO_RESOLUTION_STATES=half AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE=off AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE=scalar-control AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=final AO_BENCHMARK_SCREENSHOT_ROOT=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control.json AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control.md pnpm --filter @horizonao/demo benchmark:ao
AO_BENCHMARK_MODES=vbao AO_BENCHMARK_VIEWS=ao AO_BENCHMARK_DENOISE_STATES=true AO_BENCHMARK_VBAO_RESOLUTION_STATES=half AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE=sector-confidence-smoke AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE=confidence-guided AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=confidence AO_BENCHMARK_SCREENSHOT_ROOT=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate.json AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate.md pnpm --filter @horizonao/demo benchmark:ao
AO_BENCHMARK_MODES=vbao AO_BENCHMARK_VIEWS=ao AO_BENCHMARK_DENOISE_STATES=true AO_BENCHMARK_VBAO_RESOLUTION_STATES=half AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE=sector-confidence-smoke AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE=confidence-guided AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=final AO_BENCHMARK_SCREENSHOT_ROOT=artifacts/benchmarks/vbao-compute-inventory-phase4-4 AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-compute-inventory-phase4-4.json AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-compute-inventory-phase4-4.md pnpm --filter @horizonao/demo benchmark:ao
git diff --check -- openspec/changes/vbao-receiver-visibility-solver openspec/adr/ADR-016-private-confidence-guided-reconstruction.md openspec/specs/vbao-node/spec.md apps/demo/scripts/collect-ao-benchmark.mjs apps/demo/scripts/profiling/productionReport.mjs apps/demo/scripts/profiling/productionReport.test.mjs apps/demo/scripts/profiling/productionReport.d.mts apps/demo/src/scenes/MuseumScene.tsx packages/horizon-ao/reference/vbaoReference.ts packages/horizon-ao/reference/vbaoReceiverConfidence.ts packages/horizon-ao/reference/__tests__/vbaoReceiverConfidence.test.ts packages/horizon-ao/src/VBAONode.ts packages/horizon-ao/src/VBAOHalfResCleanupNode.ts packages/horizon-ao/src/VBAOFullResPolishNode.ts packages/horizon-ao/src/VBAOReceiverConfidenceNode.ts packages/horizon-ao/src/VBAOResolvePolishNode.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/vbaoConstants.ts
```

Results:

- trailing whitespace scan: clean;
- non-ASCII punctuation scan: clean;
- spec delta path exists.
- E2E metaprompt path exists.
- focused source/sampling Vitest: 12 files passed, 116 tests passed;
- focused receiver confidence/reference/evidence-contract Vitest: 13 files
  passed, 119 tests passed;
- focused private confidence-guided reconstruction/source-contract Vitest: 2
  files passed, 45 tests passed;
- focused production report Vitest: 1 file passed, 18 tests passed;
- focused source contract Vitest: 13 files passed, 119 tests passed;
- core typecheck: passed;
- demo typecheck: passed.
- workspace typecheck: passed.
- Phase 3.5 scalar-control benchmark: 4 rows, 2 direct evidence rows complete,
  confidence pass skipped in product control rows.
- Phase 3.5 confidence-diagnostic benchmark: 2 rows, both evidence rows
  complete, confidence pass measured and product passes skipped.
- Phase 4.4 compute-inventory benchmark: 4 rows; JSON and Markdown include
  `rgba8unorm`, `active-vbao-pipeline`, `webgpu`, and compute CPU timing.
- Phase 5 receiver-reuse verification: trailing whitespace scan clean,
  non-ASCII punctuation scan clean, diff hygiene clean with expected CRLF
  warnings only, and focused source-contract Vitest passed with 13 files and
  119 tests.
- Phase 6 directional visibility reference test: failed RED before
  `reconstructDirectionalVisibility` existed, then passed with 14 files and
  123 tests after the reference implementation landed.
- Phase 6 directional/source contract verification: focused directional and
  source-contract Vitest passed with 14 files and 124 tests; core typecheck
  passed; diff hygiene clean with expected CRLF warnings only.
- Final Phase 5-7 verification: focused directional/source-contract Vitest
  passed with 14 files and 125 tests; production report Vitest passed with 1
  file and 19 tests; core typecheck passed; demo typecheck passed; SDD
  whitespace scan clean; non-ASCII punctuation scan clean; diff hygiene clean
  with expected CRLF warnings only.
- diff hygiene: clean, with expected CRLF warnings only.

`git diff --check` does not report untracked files, so explicit file scans are
used for the new SDD files.

## Next Runtime Slice

Receiver-solver SDD phases are closed. Confidence stays private and
candidate-only. Depth preparation, edge metadata, compute, receiver reuse, and
directional visibility are justified candidate families only; no
depth-prefilter, edge sidecar, product compute runtime, camera-only temporal
path, velocity-backed public API, confidence-history validation, public
bent-normal output, public directional output, or release claim is promoted.
