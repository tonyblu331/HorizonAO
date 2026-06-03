# Apply Progress: VBAO Thin Geometry Golden Diff Audit

## Status

Complete for the audit scope.

The SDD now has:

- a metaprompt;
- a proof-layer audit;
- product observation boundary documentation;
- product observation ingestion documentation;
- rendered thin-geometry proxy report support;
- Phase 4 WebGPU screenshots/timings;
- EVIDENCE.md rows with scalar/ray-cast/rendered boundaries intact.

## Phase Summary

| Phase | Status | Evidence |
| --- | --- | --- |
| 1. Audit | Complete | `audit.md` classifies scalar, ray-cast, rendered, and evidence-ledger layers. |
| 2. Gate definition | Complete | `gate-decision.md` records that existing reports are enough for separate gates; no new joined report is warranted before product observations exist. |
| 3. Product observation wiring | Complete | `product-observation-boundary.md` and `product-observation-ingestion.md` document the existing row fields and missing producer. `aoProductionReferenceGate.test.ts` pins absent `thin-gap-separated-slabs` as warning-level missing coverage. |
| 4. Rendered evidence | Complete | `vbao-thin-geometry-golden-diff-phase4.{json,md}` captured 4 WebGPU rows: 2 resolutions × beauty/AO, full-resolution product VBAO. |
| 5. Verification | Complete | Focused tests, core typecheck, demo typecheck, script syntax check, and diff hygiene passed. |

## Implemented Runtime/Tooling Changes

- `apps/demo/scripts/profiling/productionReport.mjs`
  - Added `createRenderedThinGeometryProxyRows`.
  - Added a dedicated Markdown section for rendered thin-geometry proxy status.
- `apps/demo/scripts/profiling/productionReport.d.mts`
  - Added typings for rendered thin-geometry proxy rows.
- `packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts`
  - Added coverage for rendered proxy row completeness and missing metrics.
- `packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
  - Added coverage proving a row can be `compared` while still missing
    `thin-gap-separated-slabs`.

## Phase 4 Capture

Command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5220'; $env:PLAYWRIGHT_TEST_PORT='5220'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-thin-geometry-golden-diff-phase4'; pnpm --filter @horizonao/demo benchmark:ao
```

Result:

- 4 rows captured.
- Rendered thin proxy rows are complete.
- Labels are `noise,edge-bleed`; no row has `thin-gap` or `mud`.
- AO product rows still have `0` ray-cast fixture observations and remain
  `missing-reference-observation`.

## Verification

```sh
node --check apps/demo/scripts/profiling/productionReport.mjs
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check -- EVIDENCE.md openspec/changes/vbao-thin-geometry-golden-diff-audit apps/demo/scripts/profiling/productionReport.mjs apps/demo/scripts/profiling/productionReport.d.mts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.json artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.md
```

Result: all passed. `git diff --check` emitted LF-to-CRLF warnings only.

Production build was not run.

## Remaining Non-Scope

A real ray-cast product pass still requires an observation producer for
`thin-gap-separated-slabs`. This audit preserves that missing observation as a
blocker instead of converting rendered screenshots into ground-truth evidence.
