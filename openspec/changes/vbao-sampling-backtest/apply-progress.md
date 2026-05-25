# Apply Progress: VBAO Sampling Backtest

## Status

12/12 tasks complete.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `packages/horizon-ao/src/__tests__/vbaoSampling.test.ts` | Unit | 68/68 prior targeted tests passing | Missing `vbaoSampling` module | 5/5 sampling tests passing | Schedule list + rotation + step fraction | Kept module off public `index.ts` |
| 1.2 | `packages/horizon-ao/src/__tests__/vbaoSampling.test.ts` | Unit | N/A | Determinism/no-temporal tests failed before module existed | Passing | Same-input repeat + input-key contract | None needed |
| 1.3 | `packages/horizon-ao/src/__tests__/vbaoSampling.test.ts` | Unit | N/A | Histogram test failed before module existed | Passing | 16x16 tile covers every 8-bin bucket | Non-null bin update for TS strictness |
| 2.1 | `packages/horizon-ao/src/vbaoSampling.ts` | Unit | Sampling RED tests | Covered by schedule list and histogram tests | Passing | Mirrors current 5x5 magic-square rotation recovery | None needed |
| 2.2 | `packages/horizon-ao/src/vbaoSampling.ts` | Unit | Sampling RED tests | Covered by schedule list and histogram tests | Passing | R2 uses pixel/slice/sample deterministic irrational offsets | None needed |
| 2.3 | `packages/horizon-ao/src/vbaoSampling.ts` | Unit | Sampling RED tests | Covered by schedule list and histogram tests | Passing | Hilbert 16x16 tile distribution path | None needed |
| 2.4 | `packages/horizon-ao/src/vbaoSampling.ts` | Unit | Sampling RED tests | Covered by schedule list and histogram tests | Passing | Static 8x8 deterministic tile; no frame input | None needed |
| 3.1 | `apps/demo/e2e/ao-compare.spec.ts` | E2E | Existing Museum benchmark smoke | Snapshot lacked `vbaoSamplingSchedule`, diagnostics, and a fresh-window proof | Museum benchmark test passing | Reset/snapshot + monotonic `reportIndex`; WebGL fallback proves controls disabled and `n/a` schedule | `EVIDENCE.md` schema updated |
| 3.2 | `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Unit/source contract | Existing node source tests passing | Source contract failed before shader consumed noise alpha radial scale and benchmark schedule injection | Source contract passing | Shader path now uses schedule-generated rotation plus radial jitter | Kept hook internal, outside `VBAONodeOptions` |
| 3.3 | `artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json` | Browser automation | Schedule hook and collector syntax checks passing | Rows were absent before `AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1` run | 16 raw single VBAO schedule rows captured at both required resolutions | Beauty/AO and all four schedules captured | First default-port attempt timed out; reran on fresh port `41739` |
| 3.4 | `artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json` | Browser automation | Split pixel smoke previously guarded compose path | Split schedule rows were absent before the schedule matrix run | 16 raw compose schedule rows captured and labelled | Compose rows include GTAO,VBAO,N8AO for each schedule | None needed |
| 3.5 | `EVIDENCE.md` | Evidence gate | Screenshot review completed for raw schedule rows | No evidence justified a production schedule switch | Production remains `magic-square` | R2/blue-noise reduce some regularity but still fail `noise,mud,edge-bleed`; Hilbert is rejected for checker/grid pattern | All 56 artifact rows now have explicit labels |

## Verification

- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoReference.test.ts packages/horizon-ao/src/__tests__/vbaoAdaptiveThickness.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` — 73/73 passing.
- `node node_modules/eslint/bin/eslint.js packages/horizon-ao/src/vbaoSampling.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts apps/demo/src/scenes/MuseumScene.tsx apps/demo/e2e/ao-compare.spec.ts` — passing.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json` — passing.
- `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p packages/horizon-ao/tsconfig.json` — passing.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/demo/tsconfig.json` — passing.
- `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p apps/demo/tsconfig.json` — passing.
- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoEvidenceContract.test.ts packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts` — 8/8 passing.
- `node ..\..\node_modules\typescript\bin\tsc --noEmit` from `packages/horizon-ao` — passing after the evidence contract test was refactored to use `?raw` imports instead of Node `fs`.
- External Vite + Playwright from `apps/demo`: `node node_modules/@playwright/test/cli.js test -g "museum" --reporter=list` — 3/3 passing.
- Focused GREEN after strengthening E2E: `node node_modules/@playwright/test/cli.js test -g "machine-readable benchmark" --reporter=list` — 1/1 passing.
- `node scripts/collect-ao-benchmark.mjs` from `apps/demo` — wrote WebGPU rows to `artifacts/benchmarks/ao-benchmark-latest.json`.
- `AO_BENCHMARK_PORT=41739 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json node scripts/collect-ao-benchmark.mjs` from `apps/demo` — passing with `rendererBackend: "webgpu"` and 56 labelled rows.
- Production build was not run.

## Benchmark Attempt

- A local Playwright Chromium benchmark matrix was recorded for 1920x1080 and 1280x720.
- The collector is now `pnpm --dir apps/demo benchmark:ao`; it writes `artifacts/benchmarks/ao-benchmark-latest.json`.
- It defaults to Playwright's `chromium` channel and WebGPU/blocklist flags, with `AO_BENCHMARK_BROWSER_CHANNEL`, `AO_BENCHMARK_HEADED`, `AO_BENCHMARK_BROWSER_ARGS`, and `AO_BENCHMARK_REQUIRE_WEBGPU` overrides.
- The earlier default headless-shell path reported `webgl`; `channel: "chromium"` reported `webgpu`.
- Screenshot capture remains opt-in via `AO_BENCHMARK_SCREENSHOTS=1`; timing rows in `EVIDENCE.md` are marked `pending-review`.
- No production sampling change is made. `magic-square` remains production because no candidate cleared `noise,mud,edge-bleed`.

## Remaining Work

- Continue `vbao-denoise-evidence-gate` with demo-only filter prototyping only after the reference filter is accepted.
