# Apply Progress: VBAO Receiver Visibility Solver

## Status

Planning artifacts created, product API collapse applied, Phase 2
behavior-preserving receiver ownership refactor applied, and Phase 3.1-3.4
confidence/support gates applied through private confidence-guided
reconstruction.

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
| ADR-016 | Done | Records private confidence-guided reconstruction and removal of the fused wrapper candidate. |
| E2E metaprompt | Done | Adds implementation goal, completion criteria, verification, and reporting shape. |
| Tasks | Done | Phase 0, Phase 1, Phase 2, Phase 2.5, and Phase 3.1-3.4 items complete; evidence comparison remains pending. |
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
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
pnpm typecheck
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
- core typecheck: passed;
- demo typecheck: passed.
- workspace typecheck: passed.
- diff hygiene: clean, with expected CRLF warnings only.

`git diff --check` does not report untracked files, so explicit file scans are
used for the new SDD files.

## Next Runtime Slice

Continue with Phase 3.5. Phase 3.1 semantics, Phase 3.2 representation
selection, Phase 3.3 private runtime computation, and Phase 3.4
confidence-guided reconstruction are closed, so the next gate is evidence
comparison:

1. capture confidence diagnostic rows beside scalar control rows;
2. record screenshots, labels, and pass timings;
3. keep confidence private until it proves a named label or cost win.
