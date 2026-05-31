# Apply Progress: VBAO Evidence Baseline

## Status

12/12 tasks complete. Task 4.2 is green when Playwright runs against an
externally managed Vite server on isolated port `41737`. The built-in
Playwright `webServer` lifecycle still times out during teardown on this
Windows/Node 26 environment, so the supported verification path starts Vite
explicitly and runs Playwright with `PLAYWRIGHT_EXTERNAL_SERVER=1` under Node 24.

## Completed Tasks

- [x] 1.1 Evidence row contract coverage added in `apps/demo/src/evidence/evidenceCameras.test.ts`.
- [x] 1.2 `EVIDENCE.md` updated with algorithm, view mode, denoise, timing, and failure label fields.
- [x] 1.3 Stale evidence schema replaced; pinned camera guidance kept via `evidenceCameras.ts`.
- [x] 2.1 Playwright expectation added for Museum evidence controls.
- [x] 2.2 Museum route now has demo-local full-res VBAO evidence mode.
- [x] 2.3 Raw and denoised beauty/AO views remain separate.
- [x] 2.4 No public `VBAONodeOptions` or `VBAO_QUALITY_TIERS` changes.
- [x] 3.1 Route/control smoke coverage added in `apps/demo/e2e/ao-compare.spec.ts`.
- [x] 3.2 Manual WebGPU capture steps documented.
- [x] 3.3 Timing source fields documented.
- [x] 4.1 Targeted Vitest run passed.
- [x] 4.2 Targeted and full Playwright route/control smoke tests passed through
  the external-server verification path.
- [x] 4.3 Manual capture rows remain pending with explicit WebGPU/device blocker.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `apps/demo/src/evidence/evidenceCameras.test.ts` | Unit | N/A (new) | Written first for missing schema/labels | Passed via direct Vitest CLI | 2 cases: schema + labels | Clean |
| 2.1 | `apps/demo/e2e/ao-compare.spec.ts` | E2E | External Vite server on 41737 | Written first for missing full-res control | Full e2e passes with `PLAYWRIGHT_EXTERNAL_SERVER=1` | WebGPU/fallback branches | Museum uses evidence panel contract |
| 3.1 | `apps/demo/e2e/ao-compare.spec.ts` | E2E | External Vite server on 41737 | Museum control smoke added | Full e2e passes with `PLAYWRIGHT_EXTERNAL_SERVER=1` | Route/control case | WebGPU parity gated by `E2E_WEBGPU_PARITY=1` |

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run`
- Passed: `node node_modules/vitest/vitest.mjs run --config apps/demo/vitest.config.ts`
- Passed: `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json`
- Passed: `node node_modules/typescript/bin/tsc --noEmit -p apps/demo/tsconfig.json`
- Passed: `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p packages/horizon-ao/tsconfig.json`
- Passed: `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p apps/demo/tsconfig.json`
- Passed: `node node_modules/eslint/bin/eslint.js .`
- Passed: Playwright e2e through external Vite server:
  `PLAYWRIGHT_EXTERNAL_SERVER=1 node apps/demo/node_modules/@playwright/test/cli.js test --config apps/demo/playwright.config.ts --reporter=list --global-timeout=240000`
  reported 12 passed and 4 skipped WebGPU parity tests. The skips are expected
  unless `E2E_WEBGPU_PARITY=1` is set in a WebGPU-capable browser session.

## Remaining

- [ ] Manual WebGPU screenshots and timings remain pending in `EVIDENCE.md`.
