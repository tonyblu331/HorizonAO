# Apply Progress: VBAO Release Gap Closure

## 2026-06-04

- Created planning SDD artifacts for the release gap closure.
- No runtime implementation has started.
- No production build was run.

## 2026-06-04 — Research Tightening

- Added `research-ledger.md`.
- Verified source pressure against SSILVB/VBAO, Activision GTAO, AMD CACAO,
  Three GTAONode/TSL, N8AO, and local ray-cast fixtures.
- Updated proposal, design, SDD plan, and tasks so the gate order is
  research-ledger first, then reference truth, product quality, release
  cleanliness, and final evidence verdict.
- No runtime implementation has started.
- No production build was run.

## 2026-06-04 — SOAP Peer Review Cleanup

- Clarified that ray-cast fixtures and the production reference gate already
  exist; the missing work is wiring hard-case product observations into the
  release verdict.
- Aligned `tasks.md` with the more specific `sdd-plan.md`, including final
  verdict and generated-shader inspection tasks.
- No runtime implementation has started.
- No production build was run.

## 2026-06-04 — Phase 0/1 Start

- Recorded dirty-worktree boundary before source edits. Existing unrelated
  changes are present in demo temporal/benchmark files, temporal artifacts,
  `VBAOVelocityTemporalNode.ts`, and related OpenSpec temporal plans.
- Confirmed package public exports remain compact:
  `VBAONode`, `vbao`, `VBAONodeOptions`, and `VBAOQualityPreset`.
- Confirmed Museum default product path uses `quality: VBAO_PRODUCT_QUALITY`;
  explicit sample/slice shapes are separate debug/sample modes.
- Added `AO_PRODUCTION_REFERENCE_REQUIRED_FIXTURE_IDS` to the production
  reference gate.
- Product rows now report `missing-required-observation` until every required
  release fixture is observed.
- Added tests proving absent required observations stay visible and complete
  required observations are needed for `compared`.
- Verification:
  `pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
  passed: 12 test files, 116 tests.
- Core typecheck passed:
  `pnpm --filter @horizonao/core typecheck`.
- Scoped `git diff --check` passed with CRLF warnings for touched reference
  files only.
- No production build was run.

## 2026-06-04 — Phase 2 Product Promotion Verdicts

- Added `AO_REQUIRED_REFERENCE_FIXTURE_IDS` to the demo production report layer
  so benchmark Markdown mirrors the stricter reference gate status.
- Added `createProductPromotionVerdictRows`.
- Product promotion verdicts are now:
  - `pass` only for default product evidence with complete artifacts, complete
    required reference fixture coverage, and no blocking failure labels;
  - `incomplete` for missing artifacts or missing reference coverage;
  - `fail` for blocking failure labels;
  - `candidate-only` for private lanes such as temporal, compute, debug
    override, cleanup-skip, or fused resolve-polish.
- Added `apps/demo/scripts/profiling/productionReport.test.mjs`.
- Verification:
  `pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs`
  passed: 1 test file, 6 tests.
- `node --check apps/demo/scripts/profiling/productionReport.mjs` passed.
- Demo typecheck passed:
  `pnpm --filter @horizonao/demo typecheck`.
- Product promotion verdict rows now carry scene, resolution, view, algorithm,
  output, verdict, and blockers.
- Updated the existing profiling source-contract test to expect
  `missing-required-observation` for partial reference coverage.
- Final focused verification:
  - `pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
    passed: 12 test files, 116 tests.
  - `pnpm --filter @horizonao/core typecheck` passed.
  - `pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs`
    passed: 1 test file, 6 tests.
  - `pnpm --filter @horizonao/demo typecheck` passed.
  - `node --check apps/demo/scripts/profiling/productionReport.mjs` passed.
  - Scoped `git diff --check` passed with CRLF warnings for touched files only.
- Judgment Day final re-review: both blind judges approved with no CRITICAL or
  WARNING findings after the threshold, noise-source, beauty, raw-debug, private
  sample-mode, and JSON-derived-row fixes.
