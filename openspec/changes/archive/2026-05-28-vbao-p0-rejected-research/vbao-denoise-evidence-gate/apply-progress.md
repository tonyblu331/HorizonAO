# Apply Progress: VBAO Denoise Evidence Gate

## Status

15/15 tasks complete.

## Completed

| Task | Evidence | Notes |
| --- | --- | --- |
| 0.1 | `apps/demo/e2e/ao-compare.spec.ts`, `apps/demo/src/scenes/MuseumScene.tsx`, `apps/demo/playwright.config.ts` | Added a WebGPU split-composer pixel smoke that samples each selected segment from the canvas screenshot and fails on black/missing panels. RED reproduced a GTAO segment at mean luma ~14.17; GREEN fixed compose rendering by disabling full-canvas auto-clear during segment passes and clearing once before scissored renders. |
| 0.2 | `apps/demo/scripts/collect-ao-benchmark.mjs` | Added `AO_BENCHMARK_DENOISE_MATRIX=1` to collect raw/denoised rows for Beauty and AO-only views; added `denoiseNote` so N8AO internal denoise is not mislabeled as true raw. |
| 0.3 | `research-claim.md`, `proof-ledger.md`, `design.md` | Recorded paper/repo/social/Shadertoy claims as design pressure and hypotheses, not proof. |
| 1.1 | `artifacts/benchmarks/ao-benchmark-latest.json`, `artifacts/benchmarks/screenshots/` | Captured WebGPU raw/denoised Beauty and AO rows at `1920x1080` and `1280x720` with screenshots enabled. Raw adaptive VBAO rows are present for both resolutions and both view modes. |
| 1.2 | `EVIDENCE.md` | Labeled the latest matrix rows explicitly: GTAO currently shows `scale-mismatch`, raw VBAO shows `noise,mud,edge-bleed`, denoised VBAO shows `mud,edge-bleed,thin-gap`, and N8AO shows `halo`. |
| 1.3 | `apps/demo/src/scenes/MuseumScene.tsx`, `apps/demo/scripts/collect-ao-benchmark.mjs`, `artifacts/benchmarks/ao-vbao-sample-matrix-latest.json`, `EVIDENCE.md` | Added an internal benchmark-only VBAO sample preset (`baseline` = 8 samples/3 slices, `high-sample` = 16 samples/3 slices), captured raw sample comparison rows, and recorded that high-sample raw does not remove `noise,mud,edge-bleed`. |
| 1.4 | `artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json`, `EVIDENCE.md` | Captured and labelled magic-square, R2, Hilbert-style, and blue-noise-like schedule rows. R2/blue-noise reduce some regularity but still fail `noise,mud,edge-bleed`; Hilbert is rejected for checker/grid pattern. |
| 2.1 | `packages/horizon-ao/src/vbaoSpatialDenoise.ts` | Added a reference-only non-temporal spatial filter formula for scalar VBAO accessibility. It uses tangent-plane depth distance, normal dot weighting, and private defaults. |
| 2.2 | `packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` | Added RED/GREEN tests proving invalid background samples, normal discontinuities, and depth breaks do not smear AO into the center sample. |
| 2.3 | `packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` | Added a determinism test proving the reference filter has no frame index, history, or temporal jitter input. |
| 2.4 | `apps/demo/src/scenes/MuseumScene.tsx`, `apps/demo/e2e/ao-compare.spec.ts` | Added a demo-only `custom-bilateral` VBAO denoise candidate behind the internal benchmark API. It uses depth and normal rejection plus fixed spatial taps, but does not change `VBAONodeOptions` or package exports. |
| 3.1 | `artifacts/benchmarks/ao-vbao-denoise-gate-latest.json`, `EVIDENCE.md` | Captured a combined WebGPU gate matrix comparing raw baseline, raw high-sample, generic denoise, and custom-bilateral denoise at `1920x1080` and `1280x720`. |
| 3.2 | `EVIDENCE.md` | Rejected generic denoise because the screenshots show `mud,edge-bleed,thin-gap`. |
| 3.3 | `EVIDENCE.md` | Rejected the generic filter's smoother output because it reduces visible patterning by adding mud. |
| 3.4 | `EVIDENCE.md` | Rejected production promotion: custom-bilateral timings are acceptable, but screenshots still show `noise,mud,edge-bleed`, so no Pareto win is proven. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.1 | `apps/demo/e2e/ao-compare.spec.ts` | E2E/canvas pixel smoke | Existing Museum evidence-control and benchmark-publish smokes passed via explicit external Vite server. Playwright webServer mode timed out in this environment before the external-server workaround. | New split pixel test failed on `gtao` segment with `meanLuma` ~14.17 <= 25, proving the selected segment could render black/missing. | Fixed compose rendering so segment passes use one initial clear and `renderer.autoClear = false`; targeted split pixel test passed. | Added a second AO-only raw two-segment case (`gtao,vbao`) in addition to the three-way beauty/denoised case; targeted test passed. | Extracted screenshot segment measurement helpers and added an explicit undefined guard; lint, TypeScript, tsgo, and Museum E2E passed. |
| 1.1 | `artifacts/benchmarks/ao-benchmark-latest.json` | Evidence capture | Split pixel smoke passed before trusting split screenshots. | N/A evidence-only task; no production code path was changed. | `AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 node scripts/collect-ao-benchmark.mjs` passed with `rendererBackend: "webgpu"` and 32 rows. | Captured both `1920x1080` and `1280x720`, plus Beauty/AO and raw/denoised rows. | No code refactor. |
| 1.2 | `EVIDENCE.md` | Evidence labeling | Latest screenshots reviewed before editing labels. | N/A documentation/evidence task; labels are grounded in screenshot review rather than a failing unit test. | `EVIDENCE.md` now records explicit labels per row. | Labels cover single and split rows across both resolutions. | No code refactor. |
| 1.3 | `apps/demo/e2e/ao-compare.spec.ts` | E2E/benchmark API plus automated benchmark | Existing high-sample preset test failed first because the API did not exist. | New test failed with `presetChanged=false`, proving `window.__aoBenchmark.setVbaoSamplePreset` was missing. | Added internal `baseline`/`high-sample` preset plumbing and stats fields; targeted high-sample test passed. | Extended the collector with `AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1` and captured single/compose raw baseline vs high-sample rows at both resolutions. | Tightened the test wait so the snapshot must include `fullResolutionVbao=true`; lint/typecheck/tsgo passed. |
| 1.4 | `packages/horizon-ao/src/__tests__/vbaoEvidenceContract.test.ts` | Unit/docs contract + evidence capture | Existing evidence docs had the fields needed for benchmark rows, but the active diagram still used old lane language. | The diagram-lane test failed because the whiteboard did not contain `Current shipped path`, `Evidence candidate path`, or `Future pipeline path`. | Updated the diagram and captured the schedule matrix; evidence contract test passed. | Matrix covers four schedules, two resolutions, Beauty/AO, single and compose rows. | Refactored the test from Node `fs` to `?raw` imports so package typecheck remains clean. |
| 2.1 | `packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` | Unit/reference math | N/A new reference helper. | Test failed because `vbaoSpatialDenoise` did not exist. | Added pure reference formula; targeted denoise tests passed. | Same-plane aligned neighbor averages to 0.6 while discontinuities stay at the center value. | Kept module internal and out of `index.ts`. |
| 2.2 | `packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` | Unit/reference math | N/A new behavior. | Background, normal-edge, and depth-break tests failed before module existed. | Weighting returns zero for invalid/background and normal edges, near-zero for large tangent-plane depth breaks. | Includes non-empty aligned-neighbor case so the filter path actually runs. | None needed. |
| 2.3 | `packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` | Unit/reference math | N/A new behavior. | Determinism test failed before module existed. | Same input produces identical output with no frame/history parameter. | Companion cases cover weighted and rejected neighbors. | None needed. |
| 2.4 | `apps/demo/e2e/ao-compare.spec.ts` | E2E/benchmark API | Existing public API contract still forbids denoise knobs in `VBAONodeOptions`. | New test failed with `filterChanged=false`, proving `window.__aoBenchmark.setVbaoDenoiseFilter` was missing. | Added the internal `generic`/`custom-bilateral` hook, a custom TSL bilateral candidate, and snapshot field `vbaoDenoiseFilter`; targeted Playwright test passed. | Extended `collect-ao-benchmark.mjs` with `AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1`; combined gate capture passed. | Kept the filter local to the Museum harness and used `PLAYWRIGHT_TEST_PORT`/`PLAYWRIGHT_BASE_URL` to avoid stale-port false failures. |
| 3.1 | `artifacts/benchmarks/ao-vbao-denoise-gate-latest.json` | Evidence capture | Schedule and sample matrices were already captured before denoise promotion. | N/A evidence-only gate. | Combined gate capture passed with WebGPU, screenshots, and 48 labelled rows. | Matrix includes both resolutions, Beauty/AO, raw baseline, raw high-sample, generic denoise, and custom-bilateral denoise. | No production code promotion. |
| 3.2 | `EVIDENCE.md` | Evidence decision | Screenshot labels were reviewed before marking tasks complete. | N/A evidence-only gate. | Generic denoise rejected for `mud,edge-bleed,thin-gap`. | Compose rows keep the same rejection pressure with N8AO halo labels separated. | No production code promotion. |
| 3.3 | `EVIDENCE.md` | Evidence decision | AO-only screenshots were checked against beauty screenshots. | N/A evidence-only gate. | Generic denoise rejected because the apparent noise reduction comes with mud. | Custom-bilateral preserves edges better but does not remove structured noise, so it is not a substitute. | No production code promotion. |
| 3.4 | `EVIDENCE.md` | Evidence decision | Median/p95 and screenshots are both required by the gate. | N/A evidence-only gate. | No filter promoted. | Custom-bilateral timings are acceptable but screenshots fail; generic screenshots fail despite tolerable timings. | Next pressure is depth hierarchy or bitmask confidence metadata. |

