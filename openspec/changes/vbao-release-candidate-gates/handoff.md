# Handoff: VBAO Release-Candidate Gates

Date: 2026-06-01

## Status

All phases in `vbao-release-candidate-gates` are complete and verified. This is
not a release-candidate claim for visual quality; it is the handoff package for
the evidence gates that decide what still blocks that claim.

## What changed

- Product evidence now measures the Museum `quality` product preset path instead
  of relying on debug sample/slice overrides.
- Half-resolution VBAO was measured and **not promoted** because quality labels
  and stripe regressions remain.
- Noise-source candidates were re-measured; `phase-atlas-stable-hash` remains
  the default because no candidate had a broad Pareto win.
- Reference/debug-only math moved out of runtime source into
  `packages/horizon-ao/reference/`.
- Benchmark-only noise selection is internal: `benchmark: { noiseSource }`.
- Generated shader inspection confirms fixed product loop bounds (`< 4` slices,
  `< 8` samples) and no hidden full-res JBU/wide-polish/surprise pass.
- Review archive manifest now verifies file existence and relative import
  closure.

## Verification

Last verified commands:

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
node --check scripts/verify-vbao-review-archive.mjs
node --check apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs
node scripts/verify-vbao-review-archive.mjs
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check
```

Results:

- Targeted Vitest: 11 files / 88 tests passed.
- Review archive verifier: 0 missing files, 0 missing relative imports.
- Core typecheck: passed, including `tsconfig.reference.json`.
- Demo typecheck: passed.
- `git diff --check`: passed.
- Production build: not run, per project rule.

## Evidence artifacts included in zip

- `artifacts/benchmarks/ao-production-latest.json`
- `artifacts/benchmarks/ao-production-quality-summary.md`
- `artifacts/benchmarks/vbao-noise-source-comparison-latest.json`
- `artifacts/benchmarks/vbao-noise-source-comparison-summary.md`
- `artifacts/benchmarks/vbao-generated-shader-inspection-latest.json`
- `artifacts/benchmarks/vbao-generated-shader-inspection-summary.md`
- `artifacts/benchmarks/screenshots-ao-production/`
- `artifacts/benchmarks/screenshots-vbao-noise-sources/`

These generated artifacts are intentionally ignored by git. Include them in a
commit only with `git add -f` when a curated evidence commit is required.

## Known remaining debt

- `vbaoPixel` duplicate-name warnings still reproduce during generated shader
  inspection. Captured shader shape shows no hidden full-res JBU, wide polish,
  or surprise pass, so this is diagnostics debt, not a shader-shape failure.
- Half-resolution is still not promoted.
- No noise-source default change was made.

## Zip

Fresh handoff zip:

- `artifacts/horizon-ao-vbao-release-candidate-gates-handoff.zip`