- No production build was run.

## 2026-06-04 — Scrub / Judgment Day Fixes

- Fixed default product promotion so `computeCandidateLabel: 'n/a'` is treated
  as a sentinel, not as a private compute candidate.
- Fixed private lane detection for benchmark-shaped cleanup-skip and fused
  resolve-polish rows.
- Fixed private lane detection for non-default VBAO sample modes such as
  `same-cost-3x10`, `same-cost-2x16`, and `spatial-ultra`.
- Included VBAO `raw-debug` rows in the promotion matrix instead of filtering
  them out through the denoised product predicate.
- Added fail-closed threshold-gate rows: promotion verdicts can no longer
  report `pass` unless an explicit threshold gate row reports `pass`.
- Threshold gate rows with `status: fail` now produce a `fail` verdict even
  when the threshold producer supplies no blocker labels.
- Non-default VBAO noise-source rows remain `candidate-only`.
- `beauty` rows are now included in the promotion matrix alongside `ao` rows.
- Moved derived report rows into JSON output so JSON and Markdown carry the
  same product promotion verdict data.
- Added tests for the sentinel, private lane, raw-debug, threshold-gate, and
  JSON-derived-row cases.
- Verification:
  - `pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs`
    passed: 1 test file, 15 tests.
  - `pnpm --filter @horizonao/demo typecheck` passed.
  - `pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
    passed: 12 test files, 116 tests.
  - `pnpm --filter @horizonao/core typecheck` passed.
  - `node --check apps/demo/scripts/profiling/productionReport.mjs` passed.
  - Scoped `git diff --check` passed with CRLF warnings for touched files only.
- No production build was run.

## 2026-06-04 — Phase 3 Render Evidence Capture

- Ran the WebGPU benchmark capture for `/lab` and `/museum` at `1920x1080` and
  `1280x720`.
- Command:
  `$env:AO_BENCHMARK_SCENES='lab,museum'; $env:AO_BENCHMARK_MODES='gtao,vbao,n8ao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5208'; $env:PLAYWRIGHT_TEST_PORT='5208'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/ao-release-gap-closure-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/ao-release-gap-closure-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-ao-release-gap-closure'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs`
- Result:
  - JSON: `artifacts/benchmarks/ao-release-gap-closure-latest.json`
  - Markdown: `artifacts/benchmarks/ao-release-gap-closure-summary.md`
  - Screenshots: `artifacts/benchmarks/screenshots-ao-release-gap-closure/`
  - 38 report rows and 36 screenshot files.
- Coverage:
  - scenes: `lab`, `museum`;
  - resolutions: `1920x1080`, `1280x720`;
  - views: `beauty`, `ao`;
  - modes: `gtao`, `vbao`, `n8ao`;
  - VBAO outputs: `raw-debug`, `product`.
- `/lab` produced VBAO rows only through the current benchmark API; `/museum`
  produced GTAO, VBAO, and N8AO rows.
- Updated `EVIDENCE.md` with the capture command, artifacts, primary VBAO
  product rows, and gate outcome.
- Explicitly blocked promotion:
  - product promotion rows are 26 `fail`, 8 `incomplete`, 0 `pass`;
  - reference gate rows remain `missing-reference-observation`;
  - rendered proxy/reference comparison rows are 26 `blocked`, 0 `compared`;
  - threshold gate rows remain `incomplete`;
  - screenshots/proxies are not accepted as reference truth.
- The current contact/thickness policy is not accepted for release promotion
  from this capture.
- The screenshot/timing artifacts are local capture outputs; final release
  verdict remains not clean-checkout reproducible until curated artifacts are
  explicitly added.