## Verification

- `node --check apps/demo/scripts/collect-ao-benchmark.mjs` — passing.
- `node node_modules/eslint/bin/eslint.js apps/demo/scripts/collect-ao-benchmark.mjs` — passing.
- `AO_BENCHMARK_DENOISE_MATRIX=1 node scripts/collect-ao-benchmark.mjs` from `apps/demo` — passing with `rendererBackend: "webgpu"` and 32 rows across `1920x1080` and `1280x720`.
- `node node_modules/eslint/bin/eslint.js apps/demo/e2e/ao-compare.spec.ts apps/demo/src/scenes/MuseumScene.tsx apps/demo/playwright.config.ts apps/demo/scripts/collect-ao-benchmark.mjs` — passing.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/demo/tsconfig.json` — passing.
- `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p apps/demo/tsconfig.json` — passing.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 node node_modules/@playwright/test/cli.js test apps/demo/e2e/ao-compare.spec.ts --reporter=list` with an explicit Vite server on `127.0.0.1:41737` — passing, `4/4`.
- `AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 node scripts/collect-ao-benchmark.mjs` from `apps/demo` — passing with `rendererBackend: "webgpu"` and 32 screenshot rows.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 node node_modules/@playwright/test/cli.js test ao-compare.spec.ts -g "high-sample VBAO benchmark preset" --reporter=list` from `apps/demo` with explicit Vite — passing, `1/1`.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 node node_modules/@playwright/test/cli.js test ao-compare.spec.ts -g "museum" --reporter=list` from `apps/demo` with explicit Vite — passing, `4/4`.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 node node_modules/@playwright/test/cli.js test ao-compare.spec.ts --reporter=list` from `apps/demo` with explicit Vite — failing outside the Museum surface: `grid`, `lab`, `sponza`, `suzanne`, and `bunny` each report a console 404 resource error. Museum tests pass in that same run.
- `AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-sample-matrix-latest.json node scripts/collect-ao-benchmark.mjs` from `apps/demo` — passing with `rendererBackend: "webgpu"` and 40 rows.
- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoEvidenceContract.test.ts packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` from repo root — passing, 8/8.
- `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/horizon-ao` — passing.
- `AO_BENCHMARK_PORT=41739 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json node scripts/collect-ao-benchmark.mjs` from `apps/demo` — passing with `rendererBackend: "webgpu"` and 56 labelled rows.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:41751 node node_modules/@playwright/test/cli.js test ao-compare.spec.ts -g "VBAO denoise filter candidates" --reporter=list` from `apps/demo` with explicit Vite — passing, `1/1`.
- `AO_BENCHMARK_PORT=41755 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1 AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-denoise-gate-latest.json node scripts/collect-ao-benchmark.mjs` from `apps/demo` — passing with `rendererBackend: "webgpu"` and 48 labelled rows.
- Production build was not run.

## Latest Matrix Run

- Output: `artifacts/benchmarks/ao-benchmark-latest.json`.
- Screenshots: not captured in this run.
- Purpose: harness proof only; quality labels remain pending until screenshot review.
- Notable timing caveat: first-row p95 spikes still appear in headless capture, so median and screenshot evidence matter more than single avg/fps.

## Remaining Work

- Archive the change after final verification.
- Start a follow-up design for depth hierarchy or bitmask confidence metadata; neither denoise candidate earned production promotion.

## Issues Found

- The first direct Playwright invocation using its configured `webServer` timed out in this desktop environment. Running Vite explicitly and setting `PLAYWRIGHT_EXTERNAL_SERVER=1` produced stable WebGPU E2E runs. The product bug and fix are still valid; the runner lifecycle hang remains a harness issue to revisit separately.
- Root cause for black split segments: each `RenderPipeline.render()` call may clear the full canvas through the renderer. Compose mode must clear once, then render scissored segments with `autoClear` disabled, and restore renderer state afterward.
- The latest VBAO screenshots show speed without quality victory: raw adaptive VBAO still has structured `noise`, `mud`, and `edge-bleed`; the current generic denoise reduces patterning but introduces `mud`, `edge-bleed`, and possible `thin-gap` closure. This supports the gate: fix sampling and compare raw higher sample counts before adding a production denoise pass.
- Raw high-sample VBAO (`16` samples/`3` slices) did not eliminate the structured magic-square pattern and made AO-only contact regions broader/darker. The benchmark windows also showed noisy timing behavior, so no perf win is claimed from the high-sample rows.
- Generic denoise reduces visible structured noise by adding `mud`, `edge-bleed`, and `thin-gap` closure. Custom-bilateral denoise is more conservative and timing-friendly, but still leaves `noise,mud,edge-bleed`; therefore no denoise path is promoted.
