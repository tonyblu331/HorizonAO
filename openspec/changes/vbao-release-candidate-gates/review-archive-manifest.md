# Review Archive Manifest: VBAO Release-Candidate Gates

This manifest defines the self-contained file set for external review of the
current VBAO release-candidate gates. It is a manifest, not a claim that every
generated artifact is committed; ignored benchmark outputs are documented in
`EVIDENCE.md` and must be force-added only when curated.

## Included files

### Public/runtime package boundary

- `packages/horizon-ao/src/index.ts`
- `packages/horizon-ao/src/VBAONode.ts`
- `packages/horizon-ao/src/VBAOResolveNode.ts`
- `packages/horizon-ao/src/VBAOHalfResCleanupNode.ts`
- `packages/horizon-ao/src/VBAOFullResPolishNode.ts`
- `packages/horizon-ao/src/vbaoConstants.ts`
- `packages/horizon-ao/src/vbaoNoise.ts`
- `packages/horizon-ao/src/vbaoSampling.ts`
- `packages/horizon-ao/src/rawModules.d.ts`

### Reference and report modules

- `packages/horizon-ao/reference/aoProductionReferenceGate.ts`
- `packages/horizon-ao/reference/aoRaycastReference.ts`
- `packages/horizon-ao/reference/aoReferenceReport.ts`
- `packages/horizon-ao/reference/canonicalVbaoReference.ts`
- `packages/horizon-ao/reference/vbaoCanonicalDriftReport.ts`
- `packages/horizon-ao/reference/vbaoGtVbaoMath.ts`
- `packages/horizon-ao/reference/vbaoReference.ts`
- `packages/horizon-ao/reference/vbaoSectorTables.ts`

### Tests under review

- `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
- `packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts`
- `packages/horizon-ao/src/__tests__/vbaoSampling.test.ts`
- `packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
- `packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts`
- `packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts`
- `packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts`
- `packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts`
- `packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts`
- `packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts`
- `packages/horizon-ao/reference/__tests__/vbaoReference.test.ts`

### Demo evidence and report files

- `apps/demo/src/scenes/MuseumScene.tsx`
- `apps/demo/src/scenes/gpuPassTimingProbe.ts`
- `apps/demo/src/scenes/vbaoBenchmarkNoise.ts`
- `apps/demo/src/parityScenes.ts`
- `apps/demo/e2e/ao-compare.spec.ts`
- `apps/demo/scripts/collect-ao-benchmark.mjs`
- `apps/demo/scripts/collect-ao-gpu-readback-baseline.mjs`
- `apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs`
- `apps/demo/scripts/collect-vbao-noise-source-comparison.mjs`
- `apps/demo/scripts/profiling/benchmarkHarness.mjs`
- `apps/demo/scripts/profiling/productionReport.mjs`
- `apps/demo/scripts/profiling/screenshotMetrics.mjs`

### Specs, decisions, evidence, and verification

- `EVIDENCE.md`
- `openspec/specs/vbao-node/spec.md`
- `openspec/adr/ADR-007-vbao-pivot.md`
- `openspec/adr/ADR-011-raw-first-no-denoise.md`
- `openspec/adr/ADR-013-vbao-quality-hardening-roadmap.md`
- `openspec/changes/vbao-product-evidence-truthfulness/proposal.md`
- `openspec/changes/vbao-product-evidence-truthfulness/design.md`
- `openspec/changes/vbao-product-evidence-truthfulness/tasks.md`
- `openspec/changes/vbao-product-evidence-truthfulness/specs/vbao-node/spec.md`
- `openspec/changes/vbao-release-candidate-gates/proposal.md`
- `openspec/changes/vbao-release-candidate-gates/design.md`
- `openspec/changes/vbao-release-candidate-gates/tasks.md`
- `openspec/changes/vbao-release-candidate-gates/specs/vbao-node/spec.md`
- `openspec/changes/vbao-release-candidate-gates/apply-progress.md`
- `openspec/changes/vbao-release-candidate-gates/handoff.md`
- `openspec/changes/vbao-release-candidate-gates/review-archive-manifest.md`
- `scripts/verify-vbao-review-archive.mjs`

## Exclusions

No excluded internal imports are required for the files above.

Generated benchmark outputs under `artifacts/benchmarks/` are intentionally
excluded from the manifest because `.gitignore` makes them opt-in. Curated
screenshots, JSON, and markdown summaries cited in `EVIDENCE.md` must be added
with `git add -f` when a review archive needs binary/generated evidence.

## Verification

Run:

```sh
node scripts/verify-vbao-review-archive.mjs
```

The verifier fails if a manifest entry is missing or if a listed source file has
a relative import that is not also listed in this manifest.