- Verification:
  - `pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
    passed: 12 test files, 116 tests.
  - `pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs`
    passed: 1 test file, 15 tests.
  - `node --check apps/demo/scripts/collect-ao-benchmark.mjs` passed.
  - `node --check apps/demo/scripts/profiling/productionReport.mjs` passed.
  - Phase 3 JSON coverage check passed for scenes, resolutions, views, modes,
    VBAO raw/product outputs, and 36 screenshot files.
  - `pnpm --filter @horizonao/core typecheck` passed.
  - `pnpm --filter @horizonao/demo typecheck` passed.
  - Scoped `git diff --check` passed with CRLF warnings for touched files only.
- No production build was run.

## 2026-06-04 — Phase 4 Release Cleanliness Audit

- Audited `packages/horizon-ao/src/index.ts`; public exports remain limited to
  `VBAONode`, `vbao`, `VBAONodeOptions`, and `VBAOQualityPreset`.
- Audited `packages/horizon-ao/package.json`; the package export map still
  exposes only the root package entry.
- Verified source-contract tests covering:
  - `getTextureNode()` as product output;
  - `getRawTextureNode()` as raw/debug output;
  - temporal accumulation staying private/demo-only;
  - compute candidates staying private/schema-visible;
  - sample override lanes staying explicit candidates;
  - no public denoise node/API reintroduced.
- README/package docs were not updated with quality claims because the Phase 3
  evidence verdict blocks release promotion.
- Rejected/blocked candidates remain recorded in `EVIDENCE.md`: current rows are
  `fail` or `incomplete`, not promoted.
- Verification:
  - `pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
    passed: 12 test files, 116 tests.
  - Public export audit script passed.
- Ran generated shader inspection:
  `$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5209'; $env:PLAYWRIGHT_TEST_PORT='5209'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs`
- Generated shader inspection passed for product-preset and `spatial-ultra`:
  fixed slice/sample loop bounds, no dynamic slice/sample uniform loops, no
  duplicate VBAO declaration warnings, and no non-ignored console diagnostics.
- Updated `EVIDENCE.md` and `release-readiness-report.md` with the shader
  inspection gate result.
- No production build was run.

## 2026-06-04 — Phase 5 Release Readiness Verdict

- Added `release-readiness-report.md`.
- Final current verdict: `incomplete`.
- The report links the Phase 3 artifacts and explicitly marks them not
  clean-checkout reproducible until curated JSON, Markdown, and screenshots are
  added to version control.
- Gate summary:
  - reference truth: `incomplete`;
  - screenshot/timing evidence: `captured`;
  - rendered proxy vs reference observations: `blocked`;
  - product promotion: `blocked`;
  - threshold policy: `incomplete`;
  - private candidates: `pass`;
  - generated shader inspection: `pass`;
  - public package surface: `pass`;
  - clean-checkout reproducibility: `incomplete`.
- README/package quality claims were left unchanged.
- No production build was run.

## 2026-06-04 — Phase 6 Verification

- Targeted reference/source Vitest passed:
  - `pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
  - `pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
  - both invocations ran the package source/reference suite and passed 12 test
    files / 116 tests.
- Targeted demo report Vitest passed:
  `pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs`
  passed 1 test file / 17 tests.
- Typecheck passed:
  - `pnpm --filter @horizonao/core typecheck`
  - `pnpm --filter @horizonao/demo typecheck`
- Script syntax checks passed:
  - `node --check apps/demo/scripts/collect-ao-benchmark.mjs`
  - `node --check apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs`
  - `node --check apps/demo/scripts/profiling/productionReport.mjs`
- Final evidence audit passed:
  `artifacts/benchmarks/ao-release-gap-closure-latest.json` contains 26
  rendered-proxy/reference comparison rows, all blocked by
  `missing-reference-observation`, all still missing
  `thin-gap-separated-slabs`, and the screenshot directory contains 36 PNGs.
- Scoped `git diff --check` passed with CRLF warnings for touched files only.
- Remaining release blocker:
  - rendered proxies were compared against reference observation coverage, but
    all rows remain blocked by missing required fixture observations;
- No production build was run.
