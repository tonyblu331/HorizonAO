# Apply Progress: VBAO Reference Evidence Gate

## Status

Implementation started.

The reference-gate, pass-timing, noise-source comparison, and lint-policy pieces
are now wired and verified locally. Museum production screenshot/timing rows
have been captured at `1920x1080` and `1280x720`; `/lab` fixture/reference
captures and fixture observations remain blockers for quality claims.

## Created

- `proposal.md` defines the evidence/reference gate scope.
- `design.md` defines the reference comparison, capture, noise-source, and lint
  policy gates.
- `tasks.md` breaks the work into strict verification phases.
- `specs/vbao-node/spec.md` adds the normative `vbao-node` delta requirements.

## Completed

- Added `packages/horizon-ao/reference/aoProductionReferenceGate.ts`.
- Added `packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`.
- Wired product AO reference-gate rows into the production report path.
- Kept canonical/product VBAO drift visible beside the ray-cast reference gate.
- Added `createEvidenceArtifactStatusRows()` so missing screenshots, frame
  timings, or required VBAO pass timings become `incomplete` evidence, never
  passing evidence.
- Updated the production-report declaration file so the test-visible
  `passTimings` contract includes optional `gpuMs`.
- Added WebGPU VBAO pass timing probe plumbing for raw, cleanup, resolve,
  polish, and total product rows.
- Added benchmark-only noise-source candidates for `phase-atlas-stable-hash`,
  `ign`, `static-stbn`, and `fast-like`.
- Kept the default production sampling scheme as `phase-atlas-stable-hash`.
- Added `apps/demo/scripts/collect-vbao-noise-source-comparison.mjs` and the
  `benchmark:vbao-noise` demo script.
- Fixed lint policy for `.mjs` script globals.
- Chose a narrow scoped `@typescript-eslint/no-explicit-any` override for the
  four Three TSL bridge node files instead of weakening lint globally.
- Captured Museum production pass timings for `raw`, `cleanup`, `resolve`, and
  `polish` at `1920x1080` and `1280x720`.
- Fixed the production timing summary so emitted timestamps are labeled
  `measured` rather than predicted `skipped`, and added the `View` column so
  Beauty/AO rows are not ambiguous duplicates.

## Verification

- Checked the new Markdown files for trailing whitespace and final newlines.
- RED confirmed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts -t "missing screenshots"`
  failed before `createEvidenceArtifactStatusRows()` existed.
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts -t "missing screenshots"`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
  — 4 files / 46 tests.
- Passed:
  `node --check apps/demo/scripts/collect-ao-benchmark.mjs`
- Passed:
  `node --check apps/demo/scripts/collect-vbao-noise-source-comparison.mjs`
- Passed:
  `node --check apps/demo/scripts/profiling/productionReport.mjs`
- Passed:
  `pnpm test`
- Passed:
  `pnpm typecheck`
- Passed:
  `pnpm typecheck:tsgo`
- Passed:
  `pnpm lint`
- Passed:
  `git diff --check`
- Passed:
  `node --check apps/demo/scripts/collect-ao-benchmark.mjs`
- Passed:
  `node --check apps/demo/scripts/profiling/productionReport.mjs`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts --reporter=verbose`
  — 2 files / 35 tests.
- Captured:
  `$env:AO_BENCHMARK_PORT='41874'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1920'; $env:AO_BENCHMARK_HEIGHT='1080'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='10'; pnpm --dir apps/demo benchmark:ao`
  — 20 rows.
- Captured:
  `$env:AO_BENCHMARK_PORT='41875'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='10'; pnpm --dir apps/demo benchmark:ao`
  — 20 rows.

## Notes

- No production build was run.
- `git diff --check` emitted Windows CRLF normalization warnings for existing
  working-copy files, but exited successfully.
- No production quality promotion is claimed yet.
- Screenshot/timing artifacts under `artifacts/benchmarks/` remain ignored until
  curated rows are intentionally committed or summarized in `EVIDENCE.md`.

## Remaining

- Capture `/lab` fixture/reference rows at the required resolutions.
- Add real `referenceObservations` before any product AO row can pass the
  ray-cast/canonical reference gate.
- Keep the noise-source matrix rejection/promotion reasons synchronized with
  committed evidence.
