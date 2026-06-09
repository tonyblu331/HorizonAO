# VBAO Release Gap Closure: Readiness Report

## Verdict

`incomplete`

This change does not prove release readiness yet. Phase 3 render evidence exists,
but the release gate is still blocked by missing reference observations,
missing explicit threshold verdicts, local-only artifacts, and current VBAO
failure labels.

## Evidence Artifacts

- `EVIDENCE.md`
- `artifacts/benchmarks/ao-release-gap-closure-latest.json`
- `artifacts/benchmarks/ao-release-gap-closure-summary.md`
- `artifacts/benchmarks/screenshots-ao-release-gap-closure/`
- `artifacts/benchmarks/vbao-generated-shader-inspection-latest.json`
- `artifacts/benchmarks/vbao-generated-shader-inspection-summary.md`

The benchmark artifacts are local capture outputs. They are not clean-checkout
reproducible until the curated JSON, Markdown, and screenshots are explicitly
added to version control.

## Gate Summary

| Gate | Status | Evidence |
| --- | --- | --- |
| Reference truth | `incomplete` | `ao-release-gap-closure-latest.json` reports product reference rows as `missing-reference-observation`. |
| Screenshot/timing evidence | `captured` | 38 report rows and 36 screenshots captured for `/lab` and `/museum` at both required resolutions. |
| Rendered proxy vs reference observations | `blocked` | 26 rendered proxy rows were checked against reference observation coverage; all 26 block on `missing-reference-observation`. |
| Product promotion | `blocked` | Product promotion rows are 26 `fail`, 8 `incomplete`, 0 `pass`. |
| Threshold policy | `incomplete` | Threshold gate rows remain `incomplete`; no thresholds were tuned after capture. |
| Private candidates | `pass` | Tests keep temporal, compute, sample override, cleanup, resolve-polish, and non-default noise-source lanes out of product promotion. |
| Generated shader inspection | `pass` | Product preset and `spatial-ultra` rows use fixed loop bounds, no dynamic slice/sample uniform loops, no duplicate VBAO declaration warnings, and no non-ignored console diagnostics. |
| Public package surface | `pass` | `@horizonao/core` exports only `VBAONode`, `vbao`, `VBAONodeOptions`, and `VBAOQualityPreset`. |
| Clean-checkout reproducibility | `incomplete` | Capture artifacts are present locally but not curated into the tracked release evidence set. |

## Decision

- Do not promote VBAO as release-ready from this SDD.
- Keep README/package quality claims unchanged.
- Keep current contact/thickness policy rejected for release promotion until
  reference observations and threshold gates prove otherwise.
- Continue with reference-observation wiring before any final pass verdict is
  possible.

## Verification

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts
pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
node --check apps/demo/scripts/collect-ao-benchmark.mjs
node --check apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs
node --check apps/demo/scripts/profiling/productionReport.mjs
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5209'; $env:PLAYWRIGHT_TEST_PORT='5209'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Production build was not run.
